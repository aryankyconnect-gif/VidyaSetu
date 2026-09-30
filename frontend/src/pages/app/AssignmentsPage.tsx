// src/pages/app/AssignmentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AssignmentService, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Assignment, Subject, AssignmentSubmission } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  FileText,
  Clock,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Upload,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  User,
  Search,
  BookOpen,
  Calendar,
  Lock,
  Sparkles,
} from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { id: paramAssignmentId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const subjectIdFilter = searchParams.get('subjectId') || '';

  const isFacultyOrAdmin = user?.role === 'ADMIN' || user?.role === 'FACULTY';
  const isStudent = user?.role === 'STUDENT' || user?.role === 'CR';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState(100);
  const [creating, setCreating] = useState(false);

  // Submit modal state (Student)
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Submissions Review Modal (Faculty)
  const [reviewAssignment, setReviewAssignment] = useState<Assignment | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [resAssignments, resSubjects] = await Promise.all([
        AssignmentService.getAssignments(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        AcademicService.getSubjects(),
      ]);

      if (resAssignments.data.success) {
        setAssignments(resAssignments.data.data);

        // If URL param specified an assignment, open review/focus on it
        if (paramAssignmentId) {
          const matched = resAssignments.data.data.find((a: Assignment) => a.id === paramAssignmentId);
          if (matched && isFacultyOrAdmin) {
            setReviewAssignment(matched);
          }
        }
      }

      if (resSubjects.data.success) {
        setSubjects(resSubjects.data.data);
        if (resSubjects.data.data.length > 0 && !newSubjectId) {
          setNewSubjectId(resSubjects.data.data[0].id);
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
  }, [subjectIdFilter, paramAssignmentId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubjectId || !newDueDate) return;

    setCreating(true);
    try {
      await AssignmentService.createAssignment({
        title: newTitle.trim(),
        description: newDescription.trim(),
        subjectId: newSubjectId,
        dueDate: new Date(newDueDate).toISOString(),
        totalMarks: Number(newTotalMarks) || 100,
        isPublished: true,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      showToast('success', 'Assignment published successfully!');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTarget) return;

    // Check deadline locking
    if (new Date() > new Date(submitTarget.dueDate)) {
      showToast('error', 'Submission deadline has passed. Submissions are locked.');
      return;
    }

    setSubmitting(true);
    try {
      await AssignmentService.submitAssignment(submitTarget.id, {
        content: submitContent,
        fileUrl: submitUrl || undefined,
      });

      setSubmitTarget(null);
      setSubmitContent('');
      setSubmitUrl('');
      showToast('success', 'Assignment submitted successfully! Similarity analysis completed.');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    if (!gradeMarks) return;
    setSavingGrade(true);
    try {
      await AssignmentService.gradeSubmission(submissionId, {
        marksObtained: Number(gradeMarks),
        feedback: gradeFeedback,
      });

      setGradingSubmissionId(null);
      setGradeMarks('');
      setGradeFeedback('');
      showToast('success', 'Grade and qualitative feedback recorded successfully!');

      // Reload assignments and update review modal
      const res = await AssignmentService.getAssignments(subjectIdFilter ? { subjectId: subjectIdFilter } : {});
      if (res.data.success) {
        setAssignments(res.data.data);
        if (reviewAssignment) {
          const updated = res.data.data.find((a: Assignment) => a.id === reviewAssignment.id);
          if (updated) setReviewAssignment(updated);
        }
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Grading failed');
    } finally {
      setSavingGrade(false);
    }
  };

  const isDue = (date: string) => new Date(date) < new Date();

  // Similarity Indicator Badge Helper
  const renderSimilarityIndicator = (score?: number, report?: string) => {
    if (score === undefined || score === null) {
      return (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          Not Analyzed
        </span>
      );
    }

    if (score < 25) {
      return (
        <div className="flex items-center space-x-1.5" title={report || 'Authentic original work'}>
          <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
            <ShieldCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" />
            {score}% Original (Low Similarity)
          </span>
        </div>
      );
    }

    if (score <= 50) {
      return (
        <div className="flex items-center space-x-1.5" title={report || 'Moderate similarity detected'}>
          <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-2xs">
            <AlertTriangle className="mr-1 h-3.5 w-3.5 text-amber-600" />
            {score}% Similarity (Moderate)
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1.5" title={report || 'High similarity detected'}>
        <span className="inline-flex items-center rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700 shadow-2xs">
          <ShieldAlert className="mr-1 h-3.5 w-3.5 text-rose-600" />
          {score}% High Similarity (Flagged)
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading coursework & submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-xl animate-in slide-in-from-bottom duration-200 ${
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Course Assignments</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isFacultyOrAdmin
              ? 'Publish course deliverables, inspect student submissions with similarity detection, and assign grades'
              : 'View deadlines, submit programming tasks & lab exercises, and inspect graded evaluations'}
          </p>
        </div>

        {isFacultyOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create Assignment
          </button>
        )}
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No assignments found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isFacultyOrAdmin
              ? 'Click "Create Assignment" above to publish your first coursework task.'
              : 'No assignments are currently pending for your enrolled subjects.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const sub = (assignment.submissions || [])[0];
            const overdue = isDue(assignment.dueDate) && !sub;
            const submissionsList = assignment.submissions || [];
            const isHighlighted = paramAssignmentId === assignment.id;

            return (
              <div
                key={assignment.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  isHighlighted
                    ? 'border-brand-500 ring-2 ring-brand-100'
                    : overdue
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                        {assignment.subject?.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {assignment.subject?.name}
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          <Lock className="mr-1 h-3 w-3" /> Deadline Locked
                        </span>
                      )}
                      {isStudent && (
                        sub ? (
                          sub.status === 'GRADED' ? (
                            <Badge variant="success">Graded ({sub.grade?.marksObtained}/{assignment.totalMarks})</Badge>
                          ) : sub.status === 'LATE' ? (
                            <Badge variant="danger">Late Submission</Badge>
                          ) : (
                            <Badge variant="info">Submitted</Badge>
                          )
                        ) : !overdue ? (
                          <Badge variant="warning">Pending Submission</Badge>
                        ) : null
                      )}
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900">{assignment.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{assignment.description}</p>

                    <div className="mt-3 flex items-center flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center">
                        <Clock className={`mr-1 h-3.5 w-3.5 ${overdue ? 'text-rose-500' : 'text-slate-400'}`} />
                        Due:{' '}
                        <strong className="ml-1 text-slate-700">
                          {new Date(assignment.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                      <span className="flex items-center">
                        <AlertCircle className="mr-1 h-3.5 w-3.5 text-slate-400" />
                        Max Marks: <strong className="ml-1 text-slate-700">{assignment.totalMarks}</strong>
                      </span>
                      {isFacultyOrAdmin && (
                        <span className="flex items-center font-bold text-brand-700">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                          {submissionsList.length} Student Submission{submissionsList.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    {/* Student: Show submission details if already submitted */}
                    {isStudent && sub && (
                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-700">Your Submitted Work:</span>
                          <span className="text-slate-400 text-[11px]">
                            Submitted on {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {sub.content && (
                          <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                            {sub.content}
                          </p>
                        )}
                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center font-bold text-brand-600 hover:underline pt-1"
                          >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Attached Repository / File
                          </a>
                        )}

                        {/* Similarity indicator for student */}
                        {sub.similarityScore !== undefined && sub.similarityScore !== null && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-slate-500">Academic Integrity Analysis:</span>
                            {renderSimilarityIndicator(sub.similarityScore, sub.similarityReport)}
                          </div>
                        )}

                        {/* Grade result */}
                        {sub.grade && (
                          <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-emerald-900 text-sm">
                                Final Score: {sub.grade.marksObtained} / {assignment.totalMarks}
                              </span>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            {sub.grade.feedback && (
                              <p className="mt-1 text-emerald-800 italic">
                                &ldquo;{sub.grade.feedback}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row lg:flex-col lg:items-end justify-between items-center gap-2 pt-2 lg:pt-0">
                    {/* Student Submit Button */}
                    {isStudent && !sub && (
                      overdue ? (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-right">
                          <p className="text-xs font-bold text-rose-700 flex items-center">
                            <Lock className="mr-1 h-3.5 w-3.5" /> Submissions Closed
                          </p>
                          <p className="text-[10px] text-rose-500">Past due date</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSubmitTarget(assignment)}
                          className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition"
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit Work
                        </button>
                      )
                    )}

                    {/* Faculty Review Button */}
                    {isFacultyOrAdmin && (
                      <button
                        onClick={() => setReviewAssignment(assignment)}
                        className="inline-flex items-center rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      >
                        <User className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                        Review Submissions ({submissionsList.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: Create Assignment (Faculty / Admin) */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Course Assignment</h3>
                <p className="text-xs text-slate-500">Publish coursework instructions and due dates for students</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject / Course</label>
                <select
                  required
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assignment Title</label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lab Exercise 3: Consensus Protocol Implementation"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Problem Statement & Instructions</label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed guidelines, required test cases, expected formats, and grading rubric..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Submission Deadline</label>
                  <input
                    required
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Marks</label>
                  <input
                    required
                    type="number"
                    min="10"
                    max="1000"
                    value={newTotalMarks}
                    onChange={(e) => setNewTotalMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
                >
                  {creating ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Submit Assignment (Student) */}
      {/* ======================================================== */}
      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Assignment Work</h3>
                <p className="text-xs text-slate-500">{submitTarget.subject?.code}: {submitTarget.title}</p>
              </div>
              <button onClick={() => setSubmitTarget(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-900 flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
              <span>
                All submissions undergo automatic token-level similarity and originality analysis before being routed to instructor review.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Written Response / Code / Implementation Notes
                </label>
                <textarea
                  required
                  value={submitContent}
                  onChange={(e) => setSubmitContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none font-mono"
                  placeholder="Paste your source code, algorithm explanation, or solutions here..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Repository URL / Cloud Document Link (Optional)
                </label>
                <input
                  type="url"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono"
                  placeholder="https://github.com/username/project or drive link"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !submitContent.trim()}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
                >
                  {submitting ? 'Submitting & Analyzing...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Review Submissions & Grading (Faculty / Admin) */}
      {/* ======================================================== */}
      {reviewAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {reviewAssignment.subject?.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{reviewAssignment.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Max Marks: {reviewAssignment.totalMarks} &bull; {(reviewAssignment.submissions || []).length} submissions received
                </p>
              </div>
              <button onClick={() => setReviewAssignment(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {(reviewAssignment.submissions || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  No students have submitted work for this assignment yet.
                </div>
              ) : (
                (reviewAssignment.submissions || []).map((sub: AssignmentSubmission) => {
                  const studentName = sub.student?.user?.name || 'Enrolled Student';
                  const studentEmail = sub.student?.user?.email;
                  const rollNo = sub.student?.rollNumber || 'N/A';
                  const isGraded = sub.status === 'GRADED';
                  const isCurrentlyGrading = gradingSubmissionId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-brand-300 shadow-2xs"
                    >
                      {/* Submission Header */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">{studentName}</span>
                            <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              Roll: {rollNo}
                            </span>
                            {sub.status === 'LATE' && <Badge variant="danger">Late</Badge>}
                            {isGraded && <Badge variant="success">Graded</Badge>}
                          </div>
                          {studentEmail && (
                            <p className="text-xs text-slate-400 mt-0.5">{studentEmail}</p>
                          )}
                        </div>

                        {/* Similarity Indicator in Submission Header */}
                        <div>
                          {renderSimilarityIndicator(sub.similarityScore, sub.similarityReport)}
                        </div>
                      </div>

                      {/* Submitted Answer Content */}
                      {sub.content && (
                        <div className="mt-3 rounded-xl bg-white border border-slate-200 p-3">
                          <p className="text-[11px] font-bold text-slate-500 mb-1">Student Submission Content:</p>
                          <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {sub.content}
                          </p>
                        </div>
                      )}

                      {sub.fileUrl && (
                        <div className="mt-2">
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs font-bold text-brand-600 hover:underline"
                          >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Attached Repository Link &rarr;
                          </a>
                        </div>
                      )}

                      {/* Existing Grade or Grade Action Form */}
                      {isGraded && !isCurrentlyGrading ? (
                        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-emerald-900 text-xs">
                              Graded Score: {sub.grade?.marksObtained} / {reviewAssignment.totalMarks}
                            </span>
                            {sub.grade?.feedback && (
                              <p className="text-xs text-emerald-800 italic mt-0.5">
                                &ldquo;{sub.grade.feedback}&rdquo;
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setGradingSubmissionId(sub.id);
                              setGradeMarks(String(sub.grade?.marksObtained || ''));
                              setGradeFeedback(sub.grade?.feedback || '');
                            }}
                            className="text-xs font-bold text-emerald-800 hover:underline bg-white px-2.5 py-1 rounded border border-emerald-300"
                          >
                            Edit Grade
                          </button>
                        </div>
                      ) : isCurrentlyGrading ? (
                        <div className="mt-3 rounded-xl bg-white border border-brand-200 p-3.5 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800">
                            Enter Grade for {studentName} (Max {reviewAssignment.totalMarks} Marks):
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">Marks Awarded</label>
                              <input
                                required
                                type="number"
                                min="0"
                                max={reviewAssignment.totalMarks}
                                value={gradeMarks}
                                onChange={(e) => setGradeMarks(e.target.value)}
                                placeholder="e.g. 92"
                                className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">Qualitative Feedback</label>
                              <input
                                value={gradeFeedback}
                                onChange={(e) => setGradeFeedback(e.target.value)}
                                placeholder="e.g. Exceptional implementation with clean unit tests!"
                                className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setGradingSubmissionId(null)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingGrade || !gradeMarks}
                              onClick={() => handleGrade(sub.id)}
                              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              {savingGrade ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-right">
                          <button
                            onClick={() => {
                              setGradingSubmissionId(sub.id);
                              setGradeMarks('');
                              setGradeFeedback('');
                            }}
                            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                          >
                            Grade Student
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
              <button
                onClick={() => setReviewAssignment(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
