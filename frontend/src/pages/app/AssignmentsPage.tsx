// src/pages/app/AssignmentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AssignmentService, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Assignment, Subject, AssignmentSubmission, SubmissionSimilarityPair, MatchedPassage } from '../../types';
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
  Scale,
  RefreshCw,
  Sliders,
  Eye,
  FileCode,
  Check,
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

  // Similarity Detection State (Faculty / Admin)
  const [similarityAssignment, setSimilarityAssignment] = useState<Assignment | null>(null);
  const [similarityPairs, setSimilarityPairs] = useState<SubmissionSimilarityPair[]>([]);
  const [loadingSimilarity, setLoadingSimilarity] = useState(false);
  const [selectedPair, setSelectedPair] = useState<SubmissionSimilarityPair | null>(null);
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [similaritySearch, setSimilaritySearch] = useState('');
  const [thresholdHigh, setThresholdHigh] = useState(80);
  const [thresholdMedium, setThresholdMedium] = useState(50);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [recalculatingSimilarity, setRecalculatingSimilarity] = useState(false);

  // Quick grading inside comparison view
  const [gradeFormA, setGradeFormA] = useState<{ marks: string; feedback: string; saving: boolean }>({ marks: '', feedback: '', saving: false });
  const [gradeFormB, setGradeFormB] = useState<{ marks: string; feedback: string; saving: boolean }>({ marks: '', feedback: '', saving: false });

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenSimilarity = async (assignment: Assignment) => {
    setSimilarityAssignment(assignment);
    setLoadingSimilarity(true);
    try {
      const res = await AssignmentService.getAssignmentSimilarity(assignment.id);
      if (res.data.success) {
        setSimilarityPairs(res.data.data.pairs || []);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to load similarity analysis');
    } finally {
      setLoadingSimilarity(false);
    }
  };

  const handleRecalculateSimilarity = async () => {
    if (!similarityAssignment) return;
    setRecalculatingSimilarity(true);
    try {
      const res = await AssignmentService.recalculateSimilarity(similarityAssignment.id);
      if (res.data.success) {
        showToast('success', 'Similarity analysis recalculated successfully!');
        const fresh = await AssignmentService.getAssignmentSimilarity(similarityAssignment.id);
        if (fresh.data.success) {
          setSimilarityPairs(fresh.data.data.pairs || []);
        }
        load();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to recalculate similarity');
    } finally {
      setRecalculatingSimilarity(false);
    }
  };

  const handleOpenPairComparison = (pair: SubmissionSimilarityPair) => {
    setSelectedPair(pair);
    setGradeFormA({
      marks: pair.submissionA.grade?.marksObtained !== undefined ? String(pair.submissionA.grade.marksObtained) : '',
      feedback: pair.submissionA.grade?.feedback || '',
      saving: false,
    });
    setGradeFormB({
      marks: pair.submissionB.grade?.marksObtained !== undefined ? String(pair.submissionB.grade.marksObtained) : '',
      feedback: pair.submissionB.grade?.feedback || '',
      saving: false,
    });
  };

  const handleSaveGradeFromComparison = async (submissionId: string, side: 'A' | 'B') => {
    const form = side === 'A' ? gradeFormA : gradeFormB;
    const marksNum = Number(form.marks);
    if (isNaN(marksNum) || form.marks.trim() === '') {
      showToast('error', 'Please enter a valid numeric grade.');
      return;
    }

    if (side === 'A') setGradeFormA(prev => ({ ...prev, saving: true }));
    else setGradeFormB(prev => ({ ...prev, saving: true }));

    try {
      await AssignmentService.gradeSubmission(submissionId, {
        marksObtained: marksNum,
        feedback: form.feedback.trim() || undefined,
      });

      showToast('success', `Grade saved successfully for Student ${side}!`);

      if (selectedPair) {
        const updatedPair = { ...selectedPair };
        if (side === 'A') {
          updatedPair.submissionA.grade = {
            id: `temp-${Date.now()}`,
            submissionId,
            marksObtained: marksNum,
            feedback: form.feedback.trim() || undefined,
            gradedById: user?.id || '',
            gradedAt: new Date().toISOString(),
          };
        } else {
          updatedPair.submissionB.grade = {
            id: `temp-${Date.now()}`,
            submissionId,
            marksObtained: marksNum,
            feedback: form.feedback.trim() || undefined,
            gradedById: user?.id || '',
            gradedAt: new Date().toISOString(),
          };
        }
        setSelectedPair(updatedPair);
      }
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save grade');
    } finally {
      if (side === 'A') setGradeFormA(prev => ({ ...prev, saving: false }));
      else setGradeFormB(prev => ({ ...prev, saving: false }));
    }
  };

  const highlightMatchingPassages = (text: string, passages: MatchedPassage[], isSideA: boolean) => {
    if (!text || text.trim().length === 0) return <span className="italic text-slate-400">No textual content</span>;
    if (!passages || passages.length === 0) return <>{text}</>;

    const snippets = passages
      .map(p => (isSideA ? p.textA : p.textB).trim())
      .filter(s => s.length > 5);

    if (snippets.length === 0) return <>{text}</>;

    const escaped = snippets.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    try {
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return (
        <>
          {parts.map((part, i) => {
            const isMatch = snippets.some(s => s.toLowerCase() === part.toLowerCase());
            return isMatch ? (
              <mark key={i} className="bg-amber-200 text-amber-950 font-semibold px-1 py-0.5 rounded shadow-2xs">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            );
          })}
        </>
      );
    } catch {
      return <>{text}</>;
    }
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

                    {/* Faculty Action Buttons */}
                    {isFacultyOrAdmin && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setReviewAssignment(assignment)}
                          className="inline-flex items-center rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                        >
                          <User className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                          Submissions ({submissionsList.length})
                        </button>
                        <button
                          onClick={() => handleOpenSimilarity(assignment)}
                          className="inline-flex items-center rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-2xs"
                        >
                          <Scale className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                          Similarity Detection
                        </button>
                      </div>
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

      {/* ======================================================== */}
      {/* MODAL 4: Similarity Detection & Analysis (Faculty / Admin) */}
      {/* ======================================================== */}
      {similarityAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0 flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {similarityAssignment.subject?.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{similarityAssignment.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coursework Similarity Cross-Check &bull; Only compares submissions within this assignment
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRecalculateSimilarity}
                  disabled={recalculatingSimilarity}
                  className="inline-flex items-center rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition shadow-2xs"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${recalculatingSimilarity ? 'animate-spin' : ''}`} />
                  {recalculatingSimilarity ? 'Recalculating...' : 'Recalculate Similarity'}
                </button>
                <button
                  onClick={() => setSimilarityAssignment(null)}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Advisory Banner */}
            <div className="my-4 rounded-xl bg-purple-50/70 border border-purple-100 p-3.5 text-xs text-purple-900 flex items-start space-x-2.5 shrink-0">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Academic Similarity Indicator Notice</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  This system uses normalized n-gram shingling & TF-IDF cosine similarity to identify shared passages between peer submissions for this assignment. Results are advisory metrics to assist faculty review and must never be treated as automated plagiarism verdicts.
                </p>
              </div>
            </div>

            {/* Controls Bar: Filters, Search, Threshold Config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => setRiskFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    riskFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Pairs ({similarityPairs.length})
                </button>
                <button
                  onClick={() => setRiskFilter('HIGH')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    riskFilter === 'HIGH'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  High Risk (≥{thresholdHigh}%) &bull;{' '}
                  {similarityPairs.filter(p => p.similarityScore >= thresholdHigh).length}
                </button>
                <button
                  onClick={() => setRiskFilter('MEDIUM')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    riskFilter === 'MEDIUM'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Medium ({thresholdMedium}–{thresholdHigh - 1}%) &bull;{' '}
                  {similarityPairs.filter(p => p.similarityScore >= thresholdMedium && p.similarityScore < thresholdHigh).length}
                </button>
                <button
                  onClick={() => setRiskFilter('LOW')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    riskFilter === 'LOW'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Low (&lt;{thresholdMedium}%) &bull;{' '}
                  {similarityPairs.filter(p => p.similarityScore < thresholdMedium).length}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={similaritySearch}
                    onChange={e => setSimilaritySearch(e.target.value)}
                    placeholder="Search student or roll #..."
                    className="w-48 sm:w-56 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                  className={`rounded-xl border p-2 text-xs transition ${
                    showThresholdConfig
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Configure Risk Thresholds"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Threshold Configuration Drawer */}
            {showThresholdConfig && (
              <div className="my-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="font-bold text-slate-700">High Risk Threshold (≥%):</label>
                    <input
                      type="number"
                      min={51}
                      max={99}
                      value={thresholdHigh}
                      onChange={e => setThresholdHigh(Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 bg-white py-1 px-2 text-center text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="font-bold text-slate-700">Medium Risk Threshold (≥%):</label>
                    <input
                      type="number"
                      min={10}
                      max={thresholdHigh - 1}
                      value={thresholdMedium}
                      onChange={e => setThresholdMedium(Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 bg-white py-1 px-2 text-center text-xs font-bold"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  Thresholds adjust visual review priorities only and do not alter student marks automatically.
                </span>
              </div>
            )}

            {/* Pairs Comparison List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {loadingSimilarity ? (
                <div className="py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-600 border-t-transparent mx-auto" />
                  <p className="mt-3 text-xs text-slate-500 font-medium">
                    Computing pairwise TF-IDF & shingling similarity...
                  </p>
                </div>
              ) : similarityPairs.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <Scale className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">At least 2 student submissions are needed</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Once multiple students submit work for this assignment, pairwise similarity analysis is automatically executed.
                  </p>
                </div>
              ) : (
                (() => {
                  const filtered = similarityPairs.filter(p => {
                    // Risk filter check against current threshold
                    let pairRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
                    if (p.similarityScore >= thresholdHigh) pairRisk = 'HIGH';
                    else if (p.similarityScore >= thresholdMedium) pairRisk = 'MEDIUM';

                    if (riskFilter !== 'ALL' && pairRisk !== riskFilter) return false;

                    // Search check
                    if (similaritySearch.trim().length > 0) {
                      const q = similaritySearch.trim().toLowerCase();
                      const nameA = p.submissionA?.student?.user?.name?.toLowerCase() || '';
                      const rollA = p.submissionA?.student?.rollNumber?.toLowerCase() || '';
                      const nameB = p.submissionB?.student?.user?.name?.toLowerCase() || '';
                      const rollB = p.submissionB?.student?.rollNumber?.toLowerCase() || '';
                      if (!nameA.includes(q) && !rollA.includes(q) && !nameB.includes(q) && !rollB.includes(q)) {
                        return false;
                      }
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No similarity pairs match the selected filters.
                      </div>
                    );
                  }

                  return filtered.map(pair => {
                    const isHigh = pair.similarityScore >= thresholdHigh;
                    const isMedium = pair.similarityScore >= thresholdMedium && !isHigh;

                    return (
                      <div
                        key={pair.id}
                        className={`rounded-2xl border p-4 transition shadow-2xs ${
                          isHigh
                            ? 'border-rose-300 bg-rose-50/30'
                            : isMedium
                            ? 'border-amber-200 bg-amber-50/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Student A */}
                          <div className="md:col-span-4 flex items-center space-x-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs">
                              {pair.submissionA.student?.user?.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-xs text-slate-900 truncate">
                                {pair.submissionA.student?.user?.name || 'Student A'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                Roll: {pair.submissionA.student?.rollNumber || 'N/A'}
                              </p>
                              {pair.submissionA.extractionStatus === 'SCANNED_IMAGE' && (
                                <span className="inline-block mt-0.5 rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-semibold">
                                  Scanned / Image PDF
                                </span>
                              )}
                              {pair.submissionA.fileUrl && (
                                <a
                                  href={pair.submissionA.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-[10px] text-brand-600 hover:underline mt-0.5"
                                >
                                  <ExternalLink className="mr-0.5 h-2.5 w-2.5" /> File Attached
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Center Similarity Metric */}
                          <div className="md:col-span-4 text-center py-1 border-y md:border-y-0 md:border-x border-slate-200/70">
                            <div className="inline-flex items-center space-x-1.5">
                              <span
                                className={`text-base font-extrabold px-3 py-0.5 rounded-full border ${
                                  isHigh
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : isMedium
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {pair.similarityScore}%
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isHigh ? 'text-rose-700' : isMedium ? 'text-amber-700' : 'text-emerald-700'
                                }`}
                              >
                                {isHigh ? 'High Risk' : isMedium ? 'Moderate' : 'Low'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {pair.matchedPassages.length} overlapping passage{pair.matchedPassages.length === 1 ? '' : 's'} identified
                            </p>
                          </div>

                          {/* Student B */}
                          <div className="md:col-span-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-xs">
                                {pair.submissionB.student?.user?.name?.[0]?.toUpperCase() || 'B'}
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-bold text-xs text-slate-900 truncate">
                                  {pair.submissionB.student?.user?.name || 'Student B'}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500">
                                  Roll: {pair.submissionB.student?.rollNumber || 'N/A'}
                                </p>
                                {pair.submissionB.extractionStatus === 'SCANNED_IMAGE' && (
                                  <span className="inline-block mt-0.5 rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-semibold">
                                    Scanned / Image PDF
                                  </span>
                                )}
                                {pair.submissionB.fileUrl && (
                                  <a
                                    href={pair.submissionB.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-[10px] text-brand-600 hover:underline mt-0.5"
                                  >
                                    <ExternalLink className="mr-0.5 h-2.5 w-2.5" /> File Attached
                                  </a>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenPairComparison(pair)}
                              className="ml-2 inline-flex items-center rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shrink-0 transition shadow-xs"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> Compare &amp; Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
              <button
                onClick={() => setSimilarityAssignment(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Similarity View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Side-by-Side Comparison & Manual Grading View */}
      {/* ======================================================== */}
      {selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="w-full max-w-6xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-4 max-h-[96vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm text-slate-900">
                  {selectedPair.submissionA.student?.user?.name}
                </span>
                <span className="text-slate-400 font-bold">&harr;</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedPair.submissionB.student?.user?.name}
                </span>
                <span
                  className={`text-xs font-extrabold px-3 py-0.5 rounded-full border ${
                    selectedPair.similarityScore >= thresholdHigh
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : selectedPair.similarityScore >= thresholdMedium
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {selectedPair.similarityScore}% Similarity
                </span>
              </div>
              <button
                onClick={() => setSelectedPair(null)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Overlapping Passages Drawer */}
            {selectedPair.matchedPassages.length > 0 && (
              <div className="my-3 rounded-xl bg-amber-50/50 border border-amber-200 p-3 shrink-0 max-h-32 overflow-y-auto text-xs">
                <span className="font-bold text-amber-900 block mb-1">
                  🔍 {selectedPair.matchedPassages.length} Matching Passage{selectedPair.matchedPassages.length === 1 ? '' : 's'} Highlighted Below:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-950 font-mono">
                  {selectedPair.matchedPassages.map((p, idx) => (
                    <li key={idx}>
                      &ldquo;{p.textA}&rdquo; <span className="text-amber-700">({p.length} words matched)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Side-by-Side Submissions Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto py-2 pr-1">
              {/* Left Column: Student A */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {selectedPair.submissionA.student?.user?.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">
                        Roll: {selectedPair.submissionA.student?.rollNumber} &bull; Submitted on{' '}
                        {new Date(selectedPair.submissionA.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedPair.submissionA.fileUrl && (
                      <a
                        href={selectedPair.submissionA.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-bold text-brand-600 hover:underline"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" /> File Link
                      </a>
                    )}
                  </div>

                  {(selectedPair.submissionA.extractionStatus === 'SCANNED_IMAGE' || selectedPair.submissionA.extractionStatus === 'FAILED') && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                      ⚠️ Text could not be extracted; similarity analysis may be incomplete.
                    </div>
                  )}

                  {/* Submission Content with Highlighted Passages */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Submitted Text (Matching passages highlighted):
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {highlightMatchingPassages(
                        selectedPair.submissionA.extractedText || selectedPair.submissionA.content || '',
                        selectedPair.matchedPassages,
                        true
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Manual Grading Box for Student A */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">Grade Student A:</span>
                    {selectedPair.submissionA.grade && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Current: {selectedPair.submissionA.grade.marksObtained} pts
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Marks"
                      value={gradeFormA.marks}
                      onChange={e => setGradeFormA({ ...gradeFormA, marks: e.target.value })}
                      className="w-20 rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-bold text-center focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Contextual feedback..."
                      value={gradeFormA.feedback}
                      onChange={e => setGradeFormA({ ...gradeFormA, feedback: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveGradeFromComparison(selectedPair.submissionA.id, 'A')}
                      disabled={gradeFormA.saving || !gradeFormA.marks.trim()}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shrink-0"
                    >
                      {gradeFormA.saving ? 'Saving...' : 'Save Grade'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Student B */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {selectedPair.submissionB.student?.user?.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">
                        Roll: {selectedPair.submissionB.student?.rollNumber} &bull; Submitted on{' '}
                        {new Date(selectedPair.submissionB.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedPair.submissionB.fileUrl && (
                      <a
                        href={selectedPair.submissionB.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-bold text-brand-600 hover:underline"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" /> File Link
                      </a>
                    )}
                  </div>

                  {(selectedPair.submissionB.extractionStatus === 'SCANNED_IMAGE' || selectedPair.submissionB.extractionStatus === 'FAILED') && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                      ⚠️ Text could not be extracted; similarity analysis may be incomplete.
                    </div>
                  )}

                  {/* Submission Content with Highlighted Passages */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Submitted Text (Matching passages highlighted):
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {highlightMatchingPassages(
                        selectedPair.submissionB.extractedText || selectedPair.submissionB.content || '',
                        selectedPair.matchedPassages,
                        false
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Manual Grading Box for Student B */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">Grade Student B:</span>
                    {selectedPair.submissionB.grade && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Current: {selectedPair.submissionB.grade.marksObtained} pts
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Marks"
                      value={gradeFormB.marks}
                      onChange={e => setGradeFormB({ ...gradeFormB, marks: e.target.value })}
                      className="w-20 rounded-lg border border-slate-300 py-1.5 px-2 text-xs font-bold text-center focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Contextual feedback..."
                      value={gradeFormB.feedback}
                      onChange={e => setGradeFormB({ ...gradeFormB, feedback: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveGradeFromComparison(selectedPair.submissionB.id, 'B')}
                      disabled={gradeFormB.saving || !gradeFormB.marks.trim()}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shrink-0"
                    >
                      {gradeFormB.saving ? 'Saving...' : 'Save Grade'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedPair(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
