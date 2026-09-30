// src/pages/app/SubjectDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AcademicService, ResourceService, AssignmentService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Subject, Resource, Assignment, Quiz, AssignmentSubmission } from '../../types';
import { PdfPreviewModal } from '../../components/common/PdfPreviewModal';
import { Badge } from '../../components/common/Badge';
import {
  BookOpen, FileText, HelpCircle, ChevronDown, ChevronRight,
  Download, Plus, X, Layers, Eye, ShieldAlert, Trash2, ArrowLeft,
  Video, BookMarked, ExternalLink, CheckCircle2, AlertCircle,
  Calendar, Clock, Upload, ShieldCheck, AlertTriangle, Lock,
  Play, Sparkles
} from 'lucide-react';

export const SubjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isStudent = user?.role === 'STUDENT' || user?.role === 'CR';
  const isFaculty = user?.role === 'FACULTY';
  const isAdmin = user?.role === 'ADMIN';

  // Active Tab: 'curriculum' | 'pyqs' | 'assignments' | 'quizzes'
  const activeTab = searchParams.get('tab') || 'curriculum';
  const setTab = (tab: string) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PDF Preview State
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  // PYQ Filter
  const [pyqYearFilter, setPyqYearFilter] = useState<string>('ALL');

  // Resource upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadType, setUploadType] = useState('PDF');
  const [uploadSize, setUploadSize] = useState('');
  const [uploadYear, setUploadYear] = useState<number | ''>('');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Module creation state
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleOrder, setNewModuleOrder] = useState(1);
  const [creatingModule, setCreatingModule] = useState(false);

  // Create Assignment State
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignTotalMarks, setAssignTotalMarks] = useState(100);
  const [creatingAssign, setCreatingAssign] = useState(false);

  // Submit Assignment State (Student)
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  const canManageSubject = isAdmin || (isFaculty && subject?.facultyId === user?.facultyProfile?.id);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);
      const res = await AcademicService.getSubjectById(id);
      if (res.data.success) {
        setSubject(res.data.data);
        if (res.data.data.modules?.length > 0) {
          setExpandedModules({ [res.data.data.modules[0].id]: true });
          setNewModuleOrder(res.data.data.modules.length + 1);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.response?.status || 500);
      setErrorMessage(err.response?.data?.message || 'Failed to load subject');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleModule = (mid: string) =>
    setExpandedModules(prev => ({ ...prev, [mid]: !prev[mid] }));

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUploading(true);
    try {
      await ResourceService.createResource({
        title: uploadTitle,
        fileUrl: uploadUrl,
        fileType: uploadType,
        fileSize: uploadSize || undefined,
        year: uploadYear ? Number(uploadYear) : undefined,
        isPublished: uploadPublished,
        description: uploadDescription || undefined,
        subjectId: id,
        moduleId: uploadModuleId || undefined,
      });

      setShowUpload(false);
      setUploadTitle('');
      setUploadUrl('');
      setUploadDescription('');
      setUploadSize('');
      setUploadYear('');
      showToast('success', 'Resource uploaded and published successfully!');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setCreatingModule(true);
    try {
      await AcademicService.createModule({
        title: newModuleTitle,
        description: newModuleDesc || undefined,
        orderIndex: Number(newModuleOrder),
        subjectId: id,
      });

      setShowAddModule(false);
      setNewModuleTitle('');
      setNewModuleDesc('');
      showToast('success', 'Module created successfully!');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create module');
    } finally {
      setCreatingModule(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !assignTitle.trim() || !assignDueDate) return;

    setCreatingAssign(true);
    try {
      await AssignmentService.createAssignment({
        title: assignTitle.trim(),
        description: assignDesc.trim(),
        dueDate: new Date(assignDueDate).toISOString(),
        totalMarks: Number(assignTotalMarks) || 100,
        subjectId: id,
        isPublished: true,
      });

      setShowCreateAssignment(false);
      setAssignTitle('');
      setAssignDesc('');
      setAssignDueDate('');
      showToast('success', 'Assignment published successfully!');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleSubmitAssignmentWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTarget) return;

    if (new Date() > new Date(submitTarget.dueDate)) {
      showToast('error', 'Submission deadline has passed. Submissions are locked.');
      return;
    }

    setSubmittingWork(true);
    try {
      await AssignmentService.submitAssignment(submitTarget.id, {
        content: submitContent,
        fileUrl: submitUrl || undefined,
      });

      setSubmitTarget(null);
      setSubmitContent('');
      setSubmitUrl('');
      showToast('success', 'Assignment submitted successfully with similarity analysis!');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Delete this module? Resources in it will be unlinked.')) return;
    try {
      await AcademicService.deleteModule(moduleId);
      showToast('success', 'Module deleted');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Delete failed');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Delete this resource permanently?')) return;
    try {
      await ResourceService.deleteResource(resourceId);
      showToast('success', 'Resource deleted');
      load();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Delete failed');
    }
  };

  const renderResourceBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'PDF') return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>;
    if (t === 'PPT' || t === 'SLIDES') return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SLIDES</span>;
    if (t === 'NOTES') return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">NOTES</span>;
    if (t === 'PYQ') return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">PYQ</span>;
    if (t === 'VIDEO') return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">VIDEO</span>;
    return <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded">LINK</span>;
  };

  const renderSimilarityBadge = (score?: number, report?: string) => {
    if (score === undefined || score === null) return null;
    if (score < 25) {
      return (
        <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700" title={report}>
          <ShieldCheck className="mr-1 h-3 w-3 text-emerald-600" />
          {score}% Original (Low)
        </span>
      );
    }
    if (score <= 50) {
      return (
        <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700" title={report}>
          <AlertTriangle className="mr-1 h-3 w-3 text-amber-600" />
          {score}% Similarity (Moderate)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700" title={report}>
        <ShieldAlert className="mr-1 h-3 w-3 text-rose-600" />
        {score}% High (Flagged)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500">Loading course curriculum & resources...</p>
      </div>
    );
  }

  // 403 Forbidden / Not Enrolled Banner
  if (errorStatus === 403) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-10 text-center shadow-sm max-w-2xl mx-auto my-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          {errorMessage || 'You are not enrolled in this course. Learning materials and assignments are restricted to registered students.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/app/subjects"
            className="inline-flex items-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Return to My Subjects
          </Link>
          <Link
            to="/app/resources"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Open Resource Vault
          </Link>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>Subject not found.</p>
        <Link to="/app/subjects" className="text-brand-600 text-xs font-bold hover:underline mt-2 inline-block">
          Return to Subjects
        </Link>
      </div>
    );
  }

  // Filter all resources belonging to this subject
  const allSubjectResources: Resource[] = [
    ...(subject.resources || []),
    ...(subject.modules || []).flatMap(m => m.resources || []),
  ];

  // Dedicated PYQs
  const pyqResources = allSubjectResources.filter(r => r.fileType?.toUpperCase() === 'PYQ');
  const availableYears = Array.from(new Set(pyqResources.map(p => p.year).filter(Boolean))).sort((a: any, b: any) => b - a);
  const filteredPyqs = pyqYearFilter === 'ALL'
    ? pyqResources
    : pyqResources.filter(p => String(p.year) === pyqYearFilter);

  const subjectAssignments = subject.assignments || [];
  const subjectQuizzes = subject.quizzes || [];

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

      {/* Subject Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-950 p-6 text-white shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-brand-300 bg-white/10 px-2.5 py-0.5 rounded border border-white/20">
                {subject.code}
              </span>
              <span className="text-xs text-blue-200">
                {subject.department?.name} · {subject.semester?.name} · {subject.credits} Credits
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{subject.name}</h1>
            {subject.faculty ? (
              <p className="text-xs text-blue-200 mt-2 flex items-center">
                <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2" />
                Instructor: <strong className="ml-1 text-white">{subject.faculty.user?.name}</strong> ({subject.faculty.designation})
              </p>
            ) : (
              <p className="text-xs text-amber-300 mt-2">Instructor unassigned</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageSubject && (
              <>
                <button
                  onClick={() => setShowAddModule(true)}
                  className="flex items-center rounded-xl bg-white/20 px-3.5 py-2 text-xs font-bold hover:bg-white/30 transition border border-white/20"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Module
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-400 transition shadow-sm"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload Resource
                </button>
                <button
                  onClick={() => setShowCreateAssignment(true)}
                  className="flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Assignment
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Modules', value: subject.modules?.length || 0, icon: '📚' },
          { label: 'Vault Resources', value: allSubjectResources.length, icon: '📁' },
          { label: 'PYQ Papers', value: pyqResources.length, icon: '📜' },
          { label: 'Assignments', value: subjectAssignments.length, icon: '📝' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-center">
            <div className="text-2xl">{stat.icon}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Course Sections">
          {[
            { id: 'curriculum', label: 'Curriculum & Modules', icon: Layers, count: subject.modules?.length },
            { id: 'pyqs', label: 'Previous Year Papers (PYQ)', icon: BookMarked, count: pyqResources.length },
            { id: 'assignments', label: 'Course Assignments', icon: FileText, count: subjectAssignments.length },
            { id: 'quizzes', label: 'Quizzes & Assessments', icon: HelpCircle, count: subjectQuizzes.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-brand-50/40 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CURRICULUM & MODULE RESOURCES */}
      {/* ======================================================== */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center">
                <Layers className="h-4 w-4 mr-2 text-brand-600" />
                Course Modules & Reading Notes
              </h2>
              {canManageSubject && (
                <button
                  onClick={() => setShowAddModule(true)}
                  className="text-xs text-brand-600 font-bold hover:underline flex items-center"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Module
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {(subject.modules || []).length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <Layers className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  No modules have been added to this subject yet.
                  {canManageSubject && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowAddModule(true)}
                        className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Create First Module
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                (subject.modules || []).map(mod => (
                  <div key={mod.id}>
                    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/70 transition">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="flex-1 flex items-center space-x-3 text-left"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold shrink-0">
                          {mod.orderIndex}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{mod.title}</p>
                          {mod.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{mod.description}</p>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-400 font-medium">
                          {(mod.resources || []).length} resources
                        </span>
                        {canManageSubject && (
                          <button
                            onClick={() => handleDeleteModule(mod.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete module"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => toggleModule(mod.id)} className="p-1 text-slate-400">
                          {expandedModules[mod.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {expandedModules[mod.id] && (
                      <div className="bg-slate-50/50 px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
                        {(mod.resources || []).length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No resources attached to this module.
                            {canManageSubject && (
                              <button
                                onClick={() => {
                                  setUploadModuleId(mod.id);
                                  setShowUpload(true);
                                }}
                                className="ml-2 text-brand-600 font-bold hover:underline"
                              >
                                + Upload to this module
                              </button>
                            )}
                          </div>
                        ) : (
                          (mod.resources || []).map((res: any) => {
                            const isPdf = res.fileType.toUpperCase() === 'PDF' || res.fileType.toUpperCase() === 'PYQ' || res.fileUrl.toLowerCase().endsWith('.pdf');
                            return (
                              <div
                                key={res.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300 transition"
                              >
                                <div className="flex items-center space-x-3">
                                  {renderResourceBadge(res.fileType)}
                                  <div>
                                    <p className="text-xs font-bold text-slate-900">{res.title}</p>
                                    <p className="text-[11px] text-slate-400">
                                      {res.fileSize ? `${res.fileSize} · ` : ''}
                                      Uploaded by {res.uploadedBy?.name || 'Faculty'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {isPdf && (
                                    <button
                                      onClick={() => setPreviewResource(res)}
                                      className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 border border-brand-200 shadow-2xs"
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" /> Preview PDF
                                    </button>
                                  )}
                                  <a
                                    href={res.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    <Download className="mr-1 h-3.5 w-3.5" /> Open
                                  </a>
                                  {canManageSubject && (
                                    <button
                                      onClick={() => handleDeleteResource(res.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      title="Delete resource"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* General Course Materials (unassigned to module) */}
          {(subject.resources || []).filter(r => r.fileType?.toUpperCase() !== 'PYQ').length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Supplementary Study Materials</h2>
              <div className="space-y-2">
                {(subject.resources || [])
                  .filter(r => r.fileType?.toUpperCase() !== 'PYQ')
                  .map((res: any) => {
                    const isPdf = res.fileType.toUpperCase() === 'PDF' || res.fileUrl.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={res.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:border-brand-300 transition"
                      >
                        <div className="flex items-center space-x-3">
                          {renderResourceBadge(res.fileType)}
                          <div>
                            <p className="text-xs font-bold text-slate-900">{res.title}</p>
                            {res.description && <p className="text-[11px] text-slate-500">{res.description}</p>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isPdf && (
                            <button
                              onClick={() => setPreviewResource(res)}
                              className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 border border-brand-200 shadow-2xs"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> Preview PDF
                            </button>
                          )}
                          <a
                            href={res.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Open
                          </a>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PREVIOUS YEAR PAPERS (PYQ) */}
      {/* ======================================================== */}
      {activeTab === 'pyqs' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <BookMarked className="mr-2 h-4 w-4 text-indigo-600" />
                  {subject.code} University Question Papers & Solution Sets
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official end-semester and mid-term examination archives with solution keys
                </p>
              </div>

              {/* Year Filter Pill Bar */}
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 mr-1">Year:</span>
                <button
                  onClick={() => setPyqYearFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    pyqYearFilter === 'ALL'
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Years
                </button>
                {availableYears.map((yr: any) => (
                  <button
                    key={yr}
                    onClick={() => setPyqYearFilter(String(yr))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      pyqYearFilter === String(yr)
                        ? 'bg-brand-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {filteredPyqs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <BookMarked className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                No PYQs matching year "{pyqYearFilter}" found for this subject.
                {canManageSubject && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setUploadType('PYQ');
                        setShowUpload(true);
                      }}
                      className="inline-flex items-center rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Upload PYQ Paper
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredPyqs.map(pyq => (
                  <div
                    key={pyq.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-indigo-300 hover:bg-white transition gap-3"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs shrink-0 border border-indigo-200">
                        {pyq.year || 'PYQ'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{pyq.title}</h4>
                        {pyq.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{pyq.description}</p>
                        )}
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1">
                          <span>{pyq.fileSize || 'PDF Archive'}</span>
                          <span>&bull;</span>
                          <span>Year {pyq.year || 'Standard'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => setPreviewResource(pyq)}
                        className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview PDF
                      </button>
                      <a
                        href={pyq.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COURSE ASSIGNMENTS */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Active Deliverables & Problem Sets ({subjectAssignments.length})
            </h3>
            {canManageSubject && (
              <button
                onClick={() => setShowCreateAssignment(true)}
                className="inline-flex items-center rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-2xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Assignment
              </button>
            )}
          </div>

          {subjectAssignments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              No assignments have been published for this subject yet.
            </div>
          ) : (
            <div className="space-y-4">
              {subjectAssignments.map((a: any) => {
                const sub = (a.submissions || [])[0];
                const isOverdue = new Date(a.dueDate) < new Date() && !sub;

                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                      isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-bold text-slate-900">{a.title}</h4>
                          {isOverdue && (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                              <Lock className="mr-1 h-3 w-3" /> Locked
                            </span>
                          )}
                          {isStudent && (
                            sub ? (
                              sub.status === 'GRADED' ? (
                                <Badge variant="success">Graded ({sub.grade?.marksObtained}/{a.totalMarks})</Badge>
                              ) : (
                                <Badge variant="info">Submitted</Badge>
                              )
                            ) : !isOverdue ? (
                              <Badge variant="warning">Pending Submission</Badge>
                            ) : null
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.description}</p>

                        <div className="mt-3 flex items-center space-x-4 text-xs text-slate-500">
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3.5 w-3.5 text-slate-400" />
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                          <span>Total Marks: {a.totalMarks}</span>
                        </div>

                        {/* Student submission state */}
                        {isStudent && sub && (
                          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                            <p className="font-bold text-slate-700">Your Submission:</p>
                            {sub.content && <p className="font-mono text-[11px] text-slate-800">{sub.content}</p>}
                            {sub.similarityScore !== undefined && sub.similarityScore !== null && (
                              <div className="pt-1 flex items-center space-x-2">
                                <span className="text-[11px] text-slate-500">Similarity:</span>
                                {renderSimilarityBadge(sub.similarityScore, sub.similarityReport)}
                              </div>
                            )}
                            {sub.grade && (
                              <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-emerald-900 font-bold">
                                Score: {sub.grade.marksObtained} / {a.totalMarks} &bull; &ldquo;{sub.grade.feedback}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end gap-2">
                        {isStudent && !sub && (
                          isOverdue ? (
                            <span className="text-xs font-bold text-rose-600">Past Deadline</span>
                          ) : (
                            <button
                              onClick={() => setSubmitTarget(a)}
                              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-2xs"
                            >
                              <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit Work
                            </button>
                          )
                        )}

                        {canManageSubject && (
                          <Link
                            to={`/app/assignments?subjectId=${subject.id}`}
                            className="inline-flex items-center rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Review Submissions ({a.submissions?.length || a._count?.submissions || 0})
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: QUIZZES & ASSESSMENTS */}
      {/* ======================================================== */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Quizzes & Timed Assessments ({subjectQuizzes.length})
            </h3>
            {canManageSubject && (
              <Link
                to={`/app/quizzes?subjectId=${subject.id}`}
                className="inline-flex items-center rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Quiz Generator
              </Link>
            )}
          </div>

          {subjectQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              <HelpCircle className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              No quizzes published for this subject yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {subjectQuizzes.map((q: any) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-brand-300 transition"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{q.title}</h4>
                    {q.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{q.description}</p>}
                    <div className="mt-3 flex items-center space-x-3 text-xs text-slate-500">
                      <span><Clock className="inline mr-1 h-3.5 w-3.5 text-slate-400" /> {q.timeLimitMinutes} mins</span>
                      <span>&bull;</span>
                      <span>{q.totalMarks} Marks</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <Link
                      to={`/app/quizzes?subjectId=${subject.id}`}
                      className="inline-flex items-center rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-2xs"
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> {isStudent ? 'Attempt Quiz' : 'Manage Quiz'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: Upload Resource */}
      {/* ======================================================== */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload Resource to {subject.code}</h3>
              <button onClick={() => setShowUpload(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Resource Title</label>
                <input
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 3 - Dynamic Programming Notes"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={uploadType}
                    onChange={e => setUploadType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="PDF">PDF</option>
                    <option value="NOTES">Lecture Notes</option>
                    <option value="PPT">PPT / Slides</option>
                    <option value="PYQ">PYQ Question Paper</option>
                    <option value="VIDEO">Recorded Lecture</option>
                    <option value="REFERENCE">Reference Material</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Associate Module</label>
                  <select
                    value={uploadModuleId}
                    onChange={e => setUploadModuleId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">— General Resource —</option>
                    {(subject.modules || []).map(m => (
                      <option key={m.id} value={m.id}>
                        Module {m.orderIndex}: {m.title.slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">File URL / Link</label>
                  <input
                    required
                    value={uploadUrl}
                    onChange={e => setUploadUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">File Size</label>
                  <input
                    value={uploadSize}
                    onChange={e => setUploadSize(e.target.value)}
                    placeholder="e.g. 2.4 MB"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {uploadType === 'PYQ' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Exam Year</label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 2024"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Key Topics</label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Topics covered, syllabus pointers..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pubCheck"
                  checked={uploadPublished}
                  onChange={e => setUploadPublished(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="pubCheck" className="text-xs text-slate-700 font-medium">
                  Publish immediately to enrolled students
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Add Module */}
      {/* ======================================================== */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Curriculum Module</h3>
              <button onClick={() => setShowAddModule(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreateModule} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Module Title</label>
                <input
                  required
                  value={newModuleTitle}
                  onChange={e => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Module 3: Advanced Tree Structures"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order / Unit Index</label>
                <input
                  type="number"
                  min="1"
                  value={newModuleOrder}
                  onChange={e => setNewModuleOrder(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Syllabus Overview</label>
                <textarea
                  rows={3}
                  value={newModuleDesc}
                  onChange={e => setNewModuleDesc(e.target.value)}
                  placeholder="Key concepts, algorithms, theorems..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModule(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingModule}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {creatingModule ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Create Assignment (Faculty) */}
      {/* ======================================================== */}
      {showCreateAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Assignment for {subject.code}</h3>
              <button onClick={() => setShowCreateAssignment(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assignment Title</label>
                <input
                  required
                  value={assignTitle}
                  onChange={e => setAssignTitle(e.target.value)}
                  placeholder="e.g. Lab Exercise 3: Vector Clock Implementation"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Problem Statement</label>
                <textarea
                  required
                  rows={4}
                  value={assignDesc}
                  onChange={e => setAssignDesc(e.target.value)}
                  placeholder="Detailed guidelines, constraints, and instructions..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    required
                    type="datetime-local"
                    value={assignDueDate}
                    onChange={e => setAssignDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Marks</label>
                  <input
                    required
                    type="number"
                    min="10"
                    max="500"
                    value={assignTotalMarks}
                    onChange={e => setAssignTotalMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignment(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssign}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {creatingAssign ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Submit Assignment Work (Student) */}
      {/* ======================================================== */}
      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Work: {submitTarget.title}</h3>
                <p className="text-xs text-slate-500">{subject.code} &bull; Max {submitTarget.totalMarks} Marks</p>
              </div>
              <button onClick={() => setSubmitTarget(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignmentWork} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Your Answer / Solution / Code
                </label>
                <textarea
                  required
                  rows={5}
                  value={submitContent}
                  onChange={e => setSubmitContent(e.target.value)}
                  placeholder="Paste your implementation, key logic, and test results..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Repository / Cloud Link (Optional)
                </label>
                <input
                  type="url"
                  value={submitUrl}
                  onChange={e => setSubmitUrl(e.target.value)}
                  placeholder="https://github.com/your-username/repo"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono"
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
                  disabled={submittingWork || !submitContent.trim()}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingWork ? 'Submitting & Analyzing...' : 'Submit Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      <PdfPreviewModal
        resource={previewResource}
        isOpen={Boolean(previewResource)}
        onClose={() => setPreviewResource(null)}
      />
    </div>
  );
};

export default SubjectDetailPage;
