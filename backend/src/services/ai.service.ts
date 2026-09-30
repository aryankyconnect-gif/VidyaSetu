// backend/src/services/ai.service.ts
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { geminiService, GeneratedQuizQuestion, SummarizeResult } from './gemini.service';

export interface AISummaryRequest {
  title?: string;
  content: string;
}

export interface AIGenerateQuizRequest {
  topic: string;
  subjectId?: string;
  numberOfQuestions: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface AIAskRequest {
  question: string;
  context?: string;
  subjectId?: string;
}

export interface AIDraftAnnouncementRequest {
  topic: string;
  targetAudience: string;
  keyPoints: string[];
}

export class AIService {
  public isConfigured(): boolean {
    return geminiService.isConfigured();
  }

  /**
   * Normalize question text for deduplication
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  /**
   * 1. AI Quiz Generator & Question Bank
   * Checks for existing questions before calling Gemini to save API usage,
   * deduplicates, and saves newly generated questions into PostgreSQL.
   */
  public async generateQuizQuestions(req: AIGenerateQuizRequest): Promise<{
    questions: GeneratedQuizQuestion[];
    reusedFromBank: number;
    newlyGenerated: number;
    source: 'DATABASE_BANK' | 'GEMINI' | 'HYBRID' | 'FALLBACK';
  }> {
    const topic = req.topic.trim();
    const difficulty = (req.difficulty || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
    const requestedCount = Math.min(Math.max(req.numberOfQuestions || 5, 1), 20);

    logger.info(`AI Quiz Request: topic="${topic}", difficulty="${difficulty}", count=${requestedCount}`);

    // Step 1: Query AI Question Bank for existing matching questions
    const existingInBank = await prisma.aiQuestionBank.findMany({
      where: {
        AND: [
          {
            OR: [
              { topic: { contains: topic, mode: 'insensitive' } },
              ...(req.subjectId ? [{ subjectId: req.subjectId }] : []),
            ],
          },
          { difficulty },
        ],
      },
      orderBy: { usageCount: 'asc' }, // Prefer less frequently used questions for variety
      take: requestedCount,
    });

    const parsedExisting: GeneratedQuizQuestion[] = existingInBank.map(item => ({
      question: item.question,
      options: JSON.parse(item.optionsJson || '[]'),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation || 'Verified question from VidyaSetu question bank.',
      difficulty: item.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      topic: item.topic,
    }));

    // If we have enough cached questions, reuse them directly!
    if (parsedExisting.length >= requestedCount) {
      const selected = parsedExisting.slice(0, requestedCount);
      const selectedIds = existingInBank.slice(0, requestedCount).map(q => q.id);

      // Increment usage count asynchronously
      prisma.aiQuestionBank.updateMany({
        where: { id: { in: selectedIds } },
        data: { usageCount: { increment: 1 } },
      }).catch(err => logger.error(`Failed to update question usage count: ${err.message}`));

      logger.info(`AI Question Bank: Reused ${selected.length} questions from PostgreSQL (0 Gemini calls consumed).`);
      return {
        questions: selected,
        reusedFromBank: selected.length,
        newlyGenerated: 0,
        source: 'DATABASE_BANK',
      };
    }

    // Step 2: More questions needed — Call Gemini API
    const remainingToGenerate = requestedCount - parsedExisting.length;

    let subjectName: string | undefined;
    if (req.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: req.subjectId },
        select: { name: true, code: true },
      });
      if (subject) subjectName = `${subject.code}: ${subject.name}`;
    }

    let newlyGeneratedQuestions: GeneratedQuizQuestion[] = [];

    if (this.isConfigured()) {
      try {
        newlyGeneratedQuestions = await geminiService.generateMCQQuestions({
          topic,
          difficulty,
          numberOfQuestions: remainingToGenerate,
          subjectName,
        });
      } catch (err: any) {
        logger.error(`Gemini generation failed: ${err.message}`);
        // If we had some existing questions in bank, return what we have
        if (parsedExisting.length > 0) {
          return {
            questions: parsedExisting,
            reusedFromBank: parsedExisting.length,
            newlyGenerated: 0,
            source: 'DATABASE_BANK',
          };
        }
        throw err;
      }
    } else {
      // Offline fallback when no API key is provided
      logger.warn('Gemini API is not configured; generating structured fallback questions.');
      newlyGeneratedQuestions = [
        {
          question: `In the context of ${topic}, what is the fundamental invariant preserved during standard operations?`,
          options: [
            'Consistent state transitions and data integrity',
            'Arbitrary latency degradation without bounds',
            'Bypassing relational constraints',
            'Unsynchronized concurrent state updates',
          ],
          correctAnswer: 'Consistent state transitions and data integrity',
          explanation: `System invariants in ${topic} ensure that safety properties hold regardless of concurrency.`,
          difficulty,
          topic,
        },
        {
          question: `Which algorithmic property is most critical when evaluating ${topic}?`,
          options: [
            'Time and space asymptotic complexity',
            'Random execution scheduling',
            'Hardcoded buffer capacities',
            'Ignoring edge cases in boundary conditions',
          ],
          correctAnswer: 'Time and space asymptotic complexity',
          explanation: 'Academic evaluation prioritizes asymptotic complexity bounds.',
          difficulty,
          topic,
        },
      ];
    }

    // Step 3: Save newly generated questions to AI Question Bank (preventing duplicate questions)
    const existingNormalized = new Set(
      (await prisma.aiQuestionBank.findMany({ select: { question: true } })).map(q =>
        this.normalizeText(q.question)
      )
    );

    let savedCount = 0;
    for (const q of newlyGeneratedQuestions) {
      const norm = this.normalizeText(q.question);
      if (!existingNormalized.has(norm)) {
        try {
          await prisma.aiQuestionBank.create({
            data: {
              subjectId: req.subjectId || null,
              topic: q.topic || topic,
              difficulty: q.difficulty || difficulty,
              question: q.question,
              optionsJson: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              source: this.isConfigured() ? 'GEMINI' : 'MANUAL',
              usageCount: 1,
            },
          });
          existingNormalized.add(norm);
          savedCount++;
        } catch (dbErr: any) {
          logger.error(`Failed to save question to bank: ${dbErr.message}`);
        }
      }
    }

    const merged = [...parsedExisting, ...newlyGeneratedQuestions].slice(0, requestedCount);

    return {
      questions: merged,
      reusedFromBank: parsedExisting.length,
      newlyGenerated: newlyGeneratedQuestions.length,
      source: parsedExisting.length > 0 ? 'HYBRID' : (this.isConfigured() ? 'GEMINI' : 'FALLBACK'),
    };
  }

  /**
   * 2. AI Study Assistant (Ask doubts / RAG-ready)
   */
  public async askStudyAssistant(req: AIAskRequest): Promise<{ answer: string; source: string }> {
    logger.info(`AI Study Assistant asked: "${req.question.slice(0, 60)}"`);

    let subjectName: string | undefined;
    let enrichedContext = req.context || '';

    // If subjectId provided, enrich context with subject syllabus & modules
    if (req.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: req.subjectId },
        include: {
          modules: { select: { title: true, description: true } },
          department: { select: { name: true } },
        },
      });
      if (subject) {
        subjectName = `${subject.code} - ${subject.name} (${subject.department.name})`;
        const moduleList = subject.modules.map(m => `- ${m.title}: ${m.description || ''}`).join('\n');
        enrichedContext = `Course Modules:\n${moduleList}\n\n${enrichedContext}`;
      }
    }

    if (this.isConfigured()) {
      const answer = await geminiService.askStudyAssistant({
        question: req.question,
        context: enrichedContext || undefined,
        subjectName,
      });
      return { answer, source: 'GEMINI' };
    }

    // Informative fallback
    return {
      answer: `### Academic Insight on "${req.question}"\n\nWhen studying this concept in **${subjectName || 'your coursework'}**, remember:\n\n1. **Core Principle:** Ensure you understand the underlying definitions, mathematical formalisms, and system invariants.\n2. **Practical Application:** Review relevant code implementations and standard algorithmic paradigms discussed in class.\n3. **Exam Readiness:** Practice solving past year problems and tracing corner cases.\n\n*(Note: Configure \`GEMINI_API_KEY\` in backend/.env for live conversational responses).*`,
      source: 'FALLBACK',
    };
  }

  /**
   * 3. AI Summarization of Lecture Notes / Text
   */
  public async summarizeStudyMaterial(req: AISummaryRequest): Promise<SummarizeResult> {
    logger.info(`AI Summarize request for: "${req.title || 'Lecture Material'}"`);

    if (this.isConfigured()) {
      return await geminiService.summarizeContent({
        content: req.content,
        title: req.title,
      });
    }

    // High quality fallback structure when API key is not configured
    return {
      summary: `This material on "${req.title || 'the selected topic'}" covers fundamental theoretical paradigms, practical implementation details, and critical design tradeoffs relevant to college-level examinations and laboratory projects.`,
      keyConcepts: [
        'Fundamental architectural definitions and lifecycle states',
        'Tradeoffs between execution speed, space complexity, and fault tolerance',
        'Standard protocols, communication interfaces, and data models',
      ],
      importantPoints: [
        'Review the key theorems and proofs presented in the lecture notes.',
        'Pay special attention to boundary conditions and failure handling.',
        'Understand practical system constraints in production deployments.',
      ],
      possibleExamQuestions: [
        `Explain the core architectural differences and tradeoffs involved in ${req.title || 'this topic'}.`,
        'What are the critical failure modes and how does the system recover state?',
        'Provide a pseudocode algorithm or architectural diagram illustrating the primary workflow.',
      ],
    };
  }

  /**
   * Draft campus or department announcement
   */
  public async draftAnnouncement(req: AIDraftAnnouncementRequest): Promise<{ title: string; body: string }> {
    logger.info(`AI draft announcement for: "${req.topic}"`);

    if (this.isConfigured()) {
      try {
        const result = await geminiService.askStudyAssistant({
          question: `Draft a professional college notice for ${req.targetAudience} regarding "${req.topic}". Key points to include: ${req.keyPoints.join(', ')}. Return just the announcement body.`,
          subjectName: 'Campus Administration',
        });
        return {
          title: `Notice: ${req.topic}`,
          body: result,
        };
      } catch (err) {
        logger.error('Failed to draft with Gemini, using template');
      }
    }

    return {
      title: `Notice: ${req.topic}`,
      body: `Dear ${req.targetAudience},\n\nPlease be informed regarding ${req.topic}.\n\nKey Highlights:\n${req.keyPoints.map(p => `• ${p}`).join('\n')}\n\nKindly adhere to the designated timelines. For questions, contact the department office.`,
    };
  }
}

export const aiService = new AIService();
