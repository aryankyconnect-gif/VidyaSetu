// src/routes/ai.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/summarize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content } = req.body;
    const result = await aiService.summarizeStudyMaterial({ title, content });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/generate-quiz',
  authorizeRoles(Role.ADMIN, Role.FACULTY),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topic, numberOfQuestions, difficulty } = req.body;
      const questions = await aiService.generateQuizQuestions({
        topic,
        numberOfQuestions: Number(numberOfQuestions) || 5,
        difficulty,
      });
      res.status(200).json({ success: true, data: questions });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/draft-announcement',
  authorizeRoles(Role.ADMIN, Role.FACULTY, Role.CR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topic, targetAudience, keyPoints } = req.body;
      const draft = await aiService.draftAnnouncement({
        topic,
        targetAudience,
        keyPoints: keyPoints || [],
      });
      res.status(200).json({ success: true, data: draft });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
