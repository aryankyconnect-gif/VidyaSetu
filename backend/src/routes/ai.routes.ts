// backend/src/routes/ai.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/ai/status
 * Check if AI service is configured (does not leak keys)
 */
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      isConfigured: aiService.isConfigured(),
      model: 'gemini-1.5-flash',
    },
  });
});

/**
 * Handler for generating MCQ quiz questions
 */
const handleQuizGenerate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, numberOfQuestions, difficulty, subjectId } = req.body;
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      res.status(400).json({ success: false, message: 'Topic is required to generate quiz questions' });
      return;
    }

    const result = await aiService.generateQuizQuestions({
      topic,
      subjectId,
      numberOfQuestions: Number(numberOfQuestions) || 5,
      difficulty,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ai/quiz/generate
 * Primary route for Faculty/Admin AI quiz generation
 */
router.post('/quiz/generate', authorizeRoles(Role.ADMIN, Role.FACULTY), handleQuizGenerate);

/**
 * POST /api/ai/generate-quiz
 * Backward-compatible alias
 */
router.post('/generate-quiz', authorizeRoles(Role.ADMIN, Role.FACULTY), handleQuizGenerate);

/**
 * POST /api/ai/ask
 * AI Study Assistant: students and faculty can ask questions about course material
 */
router.post('/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, context, subjectId } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({ success: false, message: 'Question text is required' });
      return;
    }

    const result = await aiService.askStudyAssistant({
      question: question.trim(),
      context,
      subjectId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/summarize
 * AI Summarization: summarize lecture notes, papers, or study text
 */
router.post('/summarize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      res.status(400).json({
        success: false,
        message: 'Content text must be at least 10 characters long to summarize',
      });
      return;
    }

    const result = await aiService.summarizeStudyMaterial({ title, content });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/draft-announcement
 * AI helper for campus notice board drafting
 */
router.post(
  '/draft-announcement',
  authorizeRoles(Role.ADMIN, Role.FACULTY, Role.CR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topic, targetAudience, keyPoints } = req.body;
      if (!topic) {
        res.status(400).json({ success: false, message: 'Topic is required' });
        return;
      }
      const draft = await aiService.draftAnnouncement({
        topic,
        targetAudience: targetAudience || 'Students and Faculty',
        keyPoints: keyPoints || [],
      });
      res.status(200).json({ success: true, data: draft });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
