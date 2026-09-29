// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'vidyasetu_access_secret_key_prod',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'vidyasetu_refresh_secret_key_prod',
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '1d',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
