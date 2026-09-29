// src/pages/app/QuizzesPage.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QuizService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Quiz, Question } from '../../types';
import { Badge } from '../../components/common/Badge';
import { HelpCircle, Clock, CheckCircle2, Play, Eye, X, ChevronRight } from 'lucide-react';

export const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subjectIdFilter = searchParams.get('subjectId') || '';
  const isFacultyOrAdmin = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Active quiz attempt
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await QuizService.getQuizzes(subjectIdFilter ? { subjectId: subjectIdFilter } : {});
      if (res.data.success) setQuizzes(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [subjectIdFilter]);

  const handleStartQuiz = async (quizId: string) => {
    try {
      const res = await QuizService.getQuizById(quizId);
      if (res.data.success) {
        setActiveQuiz(res.data.data);
        setAnswers({});
        setResult(null);
      }
    } catch (err) { console.error(err); }
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

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quizzes & Assessments</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isFacultyOrAdmin ? 'Manage quizzes and track student performance' : 'Attempt quizzes and view your scores'}
          </p>
        </div>
        {isFacultyOrAdmin && (
          <Link to="/app/quizzes/new"
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700">
            + Create Quiz
          </Link>
        )}
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No quizzes available</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isFacultyOrAdmin ? 'Create your first quiz to assess students.' : 'No quizzes have been published for your enrolled subjects.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => {
            const attempted = Array.isArray(quiz.attempts) && quiz.attempts.length > 0;
            const myAttempt = (quiz.attempts || [])[0];

            return (
              <div key={quiz.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition hover:border-brand-300">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                      {quiz.subject?.code}
                    </span>
                    {!quiz.isPublished && <Badge variant="neutral">Draft</Badge>}
                    {attempted ? <Badge variant="success">Attempted</Badge> : quiz.isPublished && <Badge variant="primary">Available</Badge>}
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                  {quiz.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{quiz.description}</p>}

                  <div className="mt-4 flex items-center flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center"><Clock className="mr-1 h-3.5 w-3.5" /> {quiz.timeLimitMinutes} min</span>
                    <span>{quiz._count?.questions || (quiz.questions || []).length} Questions</span>
                    <span>{quiz.totalMarks} Marks</span>
                  </div>

                  {myAttempt && (
                    <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs">
                      <span className="font-bold text-emerald-800">Your Score: {myAttempt.score} / {quiz.totalMarks}</span>
                      <span className="ml-2 text-emerald-600">({Math.round((myAttempt.score / quiz.totalMarks) * 100)}%)</span>
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
                      <button onClick={() => handleStartQuiz(quiz.id)}
                        className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700">
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Start Quiz
                      </button>
                    )}
                    {(isFacultyOrAdmin || attempted) && (
                      <button onClick={() => handleStartQuiz(quiz.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
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

      {/* Quiz Attempt Modal */}
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
                <button onClick={() => { setActiveQuiz(null); setResult(null); }}>
                  <X className="h-5 w-5 text-white/70 hover:text-white" />
                </button>
              </div>
              <div className="flex items-center space-x-4 mt-3 text-xs text-blue-200">
                <span><Clock className="inline h-3.5 w-3.5 mr-1" />{activeQuiz.timeLimitMinutes} minutes</span>
                <span>{(activeQuiz.questions || []).length} Questions</span>
                <span>{activeQuiz.totalMarks} Total Marks</span>
              </div>
            </div>

            {/* Result View */}
            {result ? (
              <div className="p-8 text-center">
                <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center text-2xl font-extrabold mb-4 ${
                  result.score / result.total >= 0.6
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
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
                  onClick={() => { setActiveQuiz(null); setResult(null); }}
                  className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
                  Close & Return
                </button>
              </div>
            ) : (
              /* Questions */
              <div className="p-6">
                {(activeQuiz.questions || []).length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">No questions available for this quiz.</p>
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
                            <p className="text-xs text-slate-400 mt-0.5">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>

                            <div className="mt-3 space-y-2">
                              {(q.options || []).map((option, optIdx) => (
                                <label key={optIdx}
                                  className={`flex items-center space-x-2.5 rounded-lg border p-3 cursor-pointer transition ${
                                    answers[q.id] === String(optIdx)
                                      ? 'border-brand-500 bg-brand-50'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                  }`}>
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={String(optIdx)}
                                    checked={answers[q.id] === String(optIdx)}
                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: String(optIdx) }))}
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
                      <button onClick={handleSubmitQuiz} disabled={submitting}
                        className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50">
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
