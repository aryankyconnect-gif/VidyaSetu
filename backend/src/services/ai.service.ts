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
  moduleId?: string;
  numberOfQuestions: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  questionType?: 'MCQ' | 'TRUE_FALSE';
}

export interface AIRegenerateQuestionRequest {
  topic: string;
  subjectId?: string;
  moduleId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  questionType?: 'MCQ' | 'TRUE_FALSE';
  avoidQuestionText?: string;
}

export interface AIAskRequest {
  question: string;
  context?: string;
  subjectId?: string;
  subjectName?: string;
  conversationHistory?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }>;
}

export interface AIAskResponse {
  answer: string;
  subject: string;
  model: string;
  source: string;
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
    const questionType = req.questionType || 'MCQ';

    logger.info(`AI Quiz Request: topic="${topic}", difficulty="${difficulty}", count=${requestedCount}, type=${questionType}`);

    let subjectName: string | undefined;
    let moduleTitle: string | undefined;

    if (req.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: req.subjectId },
        select: { name: true, code: true },
      });
      if (subject) subjectName = `${subject.code} - ${subject.name}`;
    }

    if (req.moduleId) {
      const moduleItem = await prisma.module.findUnique({
        where: { id: req.moduleId },
        select: { title: true },
      });
      if (moduleItem) moduleTitle = moduleItem.title;
    }

    let newlyGeneratedQuestions: GeneratedQuizQuestion[] = [];

    // Step 1: Call Gemini for fresh AI generation
    if (this.isConfigured()) {
      try {
        newlyGeneratedQuestions = await geminiService.generateMCQQuestions({
          topic,
          difficulty,
          numberOfQuestions: requestedCount,
          subjectName,
          moduleTitle,
          questionType,
        });
      } catch (err: any) {
        logger.error(`Gemini quiz generation failed: ${err.message}. Attempting fallback.`);
      }
    }

    // Step 2: Fallback to Question Bank or Structured Template if Gemini is unavailable
    if (newlyGeneratedQuestions.length === 0) {
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
        orderBy: { usageCount: 'asc' },
        take: requestedCount,
      });

      if (existingInBank.length > 0) {
        return {
          questions: existingInBank.map(item => ({
            question: item.question,
            options: JSON.parse(item.optionsJson || '[]'),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation || 'Verified question from question bank.',
            difficulty: item.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            topic: item.topic,
            questionType: questionType === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
          })),
          reusedFromBank: existingInBank.length,
          newlyGenerated: 0,
          source: 'DATABASE_BANK',
        };
      }

      // Template fallback
      newlyGeneratedQuestions = [
        {
          question: `In the study of ${topic}, which fundamental property must hold to ensure system correctness?`,
          options: [
            'Consistent state transitions and invariant preservation',
            'Unsynchronized concurrent state mutation without locks',
            'O(N!) computational overhead in best-case scenarios',
            'Bypassing boundary assertions during execution',
          ],
          correctAnswer: 'Consistent state transitions and invariant preservation',
          explanation: `Invariants in ${topic} ensure that safety properties hold regardless of concurrency.`,
          difficulty,
          topic,
          questionType: 'MULTIPLE_CHOICE',
        },
        {
          question: `Which asymptotic metric is most critical when evaluating ${topic}?`,
          options: [
            'Time and space asymptotic complexity bounds',
            'Random instruction reordering without synchronization',
            'Arbitrary stack frame resizing',
            'Ignoring edge cases in recursive termination',
          ],
          correctAnswer: 'Time and space asymptotic complexity bounds',
          explanation: 'Academic evaluation prioritizes asymptotic complexity bounds.',
          difficulty,
          topic,
          questionType: 'MULTIPLE_CHOICE',
        },
      ];
    }

    // Step 3: Persist newly generated questions in PostgreSQL
    const existingNormalized = new Set(
      (await prisma.aiQuestionBank.findMany({ select: { question: true } })).map(q =>
        this.normalizeText(q.question)
      )
    );

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
        } catch (dbErr: any) {
          logger.error(`Failed to save question to bank: ${dbErr.message}`);
        }
      }
    }

    return {
      questions: newlyGeneratedQuestions.slice(0, requestedCount),
      reusedFromBank: 0,
      newlyGenerated: newlyGeneratedQuestions.length,
      source: this.isConfigured() ? 'GEMINI' : 'FALLBACK',
    };
  }

  /**
   * Regenerates a single question with Gemini
   */
  public async regenerateSingleQuestion(req: AIRegenerateQuestionRequest): Promise<GeneratedQuizQuestion> {
    const topic = req.topic.trim();
    const difficulty = (req.difficulty || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
    let subjectName: string | undefined;
    let moduleTitle: string | undefined;

    if (req.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: req.subjectId },
        select: { name: true, code: true },
      });
      if (subject) subjectName = `${subject.code} - ${subject.name}`;
    }

    if (req.moduleId) {
      const moduleItem = await prisma.module.findUnique({
        where: { id: req.moduleId },
        select: { title: true },
      });
      if (moduleItem) moduleTitle = moduleItem.title;
    }

    if (this.isConfigured()) {
      return await geminiService.generateSingleQuestion({
        topic,
        difficulty,
        subjectName,
        moduleTitle,
        questionType: req.questionType,
        avoidQuestionText: req.avoidQuestionText,
      });
    }

    return {
      question: `Which fundamental principle is central to the design and operation of ${topic}?`,
      options: [
        'Consistent state transitions and data integrity',
        'O(N^3) brute-force recursion without memoization',
        'Bypassing validation layers during runtime execution',
        'Unsynchronized concurrent state updates',
      ],
      correctAnswer: 'Consistent state transitions and data integrity',
      explanation: `System invariants in ${topic} ensure that safety properties hold regardless of concurrency.`,
      difficulty,
      topic,
      questionType: 'MULTIPLE_CHOICE',
    };
  }

  /**
   * 2. AI Study Assistant (Ask doubts / RAG-ready)
   */
  public async askStudyAssistant(req: AIAskRequest): Promise<AIAskResponse> {
    logger.info(`AI Study Assistant asked: "${req.question.slice(0, 60)}"`);

    let subjectName: string | undefined = req.subjectName;
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
      const { answer, model } = await geminiService.askStudyAssistant({
        question: req.question,
        context: enrichedContext || undefined,
        subjectName,
        conversationHistory: req.conversationHistory,
      });
      return {
        answer,
        subject: subjectName || 'General Academic Coursework',
        model,
        source: 'GEMINI',
      };
    }

    // Informative fallback
    return {
      answer: `### Academic Insight on "${req.question}"\n\nWhen studying this concept in **${subjectName || 'your coursework'}**, remember:\n\n1. **Core Principle:** Ensure you understand the underlying definitions, mathematical formalisms, and system invariants.\n2. **Practical Application:** Review relevant code implementations and standard algorithmic paradigms discussed in class.\n3. **Exam Readiness:** Practice solving past year problems and tracing corner cases.\n\n*(Note: Configure \`GEMINI_API_KEY\` in backend/.env for live conversational responses).*`,
      subject: subjectName || 'General Academic Coursework',
      model: 'system-fallback',
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
          body: result.answer,
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
