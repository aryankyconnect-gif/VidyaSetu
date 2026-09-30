// src/pages/app/ResourcesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResourceService, AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Resource, Subject, Module, Department, Semester } from '../../types';
import { PdfPreviewModal } from '../../components/common/PdfPreviewModal';
import {
  Folder, FileText, Download, ExternalLink, Plus, Search, Filter, Trash2,
  X, BookOpen, Layers, Eye, CheckCircle2, AlertCircle, Clock, Video,
  BookMarked, HelpCircle, LayoutGrid, List, Sparkles, Edit3, ArrowRight,
  ChevronRight, Calendar, Building2, GraduationCap, ShieldCheck, EyeOff
} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isStudent = user?.role === 'STUDENT';
  const isFaculty = user?.role === 'FACULTY';
  const isAdmin = user?.role === 'ADMIN';
  const canUpload = isAdmin || isFaculty;

  // Active Tab: 'vault' | 'hierarchy' | 'pyqs'
  const activeTab = searchParams.get('tab') || 'vault';
  const setTab = (tab: string) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  // Data states
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(searchParams.get('dept') || '');
  const [selectedSem, setSelectedSem] = useState(searchParams.get('sem') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') || '');
  const [selectedModule, setSelectedModule] = useState(searchParams.get('moduleId') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Hierarchy Step State (My Subjects → Subject → Modules → Resources)
  const [hierarchySubject, setHierarchySubject] = useState<Subject | null>(null);
  const [hierarchyModule, setHierarchyModule] = useState<Module | null>(null);

  // PDF Preview State
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadType, setUploadType] = useState('PDF');
  const [uploadSize, setUploadSize] = useState('');
  const [uploadYear, setUploadYear] = useState<number | ''>('');
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Create Module Modal State (for faculty/admin)
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleSubjectId, setModuleSubjectId] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleOrder, setModuleOrder] = useState(1);
  const [creatingModule, setCreatingModule] = useState(false);

  // Edit Resource Modal State
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Flash notification helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load baseline subjects, departments, semesters
  const loadMetadata = async () => {
    try {
      const [subsRes, deptsRes, semsRes] = await Promise.all([
        AcademicService.getSubjects({ myEnrolled: isStudent ? true : undefined }),
        AcademicService.getDepartments(),
        AcademicService.getSemesters(),
      ]);

      if (subsRes.data.success) {
        setSubjects(subsRes.data.data);
        if (subsRes.data.data.length > 0 && !uploadSubjectId) {
          setUploadSubjectId(subsRes.data.data[0].id);
        }
      }
      if (deptsRes.data.success) setDepartments(deptsRes.data.data);
      if (semsRes.data.success) setSemesters(semsRes.data.data);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  // Load resources based on active filters
  const loadResources = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pyqs') {
        const res = await ResourceService.getPyqs({
          departmentId: selectedDept || undefined,
          semesterId: selectedSem || undefined,
          subjectId: selectedSubject || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          search: search || undefined,
        });
        if (res.data.success) setResources(res.data.data);
      } else {
        const res = await ResourceService.getResources({
          subjectId: selectedSubject || undefined,
          moduleId: selectedModule || undefined,
          fileType: selectedType || undefined,
          departmentId: selectedDept || undefined,
          semesterId: selectedSem || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          search: search || undefined,
        });
        if (res.data.success) setResources(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load resources', err);
      showToast('error', err.response?.data?.message || 'Could not load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadResources();
  }, [selectedDept, selectedSem, selectedSubject, selectedModule, selectedType, selectedYear, activeTab]);

  // Available modules for current upload modal subject
  const currentUploadSubject = subjects.find(s => s.id === uploadSubjectId);

  // Available modules for selected subject filter
  const currentFilterSubject = subjects.find(s => s.id === selectedSubject);

  // Handle Resource Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadSubjectId) {
      showToast('error', 'Please select a subject');
      return;
    }
    setUploading(true);
    try {
      await ResourceService.createResource({
        title: uploadTitle,
        description: uploadDescription || undefined,
        fileUrl: uploadUrl,
        fileType: uploadType,
        fileSize: uploadSize || undefined,
        year: uploadYear ? Number(uploadYear) : undefined,
        isPublished: uploadPublished,
        subjectId: uploadSubjectId,
        moduleId: uploadModuleId || undefined,
      });

      showToast('success', `Resource "${uploadTitle}" uploaded successfully!`);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadUrl('');
      setUploadSize('');
      setUploadYear('');
      setUploadModuleId('');
      loadResources();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  // Handle Module Creation (Faculty / Admin)
  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleSubjectId) {
      showToast('error', 'Please select a subject');
      return;
    }
    setCreatingModule(true);
    try {
      await AcademicService.createModule({
        title: moduleTitle,
        description: moduleDescription || undefined,
        orderIndex: Number(moduleOrder),
        subjectId: moduleSubjectId,
      });

      showToast('success', `Module "${moduleTitle}" created successfully!`);
      setShowModuleModal(false);
      setModuleTitle('');
      setModuleDescription('');
      loadMetadata();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create module');
    } finally {
      setCreatingModule(false);
    }
  };

  // Handle Resource Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    setSavingEdit(true);
    try {
      await ResourceService.updateResource(editingResource.id, {
        title: editingResource.title,
        description: editingResource.description,
        fileUrl: editingResource.fileUrl,
        fileType: editingResource.fileType,
        fileSize: editingResource.fileSize,
        year: editingResource.year ? Number(editingResource.year) : null,
        isPublished: editingResource.isPublished,
        moduleId: editingResource.moduleId || null,
      });

      showToast('success', 'Resource metadata updated successfully');
      setEditingResource(null);
      loadResources();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update resource');
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick toggle publish/unpublish
  const handleTogglePublish = async (res: Resource) => {
    try {
      await ResourceService.updateResource(res.id, {
        isPublished: !res.isPublished,
      });
      showToast('success', `Resource marked as ${!res.isPublished ? 'Published' : 'Draft / Unpublished'}`);
      setResources(prev =>
        prev.map(r => (r.id === res.id ? { ...r, isPublished: !r.isPublished } : r))
      );
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to change publish status');
    }
  };

  // Handle Delete
  const handleDeleteResource = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      await ResourceService.deleteResource(id);
      showToast('success', 'Resource deleted successfully');
      loadResources();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete resource');
    }
  };

  // Filtered and Sorted Resources
  const processedResources = useMemo(() => {
    let list = [...resources];

    // Client-side text search (supplemental)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.subject?.name && r.subject.name.toLowerCase().includes(q)) ||
        (r.subject?.code && r.subject.code.toLowerCase().includes(q)) ||
        (r.module?.title && r.module.title.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return list;
  }, [resources, search, sortBy]);

  // Helper: Badge UI for Resource Type
  const renderTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'PDF') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
          <FileText className="h-3 w-3" /> PDF
        </span>
      );
    }
    if (t === 'PPT' || t === 'SLIDES') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
          <BookOpen className="h-3 w-3" /> PPT / Slides
        </span>
      );
    }
    if (t === 'NOTES') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
          <BookMarked className="h-3 w-3" /> Lecture Notes
        </span>
      );
    }
    if (t === 'PYQ') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
          <HelpCircle className="h-3 w-3" /> PYQ Paper
        </span>
      );
    }
    if (t === 'VIDEO') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
          <Video className="h-3 w-3" /> Lecture Video
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
        <ExternalLink className="h-3 w-3" /> Reference Link
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-950 p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded-lg bg-brand-500/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-300 border border-brand-500/30">
                Academic Resource Vault
              </span>
              <span className="text-xs text-blue-200">Department → Semester → Subject → Module → Resource</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Learning Resources & PYQs</h1>
            <p className="mt-1 text-xs text-blue-200/80 max-w-2xl">
              Centralized repository for verified lecture notes, slide decks, syllabus outlines, previous year university question papers, and recorded lectures.
            </p>
          </div>

          {canUpload && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (subjects.length > 0 && !moduleSubjectId) {
                    setModuleSubjectId(subjects[0].id);
                  }
                  setShowModuleModal(true);
                }}
                className="inline-flex items-center rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/20 transition border border-white/20"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Module
              </button>
              <button
                onClick={() => {
                  if (subjects.length > 0 && !uploadSubjectId) {
                    setUploadSubjectId(subjects[0].id);
                  }
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-500 transition"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Upload Material
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setTab('vault')}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'vault'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Folder className="mr-2 h-4 w-4" /> All Resources Catalog
          </button>
          <button
            onClick={() => setTab('hierarchy')}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'hierarchy'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers className="mr-2 h-4 w-4" /> Browse by Hierarchy (Dept → Sem → Module)
          </button>
          <button
            onClick={() => setTab('pyqs')}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'pyqs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle className="mr-2 h-4 w-4 text-indigo-500" />
            Previous Year Question Papers (PYQ)
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: ALL RESOURCES CATALOG                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search resources, topics, or subjects..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Department */}
              <div>
                <select
                  value={selectedDept}
                  onChange={e => {
                    setSelectedDept(e.target.value);
                    setSelectedSubject('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <select
                  value={selectedSem}
                  onChange={e => setSelectedSem(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <select
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSelectedModule('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(s => (!selectedDept || s.departmentId === selectedDept))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                </select>
              </div>

              {/* Resource Type */}
              <div>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Material Types</option>
                  <option value="PDF">PDF Documents</option>
                  <option value="NOTES">Lecture Notes</option>
                  <option value="PPT">PPT / Slides</option>
                  <option value="PYQ">Question Papers</option>
                  <option value="VIDEO">Recorded Lectures</option>
                  <option value="REFERENCE">Reference Material</option>
                </select>
              </div>
            </div>

            {/* Sub-bar: Module filter + Sort + View mode */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Filter by Module:</span>
                <select
                  value={selectedModule}
                  onChange={e => setSelectedModule(e.target.value)}
                  disabled={!selectedSubject || !currentFilterSubject?.modules?.length}
                  className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">All Modules</option>
                  {(currentFilterSubject?.modules || []).map(m => (
                    <option key={m.id} value={m.id}>Module {m.orderIndex}: {m.title.slice(0, 35)}</option>
                  ))}
                </select>
                {(selectedDept || selectedSem || selectedSubject || selectedModule || selectedType || search) && (
                  <button
                    onClick={() => {
                      setSelectedDept('');
                      setSelectedSem('');
                      setSelectedSubject('');
                      setSelectedModule('');
                      setSelectedType('');
                      setSelectedYear('');
                      setSearch('');
                    }}
                    className="text-xs text-brand-600 hover:text-brand-800 font-semibold underline ml-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-xs text-slate-500">
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="newest">Newest Added</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-xs text-brand-700' : 'text-slate-500'}`}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-xs text-brand-700' : 'text-slate-500'}`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing <strong className="text-slate-800">{processedResources.length}</strong> resources</span>
            {isStudent && (
              <span className="flex items-center text-emerald-700 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Enrolled Subjects Protected
              </span>
            )}
          </div>

          {/* Main Grid / List */}
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              <p className="mt-3 text-xs text-slate-500">Loading resources...</p>
            </div>
          ) : processedResources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">No resources found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No learning materials matched your current search and filters. Try clearing your filters or select a different subject.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processedResources.map(res => {
                const canManage = isAdmin || (isFaculty && (res.uploadedById === user?.id || res.subject?.id === user?.facultyProfile?.subjects?.[0]?.id));
                const isPdf = res.fileType.toUpperCase() === 'PDF' || res.fileType.toUpperCase() === 'PYQ' || res.fileUrl.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={res.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                      !res.isPublished ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    <div>
                      {/* Top tags */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                          {res.subject?.code}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {!res.isPublished && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 border border-amber-200">
                              <EyeOff className="h-3 w-3" /> Draft
                            </span>
                          )}
                          {renderTypeBadge(res.fileType)}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={res.title}>
                        {res.title}
                      </h3>
                      {res.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{res.description}</p>
                      )}

                      {/* Module & Subject metadata */}
                      <div className="mt-4 space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                        {res.module && (
                          <p className="flex items-center text-indigo-700 font-medium">
                            <Layers className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                            {res.module.title}
                          </p>
                        )}
                        <p className="truncate">
                          Subject: <span className="font-medium text-slate-700">{res.subject?.name}</span>
                        </p>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>By: {res.uploadedBy?.name || 'Faculty'}</span>
                          {res.fileSize && <span>{res.fileSize}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center space-x-2">
                        {/* PDF In-browser Preview */}
                        {isPdf && (
                          <button
                            onClick={() => setPreviewResource(res)}
                            className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition border border-brand-200"
                            title="Preview in browser"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                          </button>
                        )}

                        {/* Open / Download */}
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                        >
                          {res.fileType === 'VIDEO' ? (
                            <>
                              <Video className="mr-1 h-3.5 w-3.5" /> Watch
                            </>
                          ) : (
                            <>
                              <Download className="mr-1 h-3.5 w-3.5" /> Open
                            </>
                          )}
                        </a>
                      </div>

                      {/* Manage Actions (Faculty / Admin) */}
                      {canManage && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleTogglePublish(res)}
                            className={`p-1.5 rounded transition ${
                              res.isPublished
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-amber-600 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={res.isPublished ? 'Unpublish resource (Draft)' : 'Publish resource'}
                          >
                            {res.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={() => setEditingResource(res)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                            title="Edit metadata"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteResource(res.id, res.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Resource Title</th>
                    <th className="px-4 py-3.5">Subject & Module</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Uploaded By</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedResources.map(res => {
                    const canManage = isAdmin || (isFaculty && (res.uploadedById === user?.id || res.subject?.id === user?.facultyProfile?.subjects?.[0]?.id));
                    const isPdf = res.fileType.toUpperCase() === 'PDF' || res.fileType.toUpperCase() === 'PYQ' || res.fileUrl.toLowerCase().endsWith('.pdf');

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-900 line-clamp-1">{res.title}</p>
                          {res.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{res.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded text-[10px]">
                            {res.subject?.code}
                          </span>
                          {res.module && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-xs">{res.module.title}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderTypeBadge(res.fileType)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {res.uploadedBy?.name || 'Faculty'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {res.isPublished ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-semibold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isPdf && (
                              <button
                                onClick={() => setPreviewResource(res)}
                                className="inline-flex items-center rounded-lg bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 border border-brand-200"
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                              </button>
                            )}
                            <a
                              href={res.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              <Download className="mr-1 h-3.5 w-3.5" /> Open
                            </a>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleTogglePublish(res)}
                                  className="p-1 text-slate-400 hover:text-amber-600 rounded"
                                  title="Toggle status"
                                >
                                  {res.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => setEditingResource(res)}
                                  className="p-1 text-slate-400 hover:text-brand-600 rounded"
                                  title="Edit"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteResource(res.id, res.title)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: HIERARCHY EXPLORER                            */}
      {/* (My Subjects → Subject → Modules → Resources)        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Breadcrumb Steps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 flex-wrap">
              <button
                onClick={() => {
                  setHierarchySubject(null);
                  setHierarchyModule(null);
                }}
                className={`flex items-center hover:text-brand-600 ${!hierarchySubject ? 'text-brand-600 font-bold' : ''}`}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                {isStudent ? 'My Enrolled Subjects' : 'All Academic Subjects'}
              </button>
              {hierarchySubject && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <button
                    onClick={() => setHierarchyModule(null)}
                    className={`hover:text-brand-600 ${!hierarchyModule ? 'text-brand-600 font-bold' : ''}`}
                  >
                    {hierarchySubject.code}: {hierarchySubject.name}
                  </button>
                </>
              )}
              {hierarchyModule && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-900 font-bold">
                    Module {hierarchyModule.orderIndex}: {hierarchyModule.title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Step 1: Subject Selection */}
          {!hierarchySubject && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-brand-600" />
                Step 1: Select a Course / Subject
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => setHierarchySubject(sub)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-400 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{sub.credits} Credits</span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{sub.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {sub.department?.name} · {sub.semester?.name}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-brand-600 font-bold">
                      <span>{(sub.modules || []).length} Modules available</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Modules of Selected Subject */}
          {hierarchySubject && !hierarchyModule && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                  Step 2: Select a Module in {hierarchySubject.code} ({hierarchySubject.name})
                </h2>
                <button
                  onClick={() => setHierarchySubject(null)}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  ← Change Subject
                </button>
              </div>

              {(hierarchySubject.modules || []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Layers className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-900">No modules created yet</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Faculty has not added modules to this course yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(hierarchySubject.modules || []).map(mod => (
                    <div
                      key={mod.id}
                      onClick={() => setHierarchyModule(mod)}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-400 hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-700 text-xs">
                            {mod.orderIndex}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                        </div>
                        {mod.description && (
                          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{mod.description}</p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-indigo-600 font-bold">
                        <span>View Resources</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Resources in Selected Module */}
          {hierarchySubject && hierarchyModule && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center">
                    <Folder className="h-4 w-4 mr-2 text-brand-600" />
                    Resources for Module {hierarchyModule.orderIndex}: {hierarchyModule.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{hierarchySubject.code} · {hierarchySubject.name}</p>
                </div>
                <button
                  onClick={() => setHierarchyModule(null)}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  ← Back to Modules
                </button>
              </div>

              {/* Module Resources List */}
              {loading ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              ) : resources.filter(r => r.moduleId === hierarchyModule.id).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Folder className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-900">No resources in this module</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Faculty has not uploaded any learning resources for this specific module yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resources
                    .filter(r => r.moduleId === hierarchyModule.id)
                    .map(res => {
                      const isPdf = res.fileType.toUpperCase() === 'PDF' || res.fileType.toUpperCase() === 'PYQ' || res.fileUrl.toLowerCase().endsWith('.pdf');
                      return (
                        <div
                          key={res.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              {renderTypeBadge(res.fileType)}
                              {res.fileSize && <span className="text-[11px] text-slate-400">{res.fileSize}</span>}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">{res.title}</h3>
                            {res.description && (
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{res.description}</p>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                            {isPdf && (
                              <button
                                onClick={() => setPreviewResource(res)}
                                className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100"
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
                              <Download className="mr-1 h-3.5 w-3.5" /> Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: PREVIOUS YEAR QUESTION PAPERS (PYQ)           */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'pyqs' && (
        <div className="space-y-4">
          {/* Demo Data Disclaimer Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Previous Year University Question Papers (PYQ Vault)</p>
              <p className="mt-0.5 text-amber-700">
                Notice: All sample question papers provided here are generated mock papers clearly labeled <strong>[Demo Data]</strong> for student examination practice, format familiarity, and revision.
              </p>
            </div>
          </div>

          {/* PYQ Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Department */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Department</label>
                <select
                  value={selectedDept}
                  onChange={e => {
                    setSelectedDept(e.target.value);
                    setSelectedSubject('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Semester</label>
                <select
                  value={selectedSem}
                  onChange={e => setSelectedSem(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(s => (!selectedDept || s.departmentId === selectedDept))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                </select>
              </div>

              {/* Examination Year */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Examination Year</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">All Years</option>
                  <option value="2026">2026 Papers</option>
                  <option value="2025">2025 Papers</option>
                  <option value="2024">2024 Papers</option>
                  <option value="2023">2023 Papers</option>
                  <option value="2022">2022 Papers</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Search Keywords</label>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Mid-term, End-term..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* PYQ Results */}
          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : processedResources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">No question papers found</h3>
              <p className="mt-1 text-xs text-slate-500">
                Try selecting a different year or department filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processedResources.map(pyq => (
                <div
                  key={pyq.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {pyq.subject?.code}
                      </span>
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                        {pyq.year ? `Exam ${pyq.year}` : 'Archive'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{pyq.title}</h3>
                    {pyq.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{pyq.description}</p>
                    )}

                    <div className="mt-4 text-[11px] text-slate-400 space-y-1">
                      <p>Subject: <span className="text-slate-700 font-medium">{pyq.subject?.name}</span></p>
                      <p>Department: <span className="text-slate-700 font-medium">{pyq.subject?.department?.name}</span></p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setPreviewResource(pyq)}
                      className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Read Question Paper
                    </button>
                    <a
                      href={pyq.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: UPLOAD RESOURCE (Faculty / Admin)             */}
      {/* ---------------------------------------------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Learning Resource</h3>
                <p className="text-xs text-slate-500">Provide document metadata, file link, and module association</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Subject Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={uploadSubjectId}
                  onChange={e => {
                    setUploadSubjectId(e.target.value);
                    setUploadModuleId('');
                  }}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Association */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Associate with Module <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={uploadModuleId}
                  onChange={e => setUploadModuleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— General Course Material (Not attached to a module) —</option>
                  {(currentUploadSubject?.modules || []).map(m => (
                    <option key={m.id} value={m.id}>
                      Module {m.orderIndex}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Resource Title <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g., Module 3: Vector Timestamps Complete Lecture Notes"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Resource Type & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Resource Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={uploadType}
                    onChange={e => setUploadType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="NOTES">Lecture Notes</option>
                    <option value="PPT">PPT / Presentation Slides</option>
                    <option value="PYQ">Previous Year Question Paper</option>
                    <option value="VIDEO">Recorded Lecture Video</option>
                    <option value="REFERENCE">Reference Material</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Academic / Exam Year <span className="text-slate-400 font-normal">(e.g. 2024)</span>
                  </label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="2025"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* URL & File Size */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    File URL or Resource Link <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={uploadUrl}
                    onChange={e => setUploadUrl(e.target.value)}
                    placeholder="https://... (cloud drive, PDF url, YouTube link)"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    File Size <span className="text-slate-400 font-normal">(e.g. 3 MB)</span>
                  </label>
                  <input
                    value={uploadSize}
                    onChange={e => setUploadSize(e.target.value)}
                    placeholder="2.4 MB"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Key concepts covered, chapter references, solution guidelines..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="uploadPublished"
                  checked={uploadPublished}
                  onChange={e => setUploadPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="uploadPublished" className="text-xs font-medium text-slate-700">
                  Publish immediately (Students will be able to view this resource)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-xs"
                >
                  {uploading ? 'Uploading...' : 'Save & Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE MODULE (Faculty / Admin)               */}
      {/* ---------------------------------------------------- */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Subject Module</h3>
                <p className="text-xs text-slate-500">Group course syllabus and resources into ordered modules</p>
              </div>
              <button
                onClick={() => setShowModuleModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModuleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={moduleSubjectId}
                  onChange={e => setModuleSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Module Title <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={moduleTitle}
                  onChange={e => setModuleTitle(e.target.value)}
                  placeholder="e.g., Module 4: Consensus & Fault Tolerance"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Module Sequence Order <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={moduleOrder}
                  onChange={e => setModuleOrder(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Module Description</label>
                <textarea
                  rows={2}
                  value={moduleDescription}
                  onChange={e => setModuleDescription(e.target.value)}
                  placeholder="Syllabus topics covered in this module..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingModule}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-xs"
                >
                  {creatingModule ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: EDIT RESOURCE METADATA (Faculty / Admin)      */}
      {/* ---------------------------------------------------- */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Resource Metadata</h3>
                <p className="text-xs text-slate-500">Update title, type, publish status, or linked module</p>
              </div>
              <button
                onClick={() => setEditingResource(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                <input
                  required
                  value={editingResource.title}
                  onChange={e => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Type</label>
                  <select
                    value={editingResource.fileType}
                    onChange={e => setEditingResource({ ...editingResource, fileType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="NOTES">Lecture Notes</option>
                    <option value="PPT">PPT / Slides</option>
                    <option value="PYQ">Question Paper</option>
                    <option value="VIDEO">Recorded Lecture</option>
                    <option value="REFERENCE">Reference Material</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Year</label>
                  <input
                    type="number"
                    value={editingResource.year || ''}
                    onChange={e => setEditingResource({ ...editingResource, year: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">File URL / Link</label>
                <input
                  required
                  value={editingResource.fileUrl}
                  onChange={e => setEditingResource({ ...editingResource, fileUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingResource.description || ''}
                  onChange={e => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editPublished"
                  checked={editingResource.isPublished}
                  onChange={e => setEditingResource({ ...editingResource, isPublished: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="editPublished" className="text-xs font-medium text-slate-700">
                  Published and visible to students
                </label>
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-xs"
                >
                  {savingEdit ? 'Saving...' : 'Update Metadata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* IN-BROWSER PDF PREVIEW MODAL                         */}
      {/* ---------------------------------------------------- */}
      {previewResource && (
        <PdfPreviewModal
          isOpen={Boolean(previewResource)}
          onClose={() => setPreviewResource(null)}
          title={previewResource.title}
          fileUrl={previewResource.fileUrl}
          subjectCode={previewResource.subject?.code}
          fileType={previewResource.fileType}
          year={previewResource.year}
          fileSize={previewResource.fileSize}
        />
      )}
    </div>
  );
};
