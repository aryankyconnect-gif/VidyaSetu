// src/pages/app/AIAssistantPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AIServiceClient, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Subject } from '../../types';
import { AIMarkdownRenderer } from '../../components/common/AIMarkdownRenderer';
import {
  Sparkles,
  Send,
  BookOpen,
  FileText,
  HelpCircle,
  CheckCircle,
  Copy,
  Clock,
  Layers,
  Lightbulb,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  model?: string;
  isError?: boolean;
  failedQuery?: string;
}

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'assistant' | 'summarizer'>('assistant');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; model: string } | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'}! I am your **VidyaSetu AI Study Assistant**.\n\nYou can ask me questions about your coursework, request explanations of complex algorithms, or ask for exam preparation tips. Select a subject to ground our discussion or ask directly!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [inputContext, setInputContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Summarizer State
  const [sumTitle, setSumTitle] = useState('');
  const [sumContent, setSumContent] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    summary: string;
    keyConcepts: string[];
    importantPoints: string[];
    possibleExamQuestions: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load subjects
    AcademicService.getSubjects()
      .then(res => {
        if (res.data.success) setSubjects(res.data.data);
      })
      .catch(() => {});

    // Check AI status
    AIServiceClient.getStatus()
      .then(res => {
        if (res.data.success) setAiStatus(res.data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking]);

  const handleAsk = async (e?: React.FormEvent, overrideQuestion?: string) => {
    if (e) e.preventDefault();
    const userText = (overrideQuestion !== undefined ? overrideQuestion : inputQuestion).trim();
    if (!userText || asking) return;

    const currentContext = inputContext.trim();
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (overrideQuestion === undefined) {
      setInputQuestion('');
    }
    setAsking(true);

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const subjectName = selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : undefined;

    // Send conversation context from current session (last 6 messages)
    const conversationHistory = messages
      .filter(m => m.id !== 'welcome' && !m.isError)
      .slice(-6)
      .map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

    try {
      const res = await AIServiceClient.askQuestion({
        question: userText,
        context: currentContext || undefined,
        subjectId: selectedSubjectId || undefined,
        subjectName,
        conversationHistory,
      });

      const responseAnswer = res.data.answer || res.data.data?.answer;
      if (res.data.success && responseAnswer) {
        const assistantMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: responseAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: res.data.source || res.data.data?.source || 'GEMINI',
          model: res.data.model || res.data.data?.model,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(res.data.message || 'No answer returned from AI service');
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `⚠️ **Unable to process query:** ${err.response?.data?.message || err.message || 'Unable to contact the AI Study Assistant. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        failedQuery: userText,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setAsking(false);
    }
  };

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sumContent.trim() || summarizing) return;

    setSummarizing(true);
    try {
      const res = await AIServiceClient.summarize({
        title: sumTitle || undefined,
        content: sumContent,
      });

      if (res.data.success) {
        setSummaryResult(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Summarization failed. Please ensure text is sufficient.');
    } finally {
      setSummarizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Learning Suite</h1>
            <span className="flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
              <Sparkles className="mr-1 h-3 w-3" />
              {aiStatus?.model || 'Gemini 1.5'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent academic doubt resolution, lecture notes summarization, and exam preparation powered by Google Gemini.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center rounded-lg px-4 py-1.5 transition ${
              activeTab === 'assistant'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="mr-1.5 h-4 w-4 text-brand-600" />
            Study Assistant Q&A
          </button>
          <button
            onClick={() => setActiveTab('summarizer')}
            className={`flex items-center rounded-lg px-4 py-1.5 transition ${
              activeTab === 'summarizer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="mr-1.5 h-4 w-4 text-purple-600" />
            Lecture Notes Summarizer
          </button>
        </div>
      </div>

      {/* Tab 1: AI Study Assistant */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls & Grounding Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Course Context
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Focus Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">General Academic Inquiries</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowContextInput(!showContextInput)}
                    className="text-xs font-bold text-brand-600 hover:underline flex items-center"
                  >
                    <Layers className="mr-1 h-3.5 w-3.5" />
                    {showContextInput ? 'Hide reference text' : '+ Add reference notes / syllabus'}
                  </button>

                  {showContextInput && (
                    <textarea
                      rows={4}
                      value={inputContext}
                      onChange={e => setInputContext(e.target.value)}
                      placeholder="Paste excerpt from your lecture slides or textbook to ground Gemini's answer..."
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs focus:border-brand-500 focus:outline-none resize-none"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Sample Prompts
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {[
                    'Explain CAP theorem with a real-world banking example',
                    'What is the difference between BFS and DFS traversal?',
                    'Explain how lexical analysis works in a compiler',
                    'How does two-phase commit achieve atomic distributed transactions?',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputQuestion(prompt)}
                      className="w-full text-left rounded-lg p-2 hover:bg-slate-50 text-[11px] text-slate-600 hover:text-brand-600 transition"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3 flex flex-col h-[640px] rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : msg.isError
                        ? 'bg-rose-50/90 text-rose-900 border border-rose-200 rounded-bl-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 opacity-80 text-[10px] gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>{msg.sender === 'user' ? 'You' : 'VidyaSetu AI'}</span>
                        {msg.sender === 'assistant' && msg.model && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-medium text-purple-700">
                            {msg.model}
                          </span>
                        )}
                      </div>
                      <span>{msg.timestamp}</span>
                    </div>

                    {msg.sender === 'user' ? (
                      <div className="whitespace-pre-wrap select-text font-normal text-xs text-white">
                        {msg.text}
                      </div>
                    ) : (
                      <AIMarkdownRenderer content={msg.text} />
                    )}

                    {msg.isError && msg.failedQuery && (
                      <button
                        type="button"
                        onClick={() => handleAsk(undefined, msg.failedQuery)}
                        disabled={asking}
                        className="mt-3 inline-flex items-center text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg px-2.5 py-1 transition disabled:opacity-50 shadow-xs"
                      >
                        <RotateCcw className="mr-1.5 h-3 w-3" />
                        Retry question
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {asking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                      <span>Gemini is generating response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAsk} className="border-t border-slate-200 bg-white p-4 flex gap-2">
              <input
                value={inputQuestion}
                onChange={e => setInputQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputQuestion.trim() && !asking) {
                      handleAsk();
                    }
                  }
                }}
                placeholder="Ask an academic question or doubt (Press Enter to ask)..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={asking || !inputQuestion.trim()}
                className="inline-flex items-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Ask
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Lecture Notes Summarizer */}
      {activeTab === 'summarizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <form onSubmit={handleSummarize} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lecture Material Input</h3>
                <p className="text-xs text-slate-500">
                  Paste lecture transcripts, class notes, or reference text to synthesize key points.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Topic / Lecture Title (Optional)</label>
                <input
                  value={sumTitle}
                  onChange={e => setSumTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Paxos Protocol"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Content / Notes Text</label>
                <textarea
                  required
                  rows={14}
                  value={sumContent}
                  onChange={e => setSumContent(e.target.value)}
                  placeholder="Paste your lecture notes, textbook chapters, or slide content here..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-brand-500 focus:outline-none resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {sumContent.length} characters (min 10)
                </span>
                <button
                  type="submit"
                  disabled={summarizing || sumContent.trim().length < 10}
                  className="inline-flex items-center rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {summarizing ? 'Analyzing with Gemini...' : 'Generate Structured Summary'}
                </button>
              </div>
            </form>
          </div>

          {/* Output Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <Lightbulb className="mr-2 h-4 w-4 text-purple-600" />
                  Structured Study Guide
                </h3>
                {summaryResult && (
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${summaryResult.summary}\n\nKey Concepts:\n${summaryResult.keyConcepts.join(
                          '\n'
                        )}\n\nImportant Points:\n${summaryResult.importantPoints.join(
                          '\n'
                        )}\n\nPossible Exam Questions:\n${summaryResult.possibleExamQuestions.join('\n')}`
                      )
                    }
                    className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-brand-600 transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy Guide
                      </>
                    )}
                  </button>
                )}
              </div>

              {!summaryResult && !summarizing && (
                <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                  <FileText className="h-12 w-12 text-slate-200 mb-2" />
                  <p className="text-xs">Your structured study summary will appear here.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Paste notes on the left and click "Generate Structured Summary".
                  </p>
                </div>
              )}

              {summarizing && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mb-3" />
                  <p className="text-xs font-bold text-slate-700">Synthesizing Lecture Material...</p>
                  <p className="text-[11px] text-slate-400 mt-1">Extracting core concepts and exam questions</p>
                </div>
              )}

              {summaryResult && (
                <div className="space-y-5 text-xs overflow-y-auto max-h-[500px] pr-1">
                  {/* Executive Summary */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[11px] text-purple-700 mb-1">
                      Summary
                    </h4>
                    <p className="text-slate-700 leading-relaxed bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                      {summaryResult.summary}
                    </p>
                  </div>

                  {/* Key Concepts */}
                  {summaryResult.keyConcepts?.length > 0 && (
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-2">
                        Key Concepts
                      </h4>
                      <div className="space-y-1.5">
                        {summaryResult.keyConcepts.map((concept, idx) => (
                          <div
                            key={idx}
                            className="flex items-start rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-slate-800"
                          >
                            <span className="font-bold text-brand-600 mr-2">{idx + 1}.</span>
                            <span>{concept}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Important Points */}
                  {summaryResult.importantPoints?.length > 0 && (
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-2">
                        Important Takeaways
                      </h4>
                      <ul className="space-y-1 text-slate-700 list-disc list-inside">
                        {summaryResult.importantPoints.map((point, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Possible Exam Questions */}
                  {summaryResult.possibleExamQuestions?.length > 0 && (
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-rose-700 mb-2">
                        Possible Exam Questions
                      </h4>
                      <div className="space-y-2">
                        {summaryResult.possibleExamQuestions.map((q, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-slate-800"
                          >
                            <span className="font-bold text-rose-700 mr-1.5">Q{idx + 1}:</span>
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
