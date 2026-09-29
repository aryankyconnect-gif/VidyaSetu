// src/pages/app/ResourcesPage.tsx
import React, { useState, useEffect } from 'react';
import { ResourceService, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Resource, Subject } from '../../types';
import { Folder, FileText, Download, ExternalLink, Plus, Search, Filter, Trash2, X, BookOpen } from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const canUpload = user?.role === 'ADMIN' || user?.role === 'FACULTY' || user?.role === 'CR';

  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Upload modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [subjectId, setSubjectId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, subData] = await Promise.all([
        ResourceService.getResources(selectedSubject ? { subjectId: selectedSubject } : {}),
        AcademicService.getSubjects(),
      ]);

      if (resData.data.success) setResources(resData.data.data);
      if (subData.data.success) setSubjects(subData.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSubject]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      alert('Please select a subject');
      return;
    }
    setUploading(true);
    try {
      await ResourceService.createResource({
        title,
        fileUrl,
        fileType,
        subjectId,
        description: description || undefined,
      });
      setShowModal(false);
      setTitle('');
      setFileUrl('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this resource permanently?')) return;
    try {
      await ResourceService.deleteResource(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getFileBadge = (type: string) => {
    switch (type) {
      case 'SLIDES':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">SLIDES</span>;
      case 'NOTES':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">NOTES</span>;
      case 'LINK':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">LINK</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">PDF</span>;
    }
  };

  const filteredResources = resources.filter(r => {
    if (selectedType && r.fileType !== selectedType) return false;
    if (search) {
      const matchTitle = r.title.toLowerCase().includes(search.toLowerCase());
      const matchSub = r.subject?.name?.toLowerCase().includes(search.toLowerCase()) || r.subject?.code?.toLowerCase().includes(search.toLowerCase());
      if (!matchTitle && !matchSub) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resource Repository</h1>
          <p className="text-xs text-slate-500 mt-1">Study materials, lecture notes, syllabus slides, and reference links</p>
        </div>
        {canUpload && (
          <button
            onClick={() => {
              if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
              setShowModal(true);
            }}
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Upload Material
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources by title or subject..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">All File Types</option>
            <option value="PDF">PDF Documents</option>
            <option value="SLIDES">Lecture Slides</option>
            <option value="NOTES">Handwritten Notes</option>
            <option value="LINK">External References</option>
          </select>
        </div>
      </div>

      {/* Resources Table / Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Folder className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No resources found</h3>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or upload new learning content.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map(res => {
            const canDelete = res.uploadedById === user?.id || user?.role === 'ADMIN';

            return (
              <div
                key={res.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                      {res.subject?.code}
                    </span>
                    {getFileBadge(res.fileType)}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{res.title}</h3>
                  {res.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{res.description}</p>
                  )}

                  <div className="mt-4 text-[11px] text-slate-400 space-y-1">
                    <p>Subject: <span className="text-slate-600 font-medium">{res.subject?.name}</span></p>
                    <p>Uploaded by: <span className="text-slate-600 font-medium">{res.uploadedBy?.name || 'Faculty'}</span></p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <a
                    href={res.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-800 transition"
                  >
                    {res.fileType === 'LINK' ? (
                      <>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Visit Link
                      </>
                    ) : (
                      <>
                        <Download className="mr-1 h-3.5 w-3.5" /> View / Download
                      </>
                    )}
                  </a>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Learning Resource</h3>
                <p className="text-xs text-slate-500">Provide material link or cloud drive URL</p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Subject</label>
                <select
                  required
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Resource Title</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Unit 3 - Dynamic Programming Notes"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Resource Type</label>
                  <select
                    value={fileType}
                    onChange={e => setFileType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="PDF">PDF</option>
                    <option value="SLIDES">Slides</option>
                    <option value="NOTES">Notes</option>
                    <option value="LINK">Web Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">URL / Link</label>
                  <input
                    required
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Brief note about the contents..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
