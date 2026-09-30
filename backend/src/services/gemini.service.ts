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
  questionType?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MCQ';
}

export interface SummarizeResult {
  summary: string;
  keyConcepts: string[];
  importantPoints: string[];
  possibleExamQuestions: string[];
}

export interface ChatHistoryMessage {
  role: 'user' | 'model' | 'assistant';
  text: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  // Prioritized models supported by current API endpoint with automatic fallback
  private readonly candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-lite-latest',
  ];

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
   * Safe execution wrapper handling timeouts
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs = 25000): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('AI request timed out after 25 seconds')), timeoutMs)
      ),
    ]);
  }

  /**
   * Attempts execution across candidate models if a temporary 503 or overload occurs
   */
  private async executeWithModelFallback<T>(
    operation: (modelName: string) => Promise<T>
  ): Promise<{ result: T; model: string }> {
    this.checkConfigured();

    let lastError: any = null;
    for (const modelName of this.candidateModels) {
      try {
        const result = await this.executeWithTimeout(() => operation(modelName));
        return { result, model: modelName };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        logger.warn(`Gemini attempt with model ${modelName} failed: ${errMsg.slice(0, 100)}. Trying fallback model...`);
        // If authentication failed or API key is invalid, fail immediately without looping
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('401') || errMsg.includes('403')) {
          break;
        }
      }
    }

    return this.handleGeminiError(lastError);
  }

  /**
   * Sanitizes and maps Gemini errors to user-friendly messages without exposing internal tokens or keys
   */
  private handleGeminiError(error: any): never {
    const errMsg = String(error?.message || error || '');
    logger.error(`Gemini Service Error: ${errMsg.slice(0, 150)}`);

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('401') || errMsg.includes('403')) {
      throw new Error('Gemini API authentication failed. Please verify the API key configuration on the server.');
    }
    if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('VidyaSetu AI is experiencing high demand right now. Please wait a few moments before trying again.');
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
   * Constructs the academic study assistant system prompt
   */
  private buildSystemInstruction(subjectName?: string, context?: string): string {
    return `You are VidyaSetu AI, an expert, inspiring, and crystal-clear college professor and teaching assistant.
Your goal is to explain concepts clearly, concisely, and effectively—like the best teacher a student has ever had.

Academic Context:
- Focus Subject: ${subjectName || 'College Curriculum / Engineering'}
${context ? `- Reference Syllabus / Lecture Material:\n${context}\n` : ''}

CRITICAL TEACHING PRINCIPLES:
1. Speak Like a Great College Teacher:
   - Prefer simple English, short sentences, and intuitive explanations before introducing technical terms.
   - Be direct. Answer the student's question IMMEDIATELY in the very first sentence.
   - NEVER use filler intros ("Here is a comprehensive breakdown...", "Let's dive deep...", "In this response...").
   - NEVER use filler conclusions ("In summary, both are important...", "In conclusion...").
   - NEVER produce 10+ bloated textbook sections or repeat definitions.

2. ADAPT TO QUESTION TYPE (Choose ONLY the structure appropriate to the question! Do NOT force every section into every answer):

A. COMPARISON QUESTION (e.g. "Difference between BFS and DFS", "Process vs Thread", "TCP vs UDP"):
   - ### Short Answer: 2–3 sentences giving the core difference directly.
   - ### Key Difference: A concise Markdown comparison table (3–5 rows max).
   - ### Simple Example: A relatable real-world or intuitive analogy (e.g., searching rooms floor-by-floor in a building).
   - ### Exam Point: 2–4 high-yield points for university examinations.
   - ### Quick Revision: 2 quick lines (e.g. BFS → Queue → Level-wise; DFS → Stack → Depth-wise).

B. DEFINITION / CONCEPT QUESTION (e.g. "What is normalization in DBMS?", "What is deadlock in OS?"):
   - ### Definition: Direct 1–2 sentence formal definition.
   - ### Simple Explanation: Plain language explanation that a beginner can grasp immediately.
   - ### Example: A concrete, practical scenario.
   - ### Key Exam Points: 2–4 bullet points of high-yield facts (e.g., 4 Coffman conditions for deadlock, normal forms 1NF-3NF/BCNF).
   - ### Quick Revision: 1–2 bullet summary.

C. PROGRAMMING QUESTION (e.g. "Write a C++ program for binary search"):
   - ### Approach: 2 lines explaining the logic.
   - ### Algorithm: Concise step-by-step logic.
   - ### Code: Clean, standard, commented code in fenced code blocks with language tag (e.g. \`\`\`cpp).
   - ### Code Explanation: 2–3 short bullets explaining the critical operations.
   - ### Complexity: Time & Space complexity in 1 line.
   - ### Common Exam Mistake: 1 line (e.g. integer overflow when computing mid).

D. ALGORITHM QUESTION (e.g. "Explain Dijkstra's algorithm"):
   - ### What It Does: 2 sentences.
   - ### How It Works: Step-by-step numbered walkthrough.
   - ### Example: Simple trace on a small input.
   - ### Complexity: Time & Space.
   - ### Exam Point: Key properties (e.g. greedy choice, non-negative weights).

E. MATHEMATICAL / NUMERICAL QUESTION:
   - ### Given & Formula: Relevant formula.
   - ### Step-by-Step Solution: Clear mathematical derivation/steps.
   - ### Final Answer: Highlighted final result.
   - ### Exam Tip: Tricky pitfalls or shortcuts.

F. "WHY" QUESTION (e.g. "Why does BFS use a queue?", "Why normalize?"):
   - ### Direct Answer: 1–2 sentences.
   - ### Reason: 2–3 sentences explaining the core mechanics.
   - ### Simple Example: Clear demonstration.
   - ### Key Takeaway: 1 line.

G. VERY SIMPLE OR DIRECT QUESTION:
   - Answer directly and clearly in 3–6 sentences. Do NOT generate unnecessary subheadings or bloated sections.

3. DIFFICULTY LEVEL & USER OVERRIDES:
   - Default Level: College beginner/intermediate (approachable, clear, rigorous yet friendly).
   - If the student asks "Explain like I'm a beginner" → use simpler analogies and zero unnecessary jargon.
   - If the student asks "Explain in depth" → provide deeper technical rigor and proofs.
   - If the student asks "Give exam answer" or "Give only the answer" → provide a concise, point-wise exam answer without extra chatter.

4. EXAM-ORIENTED ACCURACY:
   - Always state exact asymptotic time and space complexities where relevant.
   - Highlight common exam traps and one-line exam definitions.
   - Never invent college-specific policies, marks, or fake documents.`;
  }

  /**
   * 1. AI Study Assistant (Q&A / Doubt Solver with conversation memory)
   */
  public async askStudyAssistant(params: {
    question: string;
    context?: string;
    subjectName?: string;
    conversationHistory?: ChatHistoryMessage[];
  }): Promise<{ answer: string; model: string }> {
    this.checkConfigured();

    const { question, context, subjectName, conversationHistory } = params;
    const systemInstruction = this.buildSystemInstruction(subjectName, context);

    // Prepare multi-turn conversation history if provided
    let historyForChat: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const formatted: Array<{ role: 'user' | 'model'; text: string }> = [];
      for (const m of conversationHistory) {
        if (!m || !m.text || m.text.trim() === '') continue;
        const role: 'user' | 'model' = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
        formatted.push({ role, text: m.text.trim() });
      }

      // History in Gemini must start with a 'user' turn
      const firstUserIdx = formatted.findIndex(m => m.role === 'user');
      if (firstUserIdx !== -1) {
        const validSequence = formatted.slice(firstUserIdx);
        // Retain the last 6 turns to keep context fast and focused
        const recent = validSequence.slice(-6);
        const startIdx = recent.findIndex(m => m.role === 'user');
        if (startIdx !== -1) {
          const sliceToUse = recent.slice(startIdx);
          for (const item of sliceToUse) {
            if (historyForChat.length > 0 && historyForChat[historyForChat.length - 1].role === item.role) {
              historyForChat[historyForChat.length - 1].parts[0].text += `\n\n${item.text}`;
            } else {
              historyForChat.push({
                role: item.role,
                parts: [{ text: item.text }],
              });
            }
          }
        }
      }
    }

    return this.executeWithModelFallback(async (modelName) => {
      const model = this.genAI!.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
        },
      });

      let answerText = '';
      if (historyForChat.length > 0) {
        const chat = model.startChat({
          history: historyForChat,
        });
        const res = await chat.sendMessage(question);
        answerText = res.response.text();
      } else {
        const res = await model.generateContent(question);
        answerText = res.response.text();
      }

      if (!answerText || answerText.trim() === '') {
        throw new Error('AI returned an empty response');
      }

      return answerText.trim();
    }).then(({ result, model }) => ({ answer: result, model }));
  }

  /**
   * 2. AI Quiz Generator
   * Generates multiple-choice questions with strict schema validation
   */
  public async generateMCQQuestions(params: {
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    numberOfQuestions: number;
    subjectName?: string;
    moduleTitle?: string;
    questionType?: 'MCQ' | 'TRUE_FALSE';
  }): Promise<GeneratedQuizQuestion[]> {
    this.checkConfigured();

    const { topic, difficulty, numberOfQuestions, subjectName, moduleTitle, questionType } = params;
    const count = Math.min(Math.max(numberOfQuestions, 1), 20);
    const isTF = questionType === 'TRUE_FALSE';

    const prompt = `You are a university professor creating an academic quiz for college students.
Subject: ${subjectName || 'Computer Science / Engineering'}
${moduleTitle ? `Module: ${moduleTitle}\n` : ''}Topic: ${topic}
Difficulty: ${difficulty}
Number of Questions: ${count}
Question Type: ${isTF ? 'True / False' : 'Multiple Choice (MCQ)'}

STRICT JSON OUTPUT REQUIREMENT:
Return a JSON object with a "questions" array in this exact schema:
{
  "questions": [
    {
      "question": "Which data structure is commonly used for BFS traversal?",
      "options": ["Stack", "Queue", "Heap", "Tree"],
      "correctAnswer": "Queue",
      "explanation": "BFS explores nodes level by level using a FIFO queue."
    }
  ]
}

RULES:
1. Generate exactly ${count} questions.
2. For MCQ: Each question MUST have exactly 4 distinct options. "correctAnswer" MUST be an exact verbatim match to one of the 4 items in "options".
3. For True/False: "options" MUST be exactly ["True", "False"], and "correctAnswer" MUST be either "True" or "False".
4. "explanation": A concise, educational 1–2 sentence explanation of why the correct answer is right.
5. Provide high quality, academically rigorous questions directly testing concepts, algorithms, edge cases, and principles.
6. Output valid, parseable JSON only.`;

    const { result: validated } = await this.executeWithModelFallback(async (modelName) => {
      const model = this.genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.35,
        },
      });

      const res = await model.generateContent(prompt);
      const textResult = res.response.text();

      if (!textResult || textResult.trim() === '') {
        throw new Error('Empty response received from AI model');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(textResult);
      } catch (parseErr) {
        const objMatch = textResult.match(/\{[\s\S]*\}/);
        const arrMatch = textResult.match(/\[[\s\S]*\]/);
        if (objMatch) {
          try { parsed = JSON.parse(objMatch[0]); } catch {}
        }
        if (!parsed && arrMatch) {
          try { parsed = JSON.parse(arrMatch[0]); } catch {}
        }
        if (!parsed) {
          throw new Error('Malformed JSON received from AI response');
        }
      }

      let items: any[] = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        items = parsed.questions;
      } else {
        throw new Error('AI response structure invalid: expected array of questions');
      }

      const questionsList: GeneratedQuizQuestion[] = [];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const qText = String(item.question || '').trim();
        let rawOptions = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
        let rawAnswer = String(item.correctAnswer || '').trim();
        const explanation = String(item.explanation || 'Refer to course reference materials.').trim();

        if (!qText) continue;

        if (isTF) {
          rawOptions = ['True', 'False'];
          if (rawAnswer.toLowerCase().startsWith('t')) rawAnswer = 'True';
          else if (rawAnswer.toLowerCase().startsWith('f')) rawAnswer = 'False';
          else rawAnswer = 'True';
        } else {
          if (rawOptions.length < 4) continue;
          rawOptions = rawOptions.slice(0, 4);

          if (/^[0-3]$/.test(rawAnswer)) {
            const idx = parseInt(rawAnswer, 10);
            rawAnswer = rawOptions[idx] || rawOptions[0];
          } else if (!rawOptions.includes(rawAnswer)) {
            const found = rawOptions.find((o: string) => o.toLowerCase() === rawAnswer.toLowerCase());
            rawAnswer = found || rawOptions[0];
          }
        }

        questionsList.push({
          question: qText,
          options: rawOptions,
          correctAnswer: rawAnswer,
          explanation,
          difficulty: difficulty || 'MEDIUM',
          topic: topic || 'General',
          questionType: isTF ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
        });
      }

      if (questionsList.length === 0) {
        throw new Error('No valid questions could be extracted from the AI response');
      }

      return questionsList;
    });

    return validated;
  }

  /**
   * Regenerates a single question with Gemini
   */
  public async generateSingleQuestion(params: {
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    subjectName?: string;
    moduleTitle?: string;
    questionType?: 'MCQ' | 'TRUE_FALSE';
    avoidQuestionText?: string;
  }): Promise<GeneratedQuizQuestion> {
    const list = await this.generateMCQQuestions({
      topic: params.avoidQuestionText ? `${params.topic} (distinct from: ${params.avoidQuestionText.slice(0, 80)})` : params.topic,
      difficulty: params.difficulty,
      numberOfQuestions: 1,
      subjectName: params.subjectName,
      moduleTitle: params.moduleTitle,
      questionType: params.questionType,
    });
    if (list.length === 0) {
      throw new Error('Failed to regenerate question');
    }
    return list[0];
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
  "keyConcepts": ["Concept 1 with brief definition", "Concept 2 with brief definition"],
  "importantPoints": ["Key takeaway point 1", "Key takeaway point 2"],
  "possibleExamQuestions": ["Sample exam question 1", "Sample exam question 2"]
}
Output valid JSON only.`;

    const { result: summaryResult } = await this.executeWithModelFallback(async (modelName) => {
      const model = this.genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const res = await model.generateContent(prompt);
      const resultText = res.response.text();

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
    });

    return summaryResult;
  }
}

export const geminiService = new GeminiService();
