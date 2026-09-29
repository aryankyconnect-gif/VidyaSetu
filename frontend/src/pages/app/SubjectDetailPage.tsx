// src/pages/app/SubjectDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AcademicService, ResourceService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Subject } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  BookOpen, FileText, HelpCircle, ChevronDown, ChevronRight,
  Download, Link as LinkIcon, Plus, X, Layers,
} from 'lucide-react';

export const SubjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canUpload = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Resource upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadType, setUploadType] = useState('PDF');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await AcademicService.getSubjectById(id);
      if (res.data.success) {
        setSubject(res.data.data);
        // Expand first module by default
        if (res.data.data.modules?.length > 0) {
          setExpandedModules({ [res.data.data.modules[0].id]: true });
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

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
        subjectId: id,
        moduleId: uploadModuleId || undefined,
      });
      setShowUpload(false);
      setUploadTitle(''); setUploadUrl('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const fileTypeIcon = (type: string) => {
    switch (type) {
      case 'SLIDES': return '📊';
      case 'NOTES': return '📝';
      case 'LINK': return '🔗';
      default: return '📄';
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );

  if (!subject) return (
    <div className="text-center py-16 text-slate-500">Subject not found.</div>
  );

  return (
    <div className="space-y-6">
      {/* Subject Header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 to-indigo-900 p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="font-mono text-sm font-bold text-brand-300">{subject.code}</span>
            <h1 className="mt-1 text-2xl font-bold">{subject.name}</h1>
            <p className="text-sm text-blue-200 mt-1">
              {subject.department?.name} · {subject.semester?.name} · {subject.credits} Credits
            </p>
            {subject.faculty && (
              <p className="text-xs text-blue-300 mt-2">
                Instructor: {subject.faculty.user?.name} ({subject.faculty.designation})
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/app/assignments?subjectId=${subject.id}`}
              className="flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/20 transition">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Assignments ({subject._count?.assignments || 0})
            </Link>
            <Link to={`/app/quizzes?subjectId=${subject.id}`}
              className="flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/20 transition">
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Quizzes ({subject._count?.quizzes || 0})
            </Link>
            {canUpload && (
              <button onClick={() => setShowUpload(true)}
                className="flex items-center rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/30 transition">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload Resource
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Modules', value: subject._count?.modules || subject.modules?.length || 0, icon: '📚' },
          { label: 'Resources', value: subject._count?.resources || 0, icon: '📁' },
          { label: 'Students', value: subject._count?.enrollments || 0, icon: '👥' },
          { label: 'Assignments', value: subject._count?.assignments || 0, icon: '📝' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
            <div className="text-2xl">{stat.icon}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Modules & Resources */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center">
            <Layers className="h-4 w-4 mr-2 text-brand-600" />
            Course Modules & Lecture Materials
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {(subject.modules || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No modules have been added to this subject yet.
            </div>
          ) : (
            (subject.modules || []).map((mod) => (
              <div key={mod.id}>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold shrink-0">
                      {mod.orderIndex}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{mod.title}</p>
                      {mod.description && (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-lg line-clamp-1">{mod.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">{(mod.resources || []).length} files</span>
                    {expandedModules[mod.id]
                      ? <ChevronDown className="h-4 w-4 text-slate-400" />
                      : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {expandedModules[mod.id] && (
                  <div className="bg-slate-50/50 px-5 pb-4 space-y-2">
                    {(mod.resources || []).length === 0 ? (
                      <p className="text-xs text-slate-400 py-2 pl-10">No materials uploaded yet for this module.</p>
                    ) : (
                      (mod.resources || []).map((res: any) => (
                        <a
                          key={res.id}
                          href={res.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300 hover:shadow-xs transition"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{fileTypeIcon(res.fileType)}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{res.title}</p>
                              <p className="text-[11px] text-slate-400">{res.fileType}</p>
                            </div>
                          </div>
                          <Download className="h-4 w-4 text-slate-400 hover:text-brand-600 transition" />
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Standalone resources (not linked to a module) */}
      {(subject.resources || []).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">General Course Resources</h2>
          <div className="space-y-2">
            {(subject.resources || []).map((res: any) => (
              <a
                key={res.id}
                href={res.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-brand-300 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{fileTypeIcon(res.fileType)}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{res.title}</p>
                    {res.description && <p className="text-[11px] text-slate-500">{res.description}</p>}
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Upload Resource Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Upload Resource to {subject.code}</h3>
              <button onClick={() => setShowUpload(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Resource Title</label>
                <input required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Lecture 05 Slides - CAP Theorem" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">File URL / Link</label>
                <input required value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Type</label>
                  <select value={uploadType} onChange={e => setUploadType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none">
                    {['PDF', 'NOTES', 'SLIDES', 'LINK'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Module (Optional)</label>
                  <select value={uploadModuleId} onChange={e => setUploadModuleId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none">
                    <option value="">— General Resource —</option>
                    {(subject.modules || []).map(m => (
                      <option key={m.id} value={m.id}>Module {m.orderIndex}: {m.title.slice(0, 25)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
