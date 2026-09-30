// backend/src/services/gemini.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topic: string;
}

export interface SummarizeResult {
  summary: string;
  keyConcepts: string[];
  importantPoints: string[];
  possibleExamQuestions: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly defaultModel = 'gemini-1.5-flash';

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'dummy_gemini_api_key' && apiKey !== 'YOUR_NEW_GEMINI_API_KEY') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey.trim());
      } catch (err) {
        logger.error('Failed to initialize Google Generative AI client');
        this.genAI = null;
      }
    } else {
      this.genAI = null;
    }
  }

  public isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return Boolean(
      apiKey &&
      apiKey.trim() !== '' &&
      apiKey !== 'dummy_gemini_api_key' &&
      apiKey !== 'YOUR_NEW_GEMINI_API_KEY'
    );
  }

  private checkConfigured(): void {
    if (!this.isConfigured() || !this.genAI) {
      throw new Error(
        'Gemini API is not configured on this server. Please set GEMINI_API_KEY in the backend environment.'
      );
    }
  }

  /**
   * Safe execution wrapper handling timeouts, rate limits, network errors, and auth errors
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs = 25000): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 25 seconds')), timeoutMs)
      ),
    ]);
  }

  /**
   * Sanitizes and maps Gemini errors to user-friendly messages without exposing internal tokens
   */
  private handleGeminiError(error: any): never {
    const errMsg = String(error?.message || error || '');
    logger.error(`Gemini Service Error: ${errMsg.slice(0, 120)}`);

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('401') || errMsg.includes('403')) {
      throw new Error('Gemini API authentication failed. Please verify the API key configuration on the server.');
    }
    if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini AI rate limit exceeded. Please wait a few moments before trying again.');
    }
    if (errMsg.includes('timed out')) {
      throw new Error('The AI service timed out while processing your request. Please try again.');
    }
    if (errMsg.includes('Gemini API is not configured')) {
      throw error;
    }

    throw new Error('An error occurred while communicating with the AI service. Please try again later.');
  }

  /**
   * 1. AI Quiz Generator
   * Generates multiple-choice questions with strict schema validation
   */
  public async generateMCQQuestions(params: {
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    numberOfQuestions: number;
    subjectName?: string;
  }): Promise<GeneratedQuizQuestion[]> {
    this.checkConfigured();

    const { topic, difficulty, numberOfQuestions, subjectName } = params;
    const count = Math.min(Math.max(numberOfQuestions, 1), 20);

    const prompt = `You are a university professor creating an academic multiple-choice quiz.
Subject: ${subjectName || 'Computer Science / Engineering'}
Topic: ${topic}
Difficulty: ${difficulty}
Number of Questions: ${count}

REQUIREMENTS:
1. Generate exactly ${count} multiple choice questions.
2. Each question MUST have:
   - "question": string (clear, academic question text)
   - "options": array of exactly 4 distinct strings
   - "correctAnswer": string (MUST be identical to one of the 4 strings in "options")
   - "explanation": string (brief pedagogical explanation of why this answer is correct)
   - "difficulty": "${difficulty}"
   - "topic": "${topic}"
3. Format output as a JSON array of objects. Do not wrap in markdown quotes if possible, output pure JSON.`;

    try {
      const model = this.genAI!.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const result = await this.executeWithTimeout(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      });

      if (!result || result.trim() === '') {
        throw new Error('Empty response received from AI model');
      }

      // Parse JSON safely
      let parsed: any;
      try {
        parsed = JSON.parse(result);
      } catch (parseErr) {
        // Fallback: extract JSON array substring
        const match = result.match(/\[[\s\S]*\]/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Malformed JSON received from AI response');
        }
      }

      if (!Array.isArray(parsed)) {
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed = parsed.questions;
        } else {
          throw new Error('AI response structure invalid: expected array of questions');
        }
      }

      // Validate each question against strict schema
      const validated: GeneratedQuizQuestion[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const qText = String(item.question || '').trim();
        const options = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
        const rawAnswer = String(item.correctAnswer || '').trim();
        const explanation = String(item.explanation || 'Refer to course reference materials.').trim();

        if (!qText || options.length !== 4) continue;

        // Ensure correctAnswer matches one of the options (support index format "0".."3" or text format)
        let resolvedAnswer = rawAnswer;
        if (/^[0-3]$/.test(rawAnswer)) {
          const idx = parseInt(rawAnswer, 10);
          resolvedAnswer = options[idx] || options[0];
        } else if (!options.includes(resolvedAnswer)) {
          // Find closest matching option or fallback to first option
          const found = options.find((o: string) => o.toLowerCase() === resolvedAnswer.toLowerCase());
          resolvedAnswer = found || options[0];
        }

        validated.push({
          question: qText,
          options,
          correctAnswer: resolvedAnswer,
          explanation,
          difficulty: difficulty || 'MEDIUM',
          topic: topic || 'General',
        });
      }

      if (validated.length === 0) {
        throw new Error('No valid questions could be extracted from the AI response');
      }

      return validated;
    } catch (err) {
      return this.handleGeminiError(err);
    }
  }

  /**
   * 2. AI Study Assistant (Q&A / Doubt Solver)
   * Pluggable context / RAG-ready
   */
  public async askStudyAssistant(params: {
    question: string;
    context?: string;
    subjectName?: string;
    conversationHistory?: Array<{ role: 'user' | 'model'; parts: string }>;
  }): Promise<string> {
    this.checkConfigured();

    const { question, context, subjectName } = params;

    const systemPrompt = `You are VidyaSetu AI, an expert, encouraging university teaching assistant.
Your goal is to help college students understand their course material, resolve academic doubts, clarify conceptual subtleties, and prepare for examinations.
Subject: ${subjectName || 'General Academic Curriculum'}
${context ? `Reference Study Context / Syllabus:\n${context}\n` : ''}

GUIDELINES:
- Provide clear, structured, and pedagogical explanations.
- Use markdown formatting (bolding, bullet points, numbered steps, code blocks where appropriate).
- If the question is outside academic scope, politely steer the student back to coursework.
- Keep responses engaging, accurate, and concise.`;

    try {
      const model = this.genAI!.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1200,
        },
      });

      const fullPrompt = `${systemPrompt}\n\nStudent Question: ${question}\n\nAssistant Response:`;

      const result = await this.executeWithTimeout(async () => {
        const res = await model.generateContent(fullPrompt);
        return res.response.text();
      });

      if (!result || result.trim() === '') {
        throw new Error('AI returned an empty response');
      }

      return result.trim();
    } catch (err) {
      return this.handleGeminiError(err);
    }
  }

  /**
   * 3. AI Summarization
   * Summarizes lecture notes, papers, or transcripts into structured study outputs
   */
  public async summarizeContent(params: {
    content: string;
    title?: string;
  }): Promise<SummarizeResult> {
    this.checkConfigured();

    const { content, title } = params;

    const prompt = `You are an academic summarization engine for a college LMS.
Analyze the following lecture notes or study material and provide a comprehensive structured study guide.
${title ? `Title / Subject: ${title}\n` : ''}
Material Content:
"""
${content.slice(0, 15000)}
"""

REQUIREMENTS:
Return a JSON object with exactly these keys:
{
  "summary": "A concise executive summary covering the material in 2-3 paragraphs",
  "keyConcepts": ["Concept 1 with brief definition", "Concept 2 with brief definition", ...],
  "importantPoints": ["Key takeaway point 1", "Key takeaway point 2", ...],
  "possibleExamQuestions": ["Sample exam question 1", "Sample exam question 2", ...]
}
Output valid JSON only.`;

    try {
      const model = this.genAI!.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const resultText = await this.executeWithTimeout(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      });

      if (!resultText || resultText.trim() === '') {
        throw new Error('AI returned an empty summary response');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(resultText);
      } catch {
        const match = resultText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Malformed JSON received for summary');
      }

      return {
        summary: String(parsed.summary || 'Summary unavailable.').trim(),
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.map(String) : [],
        importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints.map(String) : [],
        possibleExamQuestions: Array.isArray(parsed.possibleExamQuestions) ? parsed.possibleExamQuestions.map(String) : [],
      };
    } catch (err) {
      return this.handleGeminiError(err);
    }
  }
}

export const geminiService = new GeminiService();
