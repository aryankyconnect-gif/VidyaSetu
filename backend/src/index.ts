// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import academicRouter from './routes/academic.routes';
import resourceRouter from './routes/resource.routes';
import assignmentRouter from './routes/assignment.routes';
import quizRouter from './routes/quiz.routes';
import announcementRouter from './routes/announcement.routes';
import notificationRouter from './routes/notification.routes';
import dashboardRouter from './routes/dashboard.routes';
import aiRouter from './routes/ai.routes';
import doubtRouter from './routes/doubt.routes';
import analyticsRouter from './routes/analytics.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// Security & Logging Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost or frontend origin or requests without origin (curl/mobile/Postman)
      if (!origin || origin === config.corsOrigin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    name: 'VidyaSetu API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/academic', academicRouter);
app.use('/api/resources', resourceRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ai', aiRouter);
app.use('/api/doubts', doubtRouter);
app.use('/api/analytics', analyticsRouter);

// 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 VidyaSetu API Server running at http://localhost:${PORT}`);
  logger.info(`📚 Connected database: PostgreSQL on localhost:5433 (vidyasetu)`);
});

export default app;
