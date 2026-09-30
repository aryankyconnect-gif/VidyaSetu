// backend/src/services/similarity.service.ts
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export interface ExtractedTextResult {
  text: string;
  normalizedText: string;
  status: 'SUCCESS' | 'EMPTY' | 'SCANNED_IMAGE' | 'FAILED';
  warning?: string;
}

export interface MatchedPassage {
  textA: string;
  textB: string;
  length: number;
}

export interface PairwiseSimilarityResult {
  similarityScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedPassages: MatchedPassage[];
  warningA?: string;
  warningB?: string;
}

export class SimilarityService {
  /**
   * 1. Extract text from submission content and/or attached PDF file
   */
  public static async extractSubmissionText(
    content?: string | null,
    fileUrl?: string | null
  ): Promise<ExtractedTextResult> {
    let rawText = '';
    let status: 'SUCCESS' | 'EMPTY' | 'SCANNED_IMAGE' | 'FAILED' = 'SUCCESS';
    let warning: string | undefined;

    // Check if content text is provided
    if (content && typeof content === 'string' && content.trim().length > 0) {
      rawText += content.trim() + '\n';
    }

    // Check if fileUrl is provided (supports base64 data URIs, local file paths)
    if (fileUrl && typeof fileUrl === 'string' && fileUrl.trim().length > 0) {
      const trimmedUrl = fileUrl.trim();

      try {
        if (trimmedUrl.startsWith('data:application/pdf;base64,')) {
          // Base64-encoded PDF
          const base64Data = trimmedUrl.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const pdfData = await pdf(buffer);
          const pdfText = (pdfData.text || '').trim();

          if (pdfText.length < 15) {
            status = 'SCANNED_IMAGE';
            warning = 'Text could not be extracted; similarity analysis may be incomplete.';
          } else {
            rawText += '\n' + pdfText;
          }
        } else if (trimmedUrl.toLowerCase().endsWith('.pdf') || trimmedUrl.includes('.pdf?')) {
          // Check local filesystem first
          const possibleLocalPath = path.isAbsolute(trimmedUrl)
            ? trimmedUrl
            : path.resolve(process.cwd(), trimmedUrl);

          if (fs.existsSync(possibleLocalPath)) {
            const buffer = fs.readFileSync(possibleLocalPath);
            const pdfData = await pdf(buffer);
            const pdfText = (pdfData.text || '').trim();

            if (pdfText.length < 15) {
              status = 'SCANNED_IMAGE';
              warning = 'Text could not be extracted; similarity analysis may be incomplete.';
            } else {
              rawText += '\n' + pdfText;
            }
          } else {
            // Not a local file; fileUrl may be an external link/repo link
            if (rawText.length === 0) {
              status = 'EMPTY';
              warning = 'Remote link provided without direct text content.';
            }
          }
        }
      } catch (err: any) {
        logger.error(`PDF extraction error for fileUrl: ${err.message}`);
        status = 'FAILED';
        warning = 'PDF extraction failed. Similarity analysis may be incomplete.';
      }
    }

    const trimmedRaw = rawText.trim();
    if (trimmedRaw.length === 0) {
      if (status !== 'SCANNED_IMAGE' && status !== 'FAILED') {
        status = 'EMPTY';
        warning = 'No extractable text found in this submission.';
      }
      return {
        text: '',
        normalizedText: '',
        status,
        warning,
      };
    }

    const normalized = this.normalizeText(trimmedRaw);

    return {
      text: trimmedRaw,
      normalizedText: normalized,
      status: status === 'SCANNED_IMAGE' ? 'SCANNED_IMAGE' : 'SUCCESS',
      warning,
    };
  }

  /**
   * 2. Normalize text:
   * - lowercase
   * - remove page numbers, headers, and footers
   * - normalize quotes and punctuation
   * - remove unnecessary whitespace
   */
  public static normalizeText(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      // Remove page number headers/footers e.g. "Page 1 of 5", "page 12"
      .replace(/page\s+\d+(\s+of\s+\d+)?/gi, '')
      .replace(/\b\d+\s*\/\s*\d+\b/g, '') // "1 / 5"
      // Remove form feed characters
      .replace(/\f/g, ' ')
      // Normalize single/double curly quotes to standard
      .replace(/[“”]/g, '"')
      .replace(/[‘’`]/g, "'")
      // Replace punctuation with spaces
      .replace(/[^a-z0-9\s]/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 3. Compute TF-IDF Cosine Similarity between two normalized documents
   */
  public static calculateTFIDFCosineSimilarity(textA: string, textB: string): number {
    const tokensA = textA.split(/\s+/).filter((w) => w.length > 1);
    const tokensB = textB.split(/\s+/).filter((w) => w.length > 1);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    // Vocabulary of both docs
    const vocab = new Set<string>([...tokensA, ...tokensB]);
    const totalDocs = 2;

    // Frequency maps
    const tfA = new Map<string, number>();
    tokensA.forEach((t) => tfA.set(t, (tfA.get(t) || 0) + 1));

    const tfB = new Map<string, number>();
    tokensB.forEach((t) => tfB.set(t, (tfB.get(t) || 0) + 1));

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    vocab.forEach((term) => {
      // Document frequency: how many of the 2 docs contain this term
      const df = (tfA.has(term) ? 1 : 0) + (tfB.has(term) ? 1 : 0);
      const idf = Math.log(1 + totalDocs / df);

      const weightA = ((tfA.get(term) || 0) / tokensA.length) * idf;
      const weightB = ((tfB.get(term) || 0) / tokensB.length) * idf;

      dotProduct += weightA * weightB;
      normA += weightA * weightA;
      normB += weightB * weightB;
    });

    if (normA === 0 || normB === 0) return 0;

    const cosine = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.min(Math.max(cosine, 0), 1);
  }

  /**
   * 4. Compute n-gram (shingling) Jaccard Similarity
   * Detects verbatim or near-verbatim matching sequences (e.g. 3-word or 4-word shingles)
   */
  public static calculateShingleSimilarity(textA: string, textB: string, n = 3): number {
    const wordsA = textA.split(/\s+/).filter((w) => w.length > 0);
    const wordsB = textB.split(/\s+/).filter((w) => w.length > 0);

    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const getShingles = (words: string[], shingleSize: number): Set<string> => {
      const shingles = new Set<string>();
      if (words.length < shingleSize) {
        shingles.add(words.join(' '));
        return shingles;
      }
      for (let i = 0; i <= words.length - shingleSize; i++) {
        shingles.add(words.slice(i, i + shingleSize).join(' '));
      }
      return shingles;
    };

    const actualN = Math.min(n, Math.min(wordsA.length, wordsB.length));
    const shinglesA = getShingles(wordsA, actualN);
    const shinglesB = getShingles(wordsB, actualN);

    let intersectionCount = 0;
    shinglesA.forEach((shingle) => {
      if (shinglesB.has(shingle)) intersectionCount++;
    });

    const unionCount = new Set([...shinglesA, ...shinglesB]).size;
    if (unionCount === 0) return 0;

    return intersectionCount / unionCount;
  }

  /**
   * 5. Extract matching passages between two texts
   */
  public static findMatchingPassages(
    rawTextA: string,
    rawTextB: string,
    minWords = 4
  ): MatchedPassage[] {
    const passages: MatchedPassage[] = [];
    if (!rawTextA || !rawTextB) return passages;

    const wordsA = rawTextA.split(/\s+/);
    const wordsB = rawTextB.split(/\s+/);

    if (wordsA.length < minWords || wordsB.length < minWords) return passages;

    // Normalizing lookup tokens
    const normTokensA = wordsA.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const normTokensB = wordsB.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const seenMatches = new Set<string>();

    for (let i = 0; i <= normTokensA.length - minWords; i++) {
      if (normTokensA[i].length === 0) continue;

      for (let j = 0; j <= normTokensB.length - minWords; j++) {
        if (normTokensB[j].length === 0) continue;

        // Check if there is a match starting at A[i] and B[j]
        let matchLen = 0;
        while (
          i + matchLen < normTokensA.length &&
          j + matchLen < normTokensB.length &&
          normTokensA[i + matchLen] === normTokensB[j + matchLen] &&
          normTokensA[i + matchLen].length > 0
        ) {
          matchLen++;
        }

        if (matchLen >= minWords) {
          const passageA = wordsA.slice(i, i + matchLen).join(' ');
          const passageB = wordsB.slice(j, j + matchLen).join(' ');
          const passageKey = passageA.toLowerCase().trim();

          if (!seenMatches.has(passageKey)) {
            seenMatches.add(passageKey);
            passages.push({
              textA: passageA,
              textB: passageB,
              length: matchLen,
            });
            // Advance i to skip already matched segment
            i += matchLen - 1;
            break;
          }
        }
      }
    }

    // Sort matching passages by length descending
    passages.sort((a, b) => b.length - a.length);
    return passages.slice(0, 10);
  }

  /**
   * 6. Compare two submissions and compute composite similarity score and risk level
   */
  public static compareSubmissions(
    normA: string,
    normB: string,
    rawA: string,
    rawB: string
  ): PairwiseSimilarityResult {
    if (!normA || !normB || normA.trim().length === 0 || normB.trim().length === 0) {
      return {
        similarityScore: 0,
        riskLevel: 'LOW',
        matchedPassages: [],
      };
    }

    // Exact string equality check
    if (normA.trim() === normB.trim()) {
      return {
        similarityScore: 100,
        riskLevel: 'HIGH',
        matchedPassages: [
          {
            textA: rawA.slice(0, 300) + (rawA.length > 300 ? '...' : ''),
            textB: rawB.slice(0, 300) + (rawB.length > 300 ? '...' : ''),
            length: normA.split(/\s+/).length,
          },
        ],
      };
    }

    const cosine = this.calculateTFIDFCosineSimilarity(normA, normB);
    const shingle = this.calculateShingleSimilarity(normA, normB, 3);

    // Hybrid calculation: 45% Cosine + 55% Shingling for strict passage match weighting
    const rawScore = 0.45 * cosine + 0.55 * shingle;
    const similarityScore = Math.round(rawScore * 1000) / 10; // Round to 1 decimal place

    // Configurable thresholds: High >= 80%, Medium 50-79%, Low < 50%
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (similarityScore >= 80) {
      riskLevel = 'HIGH';
    } else if (similarityScore >= 50) {
      riskLevel = 'MEDIUM';
    }

    const matchedPassages = this.findMatchingPassages(rawA, rawB, 4);

    return {
      similarityScore,
      riskLevel,
      matchedPassages,
    };
  }

  /**
   * 7. Run or update similarity detection for all submissions within an assignment
   */
  public static async runAssignmentSimilarity(assignmentId: string): Promise<any[]> {
    // Fetch all submissions for this assignment ONLY
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        grade: true,
      },
      orderBy: { submittedAt: 'asc' },
    });

    if (submissions.length === 0) return [];

    // Step A: Ensure extracted and normalized text is cached for every submission
    const processedSubmissions: Array<typeof submissions[0] & { extracted: string; normalized: string }> = [];

    for (const sub of submissions) {
      let extracted = sub.extractedText || '';
      let extractionStatus = sub.extractionStatus || 'SUCCESS';

      if (!sub.extractedText) {
        const extraction = await this.extractSubmissionText(sub.content, sub.fileUrl);
        extracted = extraction.text;
        extractionStatus = extraction.status;

        // Persist extraction cache
        await prisma.assignmentSubmission.update({
          where: { id: sub.id },
          data: {
            extractedText: extracted,
            extractionStatus,
          },
        });
      }

      processedSubmissions.push({
        ...sub,
        extracted,
        normalized: this.normalizeText(extracted),
      });
    }

    // Step B: Pairwise comparison for all unique pairs (subA, subB)
    const pairwiseRecords: any[] = [];
    const highestScoreMap = new Map<string, { score: number; partnerName: string }>();

    for (let i = 0; i < processedSubmissions.length; i++) {
      for (let j = i + 1; j < processedSubmissions.length; j++) {
        const subA = processedSubmissions[i];
        const subB = processedSubmissions[j];

        // Ordering pair IDs canonically (lexicographical)
        const [firstSub, secondSub] = subA.id < subB.id ? [subA, subB] : [subB, subA];

        // Check if an existing cached comparison exists and is up to date
        const existing = await prisma.submissionSimilarity.findUnique({
          where: {
            submissionAId_submissionBId: {
              submissionAId: firstSub.id,
              submissionBId: secondSub.id,
            },
          },
        });

        let similarityData: PairwiseSimilarityResult;

        if (
          existing &&
          existing.calculatedAt >= firstSub.updatedAt &&
          existing.calculatedAt >= secondSub.updatedAt
        ) {
          // Reuse cached result
          let parsedPassages = [];
          try {
            parsedPassages = existing.matchedPassagesJson ? JSON.parse(existing.matchedPassagesJson) : [];
          } catch {
            parsedPassages = [];
          }
          similarityData = {
            similarityScore: existing.similarityScore,
            riskLevel: existing.riskLevel as any,
            matchedPassages: parsedPassages,
          };
        } else {
          // Calculate fresh similarity
          similarityData = this.compareSubmissions(
            firstSub.normalized,
            secondSub.normalized,
            firstSub.extracted,
            secondSub.extracted
          );

          // Store in database
          await prisma.submissionSimilarity.upsert({
            where: {
              submissionAId_submissionBId: {
                submissionAId: firstSub.id,
                submissionBId: secondSub.id,
              },
            },
            update: {
              similarityScore: similarityData.similarityScore,
              riskLevel: similarityData.riskLevel,
              matchedPassagesJson: JSON.stringify(similarityData.matchedPassages),
              calculatedAt: new Date(),
            },
            create: {
              assignmentId,
              submissionAId: firstSub.id,
              submissionBId: secondSub.id,
              similarityScore: similarityData.similarityScore,
              riskLevel: similarityData.riskLevel,
              matchedPassagesJson: JSON.stringify(similarityData.matchedPassages),
            },
          });
        }

        // Track highest scores per submission for student-facing report
        const score = similarityData.similarityScore;
        const nameA = firstSub.student?.user?.name || 'Peer';
        const nameB = secondSub.student?.user?.name || 'Peer';

        const currA = highestScoreMap.get(firstSub.id) || { score: 0, partnerName: '' };
        if (score > currA.score) highestScoreMap.set(firstSub.id, { score, partnerName: nameB });

        const currB = highestScoreMap.get(secondSub.id) || { score: 0, partnerName: '' };
        if (score > currB.score) highestScoreMap.set(secondSub.id, { score, partnerName: nameA });

        pairwiseRecords.push({
          id: existing?.id || `${firstSub.id}_${secondSub.id}`,
          assignmentId,
          similarityScore: similarityData.similarityScore,
          riskLevel: similarityData.riskLevel,
          matchedPassages: similarityData.matchedPassages,
          submissionA: {
            id: firstSub.id,
            student: firstSub.student,
            fileUrl: firstSub.fileUrl,
            content: firstSub.content,
            extractedText: firstSub.extracted,
            extractionStatus: firstSub.extractionStatus,
            grade: firstSub.grade,
            submittedAt: firstSub.submittedAt,
          },
          submissionB: {
            id: secondSub.id,
            student: secondSub.student,
            fileUrl: secondSub.fileUrl,
            content: secondSub.content,
            extractedText: secondSub.extracted,
            extractionStatus: secondSub.extractionStatus,
            grade: secondSub.grade,
            submittedAt: secondSub.submittedAt,
          },
        });
      }
    }

    // Step C: Update individual submission summary scores on AssignmentSubmission
    for (const sub of processedSubmissions) {
      const top = highestScoreMap.get(sub.id);
      if (top && top.score > 0) {
        let rep = `Low similarity (${top.score}%) - Authentic work`;
        if (top.score >= 80) {
          rep = `High similarity (${top.score}%) detected with submission by ${top.partnerName}`;
        } else if (top.score >= 50) {
          rep = `Moderate similarity (${top.score}%) with submission by ${top.partnerName}`;
        }

        await prisma.assignmentSubmission.update({
          where: { id: sub.id },
          data: {
            similarityScore: top.score,
            similarityReport: rep,
          },
        });
      }
    }

    // Sort pairwise records by similarityScore descending
    pairwiseRecords.sort((a, b) => b.similarityScore - a.similarityScore);
    return pairwiseRecords;
  }
}
