// src/pages/app/AssignmentsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssignmentService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Assignment } from '../../types';
import { Badge } from '../../components/common/Badge';
import { FileText, Clock, Plus, X, AlertCircle, CheckCircle2, Upload } from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subjectIdFilter = searchParams.get('subjectId') || '';

  const isFacultyOrAdmin = user?.role === 'ADMIN' || user?.role === 'FACULTY';
  const isStudent = user?.role === 'STUDENT' || user?.role === 'CR';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit modal state
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Grade modal state
  const [gradeTarget, setGradeTarget] = useState<any>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await AssignmentService.getAssignments(subjectIdFilter ? { subjectId: subjectIdFilter } : {});
      if (res.data.success) setAssignments(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [subjectIdFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTarget) return;
    setSubmitting(true);
    try {
      await AssignmentService.submitAssignment(submitTarget.id, {
        content: submitContent,
        fileUrl: submitUrl || undefined,
      });
      setSubmitTarget(null);
      setSubmitContent(''); setSubmitUrl('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeTarget) return;
    setGrading(true);
    try {
      await AssignmentService.gradeSubmission(gradeTarget.id, {
        marksObtained: Number(gradeMarks),
        feedback: gradeFeedback,
      });
      setGradeTarget(null);
      setGradeMarks(''); setGradeFeedback('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Grading failed');
    } finally { setGrading(false); }
  };

  const getStatusBadge = (assignment: Assignment) => {
    const sub = (assignment.submissions || [])[0];
    if (!sub) return <Badge variant="warning">Not Submitted</Badge>;
    if (sub.status === 'GRADED') return <Badge variant="success">Graded</Badge>;
    if (sub.status === 'LATE') return <Badge variant="danger">Late</Badge>;
    return <Badge variant="info">Submitted</Badge>;
  };

  const isDue = (date: string) => new Date(date) < new Date();

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isFacultyOrAdmin ? 'Manage coursework and grade student submissions' : 'View and submit your coursework'}
          </p>
        </div>
        {isFacultyOrAdmin && (
          <Link to="/app/assignments/new"
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition">
            <Plus className="mr-1.5 h-4 w-4" /> Create Assignment
          </Link>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No assignments found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isFacultyOrAdmin ? 'Create an assignment to get started.' : 'No assignments have been posted for your subjects yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const sub = (assignment.submissions || [])[0];
            const overdue = isDue(assignment.dueDate) && !sub;

            return (
              <div key={assignment.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                        {assignment.subject?.code}
                      </span>
                      {overdue && <Badge variant="danger">Overdue</Badge>}
                      {isStudent && getStatusBadge(assignment)}
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900">{assignment.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{assignment.description}</p>

                    <div className="mt-3 flex items-center flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center">
                        <Clock className={`mr-1 h-3.5 w-3.5 ${overdue ? 'text-rose-500' : 'text-slate-400'}`} />
                        Due: {new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center">
                        <AlertCircle className="mr-1 h-3.5 w-3.5 text-slate-400" />
                        Total Marks: {assignment.totalMarks}
                      </span>
                      {isFacultyOrAdmin && (
                        <span className="flex items-center">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                          {(assignment._count?.submissions || assignment.submissions?.length || 0)} Submissions
                        </span>
                      )}
                    </div>

                    {/* Student: show grade if graded */}
                    {isStudent && sub?.grade && (
                      <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">
                            Score: {sub.grade.marksObtained} / {assignment.totalMarks}
                          </span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {sub.grade.feedback && (
                          <p className="mt-1 text-emerald-700 italic">"{sub.grade.feedback}"</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    {isStudent && !sub && (
                      <button onClick={() => setSubmitTarget(assignment)}
                        className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition">
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit
                      </button>
                    )}

                    {isFacultyOrAdmin && (assignment.submissions || []).length > 0 && (
                      <div className="space-y-1">
                        {(assignment.submissions || [])
                          .filter((s: any) => s.status !== 'GRADED')
                          .slice(0, 2)
                          .map((s: any) => (
                            <button
                              key={s.id}
                              onClick={() => { setGradeTarget(s); setGradeMarks(''); setGradeFeedback(''); }}
                              className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition">
                              Grade {s.student?.user?.name?.split(' ')[0]}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Assignment Modal */}
      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Submit Assignment</h3>
                <p className="text-xs text-slate-500">{submitTarget.title}</p>
              </div>
              <button onClick={() => setSubmitTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Your Answer / Notes</label>
                <textarea
                  value={submitContent}
                  onChange={e => setSubmitContent(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Write your solution, explanation, or key points here..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Repository / File Link (Optional)</label>
                <input
                  value={submitUrl}
                  onChange={e => setSubmitUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="https://github.com/your-repo or Google Drive link"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setSubmitTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || (!submitContent && !submitUrl)}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {gradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grade Submission</h3>
                <p className="text-xs text-slate-500">Student: {gradeTarget.student?.user?.name}</p>
              </div>
              <button onClick={() => setGradeTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {gradeTarget.content && (
              <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                <p className="font-bold text-slate-500 mb-1">Submitted Answer:</p>
                <p className="line-clamp-4">{gradeTarget.content}</p>
                {gradeTarget.fileUrl && (
                  <a href={gradeTarget.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 text-brand-600 font-bold block hover:underline">
                    View Attached Repository →
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleGrade} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Marks Awarded</label>
                <input type="number" required min="0" value={gradeMarks}
                  onChange={e => setGradeMarks(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. 87" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Feedback for Student</label>
                <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Great work on the implementation! Consider..." />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setGradeTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={grading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {grading ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
