// src/pages/app/QuizzesPage.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizService, AIServiceClient, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Quiz, Subject } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  Play,
  Eye,
  X,
  Sparkles,
  Database,
  Plus,
  BookOpen,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
  Layers,
} from 'lucide-react';

export const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subjectIdFilter = searchParams.get('subjectId') || '';
  const isFacultyOrAdmin = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Active quiz attempt
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  // AI Quiz Generator Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSubjectId, setAiSubjectId] = useState('');
  const [aiModuleId, setAiModuleId] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiQuestionType, setAiQuestionType] = useState<'MCQ' | 'TRUE_FALSE'>('MCQ');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<{
    questions: any[];
    reusedFromBank: number;
    newlyGenerated: number;
    source: string;
  } | null>(null);
  const [aiQuizTitle, setAiQuizTitle] = useState('');
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [resQuizzes, resSubjects] = await Promise.all([
        QuizService.getQuizzes(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        AcademicService.getSubjects(),
      ]);

      if (resQuizzes.data.success) setQuizzes(resQuizzes.data.data);
      if (resSubjects.data.success) {
        setSubjects(resSubjects.data.data);
        if (resSubjects.data.data.length > 0 && !aiSubjectId) {
          setAiSubjectId(resSubjects.data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [subjectIdFilter]);

  const handleStartQuiz = async (quizId: string) => {
    try {
      const res = await QuizService.getQuizById(quizId);
      if (res.data.success) {
        setActiveQuiz(res.data.data);
        setAnswers({});
        setResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    try {
      const res = await QuizService.submitQuizAttempt(activeQuiz.id, answers);
      const attempt = res.data.data;
      setResult({ score: attempt.score, total: activeQuiz.totalMarks });
      load(); // Refresh to show attempt status
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAiQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setAiGenerating(true);
    setEditingIndex(null);
    try {
      const res = await AIServiceClient.generateQuiz({
        topic: aiTopic.trim(),
        subjectId: aiSubjectId || undefined,
        moduleId: aiModuleId || undefined,
        difficulty: aiDifficulty,
        numberOfQuestions: aiQuestionCount,
        questionType: aiQuestionType,
      });

      if (res.data.success && res.data.data) {
        setAiGeneratedData(res.data.data);
        const sub = subjects.find(s => s.id === aiSubjectId);
        setAiQuizTitle(
          `${sub ? sub.code + ' - ' : ''}${aiTopic} (${aiDifficulty.toLowerCase()} ${aiQuestionType === 'TRUE_FALSE' ? 'T/F' : 'MCQ'})`
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI quiz generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleRegenerateQuestion = async (idx: number) => {
    if (!aiGeneratedData || regeneratingIndex !== null) return;
    const currentQ = aiGeneratedData.questions[idx];
    setRegeneratingIndex(idx);
    try {
      const res = await AIServiceClient.regenerateQuestion({
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
        subjectId: aiSubjectId || undefined,
        moduleId: aiModuleId || undefined,
        questionType: aiQuestionType,
        avoidQuestionText: currentQ?.question,
      });
      if (res.data.success && res.data.data) {
        const updatedQuestions = [...aiGeneratedData.questions];
        updatedQuestions[idx] = res.data.data;
        setAiGeneratedData({
          ...aiGeneratedData,
          questions: updatedQuestions,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to regenerate question');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleDeleteQuestion = (idx: number) => {
    if (!aiGeneratedData) return;
    const updated = aiGeneratedData.questions.filter((_, i) => i !== idx);
    setAiGeneratedData({
      ...aiGeneratedData,
      questions: updated,
    });
    if (editingIndex === idx) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleUpdateQuestion = (idx: number, updatedFields: any) => {
    if (!aiGeneratedData) return;
    const updated = [...aiGeneratedData.questions];
    updated[idx] = { ...updated[idx], ...updatedFields };
    setAiGeneratedData({
      ...aiGeneratedData,
      questions: updated,
    });
  };

  const handleAddManualQuestion = () => {
    if (!aiGeneratedData) return;
    const isTF = aiQuestionType === 'TRUE_FALSE';
    const newQ = {
      question: '',
      options: isTF ? ['True', 'False'] : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: isTF ? 'True' : 'Option A',
      explanation: '',
      difficulty: aiDifficulty,
    };
    const newIndex = aiGeneratedData.questions.length;
    setAiGeneratedData({
      ...aiGeneratedData,
      questions: [...aiGeneratedData.questions, newQ],
    });
    setEditingIndex(newIndex);
  };

  const handleSaveQuiz = async (publish: boolean) => {
    if (!aiGeneratedData || !aiSubjectId || !aiQuizTitle.trim()) return;
    if (!aiGeneratedData.questions || aiGeneratedData.questions.length === 0) {
      alert('Please add or generate at least one question.');
      return;
    }

    for (let i = 0; i < aiGeneratedData.questions.length; i++) {
      const q = aiGeneratedData.questions[i];
      if (!q.question || !q.question.trim()) {
        alert(`Question #${i + 1} has empty question text. Please provide question text or delete it.`);
        return;
      }
      if (!Array.isArray(q.options) || q.options.some((opt: string) => !opt || !opt.trim())) {
        alert(`Question #${i + 1} has one or more empty options. Please fill all options.`);
        return;
      }
      if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        alert(`Question #${i + 1} correct answer "${q.correctAnswer}" must match one of the options.`);
        return;
      }
    }

    setSavingQuiz(true);
    try {
      const questionsPayload = aiGeneratedData.questions.map((q: any) => ({
        questionText: q.question.trim(),
        questionType:
          q.options?.length === 2 && (q.options.includes('True') || q.options.includes('true'))
            ? 'TRUE_FALSE'
            : 'MULTIPLE_CHOICE',
        options: q.options.map((opt: string) => opt.trim()),
        correctAnswer: q.correctAnswer.trim(),
        marks: 5,
      }));

      await QuizService.createQuiz({
        title: aiQuizTitle.trim(),
        description: `AI-generated assessment for ${aiTopic} (${aiDifficulty} level). Includes explanations.`,
        subjectId: aiSubjectId,
        timeLimitMinutes: Math.max(aiGeneratedData.questions.length * 3, 10),
        totalMarks: aiGeneratedData.questions.length * 5,
        isPublished: publish,
        questions: questionsPayload,
      });

      setShowAiModal(false);
      setAiGeneratedData(null);
      setAiTopic('');
      setAiModuleId('');
      setEditingIndex(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${publish ? 'publish' : 'save'} quiz`);
    } finally {
      setSavingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quizzes & Assessments</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isFacultyOrAdmin
              ? 'Manage assessments, create timed tests, or generate instant quizzes with Gemini'
              : 'Attempt quizzes and track your test scores'}
          </p>
        </div>

        {isFacultyOrAdmin && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowAiModal(true);
                setAiGeneratedData(null);
              }}
              className="inline-flex items-center rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> AI Quiz Generator
            </button>
          </div>
        )}
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No quizzes available</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isFacultyOrAdmin
              ? 'Use the AI Quiz Generator above to create an instant assessment.'
              : 'No quizzes have been published for your enrolled subjects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => {
            const attempted = Array.isArray(quiz.attempts) && quiz.attempts.length > 0;
            const myAttempt = (quiz.attempts || [])[0];

            return (
              <div
                key={quiz.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition hover:border-brand-300"
              >
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                      {quiz.subject?.code}
                    </span>
                    {!quiz.isPublished && <Badge variant="neutral">Draft</Badge>}
                    {attempted ? (
                      <Badge variant="success">Attempted</Badge>
                    ) : (
                      quiz.isPublished && <Badge variant="primary">Available</Badge>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                  )}

                  <div className="mt-4 flex items-center flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3.5 w-3.5" /> {quiz.timeLimitMinutes} min
                    </span>
                    <span>{quiz._count?.questions || (quiz.questions || []).length} Questions</span>
                    <span>{quiz.totalMarks} Marks</span>
                  </div>

                  {myAttempt && (
                    <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs">
                      <span className="font-bold text-emerald-800">
                        Your Score: {myAttempt.score} / {quiz.totalMarks}
                      </span>
                      <span className="ml-2 text-emerald-600">
                        ({Math.round((myAttempt.score / quiz.totalMarks) * 100)}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  {isFacultyOrAdmin ? (
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>{quiz._count?.attempts || (quiz.attempts || []).length} Attempts</span>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    {!isFacultyOrAdmin && !attempted && quiz.isPublished && (
                      <button
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700"
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Start Quiz
                      </button>
                    )}
                    {(isFacultyOrAdmin || attempted) && (
                      <button
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Quiz Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-purple-50/50">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Quiz Generator</h3>
                  <p className="text-xs text-slate-500">
                    Generate strict structured questions via Gemini with Question Bank caching & review workflow.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setEditingIndex(null);
                }}
              >
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Controls */}
              <form onSubmit={handleGenerateAiQuiz} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700">Course / Subject</label>
                  <select
                    value={aiSubjectId}
                    onChange={e => {
                      setAiSubjectId(e.target.value);
                      setAiModuleId('');
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Module (Optional)</label>
                  <select
                    value={aiModuleId}
                    onChange={e => setAiModuleId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">All Modules / General</option>
                    {(subjects.find(s => s.id === aiSubjectId)?.modules || []).map((m, idx) => (
                      <option key={m.id} value={m.id}>
                        Module {idx + 1}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Topic</label>
                  <input
                    required
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="e.g. Graph Traversal / Trees"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={e => setAiDifficulty(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Question Type</label>
                  <select
                    value={aiQuestionType}
                    onChange={e => setAiQuestionType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Number of Questions</label>
                  <select
                    value={aiQuestionCount}
                    onChange={e => setAiQuestionCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div className="sm:col-span-2 md:col-span-3 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={aiGenerating || !aiTopic.trim()}
                    className="inline-flex items-center rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                    {aiGenerating ? 'Generating with Gemini...' : 'Generate Questions'}
                  </button>
                </div>
              </form>

              {/* Generated Questions Preview */}
              {aiGeneratedData && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  {/* Status Banner */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-800">
                        {aiGeneratedData.questions.length} Questions
                      </span>
                      {aiGeneratedData.reusedFromBank > 0 && (
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <Database className="mr-1 h-3 w-3" />
                          {aiGeneratedData.reusedFromBank} from Question Bank
                        </span>
                      )}
                      {aiGeneratedData.newlyGenerated > 0 && (
                        <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                          <Sparkles className="mr-1 h-3 w-3" />
                          {aiGeneratedData.newlyGenerated} via Gemini
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Source: <strong>{aiGeneratedData.source}</strong>
                    </div>
                  </div>

                  {/* Editable Quiz Title before saving */}
                  <div>
                    <label className="text-xs font-bold text-slate-700">Quiz Title</label>
                    <input
                      value={aiQuizTitle}
                      onChange={e => setAiQuizTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* List of Questions with Edit / Delete / Regenerate */}
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {aiGeneratedData.questions.map((q: any, idx: number) => {
                      const isEditing = editingIndex === idx;
                      const isRegenerating = regeneratingIndex === idx;

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-4 text-xs space-y-3 transition ${
                            isEditing
                              ? 'border-brand-500 bg-blue-50/20 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {isEditing ? (
                            /* INLINE EDIT MODE */
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-brand-700">Editing Question #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(null)}
                                  className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-700"
                                >
                                  <Check className="mr-1 h-3 w-3" /> Done
                                </button>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-600">Question Text</label>
                                <textarea
                                  rows={2}
                                  value={q.question}
                                  onChange={e => handleUpdateQuestion(idx, { question: e.target.value })}
                                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-brand-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                  Options (Select the radio to mark the correct answer)
                                </label>
                                <div className="space-y-2">
                                  {(q.options || []).map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name={`correct-${idx}`}
                                        checked={q.correctAnswer === opt}
                                        onChange={() => handleUpdateQuestion(idx, { correctAnswer: opt })}
                                        className="accent-emerald-600 h-4 w-4 shrink-0"
                                      />
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={e => {
                                          const newOpts = [...q.options];
                                          const oldVal = newOpts[optIdx];
                                          newOpts[optIdx] = e.target.value;
                                          const update: any = { options: newOpts };
                                          if (q.correctAnswer === oldVal) {
                                            update.correctAnswer = e.target.value;
                                          }
                                          handleUpdateQuestion(idx, update);
                                        }}
                                        className="flex-1 rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:border-brand-500 focus:outline-none"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-600">Explanation</label>
                                <input
                                  type="text"
                                  value={q.explanation || ''}
                                  onChange={e => handleUpdateQuestion(idx, { explanation: e.target.value })}
                                  placeholder="Explanation for the correct answer..."
                                  className="mt-1 w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:border-brand-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            /* DISPLAY / REVIEW MODE */
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-slate-900 leading-snug">
                                  <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                                  {q.question}
                                </p>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                    {q.difficulty}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                                {(q.options || []).map((opt: string, optIdx: number) => {
                                  const isCorrect = opt === q.correctAnswer;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                        isCorrect
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                                          : 'border-slate-200 bg-white text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center overflow-hidden">
                                        <span className="font-mono text-[11px] text-slate-400 mr-1.5 shrink-0">
                                          {String.fromCharCode(65 + optIdx)}.
                                        </span>
                                        <span className="truncate">{opt}</span>
                                      </div>
                                      {isCorrect && (
                                        <Check className="h-3.5 w-3.5 ml-1 text-emerald-600 shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {q.explanation && (
                                <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg mt-2.5 border border-slate-100">
                                  💡 <strong>Explanation:</strong> {q.explanation}
                                </p>
                              )}

                              {/* Question Action Bar */}
                              <div className="mt-3 flex items-center justify-end space-x-2 border-t border-slate-100 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(idx)}
                                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                  <Pencil className="mr-1 h-3 w-3" /> Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={isRegenerating || regeneratingIndex !== null}
                                  onClick={() => handleRegenerateQuestion(idx)}
                                  className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 transition disabled:opacity-50"
                                >
                                  <RefreshCw className={`mr-1 h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(idx)}
                                  className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 transition"
                                >
                                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Manual Question Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAddManualQuestion}
                      className="w-full py-2.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center justify-center transition"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Manual Question
                    </button>
                  </div>

                  {/* Modal Action Buttons: Cancel, Save as Draft, Publish */}
                  <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSaveQuiz(false)}
                        disabled={savingQuiz || !aiQuizTitle.trim() || aiGeneratedData.questions.length === 0}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-xs"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                        {savingQuiz ? 'Saving...' : 'Save as Draft'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveQuiz(true)}
                        disabled={savingQuiz || !aiQuizTitle.trim() || aiGeneratedData.questions.length === 0}
                        className="inline-flex items-center rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        {savingQuiz ? 'Publishing...' : 'Publish to Live Quizzes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Attempt Modal (Student Player) */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Quiz Header */}
            <div className="rounded-t-2xl bg-gradient-to-r from-brand-900 to-indigo-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-brand-300">{activeQuiz.subject?.code}</span>
                  <h2 className="text-lg font-bold mt-0.5">{activeQuiz.title}</h2>
                </div>
                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setResult(null);
                  }}
                >
                  <X className="h-5 w-5 text-white/70 hover:text-white" />
                </button>
              </div>
              <div className="flex items-center space-x-4 mt-3 text-xs text-blue-200">
                <span>
                  <Clock className="inline h-3.5 w-3.5 mr-1" />
                  {activeQuiz.timeLimitMinutes} minutes
                </span>
                <span>{(activeQuiz.questions || []).length} Questions</span>
                <span>{activeQuiz.totalMarks} Total Marks</span>
              </div>
            </div>

            {/* Result View */}
            {result ? (
              <div className="p-8 text-center">
                <div
                  className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center text-2xl font-extrabold mb-4 ${
                    result.score / result.total >= 0.6
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {Math.round((result.score / result.total) * 100)}%
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {result.score >= result.total * 0.6 ? '🎉 Well Done!' : '📚 Keep Practicing!'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  You scored <span className="font-bold text-brand-700">{result.score}</span> out of{' '}
                  <span className="font-bold">{result.total}</span> marks.
                </p>
                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setResult(null);
                  }}
                  className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                >
                  Close & Return
                </button>
              </div>
            ) : (
              /* Questions */
              <div className="p-6">
                {(activeQuiz.questions || []).length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">
                    No questions available for this quiz.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {(activeQuiz.questions || []).map((q, idx) => (
                      <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start space-x-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{q.questionText}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {q.marks} mark{q.marks !== 1 ? 's' : ''}
                            </p>

                            <div className="mt-3 space-y-2">
                              {(q.options || []).map((option, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={`flex items-center space-x-2.5 rounded-lg border p-3 cursor-pointer transition ${
                                    answers[q.id] === String(optIdx)
                                      ? 'border-brand-500 bg-brand-50'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={String(optIdx)}
                                    checked={answers[q.id] === String(optIdx)}
                                    onChange={() =>
                                      setAnswers(prev => ({ ...prev, [q.id]: String(optIdx) }))
                                    }
                                    className="accent-brand-600"
                                  />
                                  <span className="text-sm text-slate-800">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Submit */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {Object.keys(answers).length} of {(activeQuiz.questions || []).length} answered
                      </span>
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={submitting}
                        className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
