// src/services/ai.service.ts
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AISummaryRequest {
  title: string;
  content: string;
}

export interface AIGenerateQuizRequest {
  topic: string;
  numberOfQuestions: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface AIDraftAnnouncementRequest {
  topic: string;
  targetAudience: string;
  keyPoints: string[];
}

export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.geminiApiKey;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'dummy_gemini_api_key');
  }

  /**
   * Summarize academic material or lecture transcript
   */
  async summarizeStudyMaterial(req: AISummaryRequest): Promise<{ summary: string; keyTakeaways: string[] }> {
    logger.info(`AI service request: summarizeStudyMaterial for "${req.title}"`);

    if (!this.isConfigured()) {
      return {
        summary: `[VidyaSetu AI Preview]: ${req.title} covers essential principles, core models, and system tradeoffs. (Gemini API integration hook is ready for deployment).`,
        keyTakeaways: [
          'Core foundational definitions and architectural invariants.',
          'Tradeoffs between consistency, availability, and latency.',
          'Key operational workflows for practical laboratory applications.',
        ],
      };
    }

    // Future Gemini SDK call:
    // const response = await geminiClient.models.generateContent({ ... });
    return {
      summary: `Automated summary for ${req.title}.`,
      keyTakeaways: ['Concept A', 'Concept B'],
    };
  }

  /**
   * Automatically generate structured multiple-choice quiz questions
   */
  async generateQuizQuestions(req: AIGenerateQuizRequest) {
    logger.info(`AI service request: generateQuizQuestions for "${req.topic}"`);

    return [
      {
        questionText: `What is the primary role of consensus in ${req.topic}?`,
        questionType: 'MULTIPLE_CHOICE',
        options: ['State machine replication', 'Single point of failure', 'Increasing network latency', 'Data compression'],
        correctAnswer: '0',
        marks: 5,
      },
      {
        questionText: `Is ${req.topic} applicable in fault-tolerant distributed architectures?`,
        questionType: 'TRUE_FALSE',
        options: ['True', 'False'],
        correctAnswer: '0',
        marks: 5,
      },
    ];
  }

  /**
   * Draft campus or department announcement
   */
  async draftAnnouncement(req: AIDraftAnnouncementRequest): Promise<{ title: string; body: string }> {
    logger.info(`AI service request: draftAnnouncement for "${req.topic}"`);

    return {
      title: `Notice: ${req.topic}`,
      body: `Dear ${req.targetAudience},\n\nPlease be informed regarding ${req.topic}. Key highlights include: ${req.keyPoints.join(
        ', '
      )}. Kindly adhere to the timelines provided.`,
    };
  }
}

export const aiService = new AIService();
