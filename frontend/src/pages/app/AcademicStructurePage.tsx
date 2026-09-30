// src/pages/app/AcademicStructurePage.tsx
import React, { useState, useEffect } from 'react';
import { AcademicService, UserService } from '../../services/api';
import { Department, Semester, Subject, Section, Enrollment, User } from '../../types';
import {
  Building2,
  GraduationCap,
  BookOpen,
  Layers,
  Building,
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const AcademicStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'departments' | 'semesters' | 'sections' | 'subjects' | 'modules' | 'enrollments'
  >('departments');

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<User[]>([]);
  const [studentUsers, setStudentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentSubjectFilter, setEnrollmentSubjectFilter] = useState('');

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Semester Modal State
  const [showSemModal, setShowSemModal] = useState(false);
  const [semNumber, setSemNumber] = useState(1);
  const [semName, setSemName] = useState('Semester 1');
  const [semYear, setSemYear] = useState('2025-2026');
  const [semActive, setSemActive] = useState(false);
  const [semDeptId, setSemDeptId] = useState('');
  const [editingSemId, setEditingSemId] = useState<string | null>(null);

  // Section Modal State
  const [showSecModal, setShowSecModal] = useState(false);
  const [secName, setSecName] = useState('');
  const [secDeptId, setSecDeptId] = useState('');
  const [secSemId, setSecSemId] = useState('');
  const [editingSecId, setEditingSecId] = useState<string | null>(null);

  // Subject Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState(3);
  const [subDeptId, setSubDeptId] = useState('');
  const [subSemId, setSubSemId] = useState('');
  const [subFacultyId, setSubFacultyId] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Assign Faculty Modal State
  const [assigningSubject, setAssigningSubject] = useState<Subject | null>(null);
  const [selectedFacultyProfileId, setSelectedFacultyProfileId] = useState('');

  // Module Modal State
  const [showModModal, setShowModModal] = useState(false);
  const [modSubjectId, setModSubjectId] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modOrder, setModOrder] = useState(1);
  const [modDesc, setModDesc] = useState('');
  const [editingModId, setEditingModId] = useState<string | null>(null);

  // Enrollment Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentProfileId, setEnrollStudentProfileId] = useState('');
  const [enrollSubjectId, setEnrollSubjectId] = useState('');
  const [enrollSectionId, setEnrollSectionId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState('ACTIVE');
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deptRes, semRes, secRes, subRes, enrRes, facRes, stuRes] = await Promise.all([
        AcademicService.getDepartments(),
        AcademicService.getSemesters(),
        AcademicService.getSections(),
        AcademicService.getSubjects(),
        AcademicService.getEnrollments(),
        UserService.getUsers({ role: 'FACULTY' }),
        UserService.getUsers(),
      ]);

      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (semRes.data.success) setSemesters(semRes.data.data);
      if (secRes.data.success) setSections(secRes.data.data);
      if (subRes.data.success) setSubjects(subRes.data.data);
      if (enrRes.data.success) setEnrollments(enrRes.data.data);
      if (facRes.data.success) setFacultyUsers(facRes.data.data);
      if (stuRes.data.success) {
        // Filter students & CRs who have studentProfile
        setStudentUsers(
          stuRes.data.data.filter(
            (u: User) => (u.role === 'STUDENT' || u.role === 'CR') && u.studentProfile
          )
        );
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to load structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // -------------------------------------------------------------
  // Department Handlers
  // -------------------------------------------------------------
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeptId) {
        await AcademicService.updateDepartment(editingDeptId, {
          name: deptName,
          code: deptCode,
          description: deptDesc,
        });
        showNotification('success', 'Department updated successfully');
      } else {
        await AcademicService.createDepartment({
          name: deptName,
          code: deptCode,
          description: deptDesc,
        });
        showNotification('success', 'Department created successfully');
      }
      setShowDeptModal(false);
      setEditingDeptId(null);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Delete department "${name}" and all dependent associations?`)) return;
    try {
      await AcademicService.deleteDepartment(id);
      showNotification('success', 'Department deleted successfully');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete department');
    }
  };

  // -------------------------------------------------------------
  // Semester Handlers
  // -------------------------------------------------------------
  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSemId) {
        await AcademicService.updateSemester(editingSemId, {
          number: Number(semNumber),
          name: semName,
          academicYear: semYear,
          isActive: semActive,
          departmentId: semDeptId || null,
        });
        showNotification('success', 'Semester updated successfully');
      } else {
        await AcademicService.createSemester({
          number: Number(semNumber),
          name: semName,
          academicYear: semYear,
          isActive: semActive,
          departmentId: semDeptId || undefined,
        });
        showNotification('success', 'Semester created successfully');
      }
      setShowSemModal(false);
      setEditingSemId(null);
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteSemester = async (id: string) => {
    if (!window.confirm('Delete this semester?')) return;
    try {
      await AcademicService.deleteSemester(id);
      showNotification('success', 'Semester deleted');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Delete failed');
    }
  };

  // -------------------------------------------------------------
  // Section Handlers
  // -------------------------------------------------------------
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSecId) {
        await AcademicService.updateSection(editingSecId, {
          name: secName,
          departmentId: secDeptId,
          semesterId: secSemId,
        });
        showNotification('success', 'Section updated successfully');
      } else {
        await AcademicService.createSection({
          name: secName,
          departmentId: secDeptId,
          semesterId: secSemId,
        });
        showNotification('success', 'Section created successfully');
      }
      setShowSecModal(false);
      setEditingSecId(null);
      setSecName('');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!window.confirm(`Delete section "${name}"?`)) return;
    try {
      await AcademicService.deleteSection(id);
      showNotification('success', 'Section deleted');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Delete failed');
    }
  };

  // -------------------------------------------------------------
  // Subject Handlers
  // -------------------------------------------------------------
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubId) {
        await AcademicService.updateSubject(editingSubId, {
          name: subName,
          code: subCode,
          credits: Number(subCredits),
          departmentId: subDeptId,
          semesterId: subSemId,
          facultyId: subFacultyId || null,
        });
        showNotification('success', 'Subject updated successfully');
      } else {
        await AcademicService.createSubject({
          name: subName,
          code: subCode,
          credits: Number(subCredits),
          departmentId: subDeptId,
          semesterId: subSemId,
          facultyId: subFacultyId || undefined,
        });
        showNotification('success', 'Subject created successfully');
      }
      setShowSubModal(false);
      setEditingSubId(null);
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    if (!window.confirm(`Delete subject "${code}" and all associated materials?`)) return;
    try {
      await AcademicService.deleteSubject(id);
      showNotification('success', 'Subject deleted');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Delete failed');
    }
  };

  // Assign Faculty
  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSubject) return;
    try {
      await AcademicService.assignFaculty(assigningSubject.id, selectedFacultyProfileId || null);
      showNotification('success', `Faculty assignment updated for ${assigningSubject.code}`);
      setAssigningSubject(null);
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to assign faculty');
    }
  };

  // -------------------------------------------------------------
  // Module Handlers
  // -------------------------------------------------------------
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingModId) {
        await AcademicService.updateModule(editingModId, {
          title: modTitle,
          description: modDesc || undefined,
          orderIndex: Number(modOrder),
        });
        showNotification('success', 'Module updated successfully');
      } else {
        await AcademicService.createModule({
          title: modTitle,
          subjectId: modSubjectId,
          orderIndex: Number(modOrder),
          description: modDesc || undefined,
        });
        showNotification('success', 'Module created successfully');
      }
      setShowModModal(false);
      setEditingModId(null);
      setModTitle('');
      setModDesc('');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to save module');
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!window.confirm('Delete this module? Associated resources will be unlinked.')) return;
    try {
      await AcademicService.deleteModule(id);
      showNotification('success', 'Module deleted');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Delete failed');
    }
  };

  // -------------------------------------------------------------
  // Student Enrollment Handlers
  // -------------------------------------------------------------
  const handleSaveEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEnrollmentId) {
        await AcademicService.updateEnrollment(editingEnrollmentId, {
          status: enrollStatus,
          sectionId: enrollSectionId || null,
        });
        showNotification('success', 'Enrollment updated successfully');
      } else {
        await AcademicService.createEnrollment({
          studentId: enrollStudentProfileId,
          subjectId: enrollSubjectId,
          sectionId: enrollSectionId || undefined,
          status: enrollStatus,
        });
        showNotification('success', 'Student enrolled successfully');
      }
      setShowEnrollModal(false);
      setEditingEnrollmentId(null);
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to enroll student');
    }
  };

  const handleDeleteEnrollment = async (id: string, studentName: string, subjectCode: string) => {
    if (!window.confirm(`Unenroll ${studentName} from ${subjectCode}?`)) return;
    try {
      await AcademicService.deleteEnrollment(id);
      showNotification('success', 'Enrollment removed successfully');
      loadAll();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to unenroll');
    }
  };

  // Filtered lists
  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSemesters = semesters.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.academicYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSections = sections.filter(
    (sec) =>
      sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.department?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEnrollments = enrollments.filter((enr) => {
    if (enrollmentSubjectFilter && enr.subjectId !== enrollmentSubjectFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchStudent = enr.student?.user?.name.toLowerCase().includes(q);
      const matchRoll = enr.student?.rollNumber.toLowerCase().includes(q);
      const matchSubject = enr.subject?.code.toLowerCase().includes(q);
      if (!matchStudent && !matchRoll && !matchSubject) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
              Admin Workspace
            </span>
            <span className="text-xs text-slate-400">Academic Hierarchy & Enrollments</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Academic Structure Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure campus departments, semesters, sections, subjects, modules, faculty assignments, and student enrollments
          </p>
        </div>

        {/* Action Button based on tab */}
        <div>
          {activeTab === 'departments' && (
            <button
              onClick={() => {
                setEditingDeptId(null);
                setDeptName('');
                setDeptCode('');
                setDeptDesc('');
                setShowDeptModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Department
            </button>
          )}

          {activeTab === 'semesters' && (
            <button
              onClick={() => {
                setEditingSemId(null);
                setSemNumber(semesters.length + 1);
                setSemName(`Semester ${semesters.length + 1}`);
                setSemYear('2025-2026');
                setSemActive(false);
                setSemDeptId(departments[0]?.id || '');
                setShowSemModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Semester
            </button>
          )}

          {activeTab === 'sections' && (
            <button
              onClick={() => {
                setEditingSecId(null);
                setSecName('');
                setSecDeptId(departments[0]?.id || '');
                setSecSemId(semesters[0]?.id || '');
                setShowSecModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Section
            </button>
          )}

          {activeTab === 'subjects' && (
            <button
              onClick={() => {
                setEditingSubId(null);
                setSubName('');
                setSubCode('');
                setSubCredits(3);
                if (departments.length > 0) setSubDeptId(departments[0].id);
                if (semesters.length > 0) setSubSemId(semesters[0].id);
                setSubFacultyId('');
                setShowSubModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Subject
            </button>
          )}

          {activeTab === 'modules' && (
            <button
              onClick={() => {
                setEditingModId(null);
                if (subjects.length > 0) setModSubjectId(subjects[0].id);
                setModTitle('');
                setModOrder(1);
                setModDesc('');
                setShowModModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Module
            </button>
          )}

          {activeTab === 'enrollments' && (
            <button
              onClick={() => {
                setEditingEnrollmentId(null);
                if (studentUsers.length > 0) setEnrollStudentProfileId(studentUsers[0].studentProfile?.id || '');
                if (subjects.length > 0) setEnrollSubjectId(subjects[0].id);
                setEnrollSectionId('');
                setEnrollStatus('ACTIVE');
                setShowEnrollModal(true);
              }}
              className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Enroll Student
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold overflow-x-auto">
        {[
          { key: 'departments', label: 'Departments', icon: Building2, count: departments.length },
          { key: 'semesters', label: 'Semesters', icon: GraduationCap, count: semesters.length },
          { key: 'sections', label: 'Sections', icon: Building, count: sections.length },
          { key: 'subjects', label: 'Subjects & Faculty', icon: BookOpen, count: subjects.length },
          {
            key: 'modules',
            label: 'Course Modules',
            icon: Layers,
            count: subjects.reduce((acc, s) => acc + (s.modules?.length || 0), 0),
          },
          { key: 'enrollments', label: 'Student Enrollments', icon: UserCheck, count: enrollments.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setSearchTerm('');
              }}
              className={`flex items-center pb-3 border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        {activeTab === 'enrollments' && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={enrollmentSubjectFilter}
              onChange={(e) => setEnrollmentSubjectFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* TAB 1: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded">
                        {dept.code}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingDeptId(dept.id);
                            setDeptName(dept.name);
                            setDeptCode(dept.code);
                            setDeptDesc(dept.description || '');
                            setShowDeptModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-brand-600 rounded"
                          title="Edit department"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">{dept.name}</h3>
                    {dept.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{dept.description}</p>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-3 border-t border-slate-100 pt-3 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{dept._count?.subjects || 0}</p>
                      <p className="text-[10px] text-slate-400">Subjects</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{dept._count?.faculties || 0}</p>
                      <p className="text-[10px] text-slate-400">Faculty</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{dept._count?.students || 0}</p>
                      <p className="text-[10px] text-slate-400">Students</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: SEMESTERS */}
          {activeTab === 'semesters' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredSemesters.map((sem) => (
                <div
                  key={sem.id}
                  className={`rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                    sem.isActive
                      ? 'border-brand-500 bg-brand-50/20 ring-1 ring-brand-500/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Sem {sem.number}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingSemId(sem.id);
                            setSemNumber(sem.number);
                            setSemName(sem.name);
                            setSemYear(sem.academicYear);
                            setSemActive(sem.isActive);
                            setSemDeptId(sem.departmentId || '');
                            setShowSemModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-brand-600 rounded"
                          title="Edit semester"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSemester(sem.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete semester"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">{sem.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Year: {sem.academicYear}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{sem._count?.subjects || 0} Subjects</span>
                    {sem.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Current
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SECTIONS */}
          {activeTab === 'sections' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSections.length === 0 ? (
                <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Building className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-900">No sections found</h3>
                  <p className="mt-1 text-xs text-slate-500">Create classroom sections for your academic semesters.</p>
                </div>
              ) : (
                filteredSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded">
                          {sec.department?.code || 'DEPT'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingSecId(sec.id);
                              setSecName(sec.name);
                              setSecDeptId(sec.departmentId);
                              setSecSemId(sec.semesterId);
                              setShowSecModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-brand-600 rounded"
                            title="Edit section"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-900">{sec.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sec.department?.name} &bull; {sec.semester?.name || 'Semester'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-600 font-semibold">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{sec._count?.students || 0} Students</span>
                      </div>
                      {sec.crProfiles && sec.crProfiles.length > 0 ? (
                        <div className="flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                          <span>CR: {sec.crProfiles[0].user?.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No CR assigned</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: SUBJECTS & FACULTY */}
          {activeTab === 'subjects' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Department & Sem</th>
                      <th className="py-3.5 px-4">Credits</th>
                      <th className="py-3.5 px-4">Assigned Faculty</th>
                      <th className="py-3.5 px-4">Overview</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{sub.name}</div>
                          <div className="font-mono text-[11px] text-brand-600 font-semibold">
                            {sub.code}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700">{sub.department?.code}</div>
                          <div className="text-[11px] text-slate-400">{sub.semester?.name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-700">{sub.credits}</span> Credits
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.faculty ? (
                            <div>
                              <div className="font-bold text-slate-800">
                                {sub.faculty.user?.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {sub.faculty.designation}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span>{sub._count?.enrollments || 0} Students</span>
                            <span>&bull;</span>
                            <span>{sub._count?.modules || 0} Modules</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setAssigningSubject(sub);
                                setSelectedFacultyProfileId(sub.facultyId || '');
                              }}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-bold border border-brand-200 text-brand-700 hover:bg-brand-50 transition"
                            >
                              Assign Faculty
                            </button>
                            <button
                              onClick={() => {
                                setEditingSubId(sub.id);
                                setSubName(sub.name);
                                setSubCode(sub.code);
                                setSubCredits(sub.credits);
                                setSubDeptId(sub.departmentId);
                                setSubSemId(sub.semesterId);
                                setSubFacultyId(sub.facultyId || '');
                                setShowSubModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-brand-600 rounded"
                              title="Edit Subject"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(sub.id, sub.code)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete Subject"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COURSE MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              {subjects.map((sub) => {
                const subModules = sub.modules || [];
                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                        <h3 className="inline-block ml-2 text-base font-bold text-slate-900">
                          {sub.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setEditingModId(null);
                          setModSubjectId(sub.id);
                          setModTitle('');
                          setModOrder(subModules.length + 1);
                          setModDesc('');
                          setShowModModal(true);
                        }}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                      >
                        + Add Module
                      </button>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {subModules.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No syllabus modules created for this course yet.
                        </p>
                      ) : (
                        subModules
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((mod) => (
                            <div
                              key={mod.id}
                              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-50 transition"
                            >
                              <div className="flex items-start space-x-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                                  {mod.orderIndex}
                                </span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">{mod.title}</h4>
                                  {mod.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {mod.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingModId(mod.id);
                                    setModSubjectId(sub.id);
                                    setModTitle(mod.title);
                                    setModOrder(mod.orderIndex);
                                    setModDesc(mod.description || '');
                                    setShowModModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-brand-600 rounded"
                                  title="Edit module"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteModule(mod.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete module"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 6: STUDENT ENROLLMENTS */}
          {activeTab === 'enrollments' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Enrolled Course / Subject</th>
                      <th className="py-3.5 px-4">Department & Section</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          No student enrollments found matching current criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {enr.student?.user?.name || 'Student'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {enr.student?.rollNumber} &bull; {enr.student?.user?.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {enr.subject?.name}
                            </div>
                            <div className="font-mono text-[11px] text-brand-600 font-semibold">
                              {enr.subject?.code} &bull; {enr.subject?.credits} Credits
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-700">
                              {enr.student?.department?.code || enr.subject?.department?.code}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Section: {enr.section?.name || enr.student?.section?.name || 'General'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                enr.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : enr.status === 'COMPLETED'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {enr.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingEnrollmentId(enr.id);
                                  setEnrollStatus(enr.status);
                                  setEnrollSectionId(enr.sectionId || '');
                                  setShowEnrollModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-brand-600 rounded"
                                title="Edit Enrollment"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteEnrollment(
                                    enr.id,
                                    enr.student?.user?.name || 'Student',
                                    enr.subject?.code || 'Course'
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Cancel Enrollment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: DEPARTMENT                                */}
      {/* ------------------------------------------------ */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingDeptId ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setShowDeptModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Name</label>
                <input
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Computer Science & Engineering"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Code</label>
                <input
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="CSE"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Department academic overview..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingDeptId ? 'Update' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: SEMESTER                                  */}
      {/* ------------------------------------------------ */}
      {showSemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSemId ? 'Edit Semester' : 'Create Academic Semester'}
              </h3>
              <button onClick={() => setShowSemModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveSemester} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Number (1-8)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={semNumber}
                    onChange={(e) => setSemNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Name</label>
                  <input
                    required
                    value={semName}
                    onChange={(e) => setSemName(e.target.value)}
                    placeholder="Semester 6"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Academic Year</label>
                <input
                  required
                  value={semYear}
                  onChange={(e) => setSemYear(e.target.value)}
                  placeholder="2025-2026"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="semActive"
                  checked={semActive}
                  onChange={(e) => setSemActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                <label htmlFor="semActive" className="text-xs font-medium text-slate-700">
                  Mark as currently active semester
                </label>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSemModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingSemId ? 'Update' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: SECTION                                   */}
      {/* ------------------------------------------------ */}
      {showSecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSecId ? 'Edit Section' : 'Create Academic Section'}
              </h3>
              <button onClick={() => setShowSecModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveSection} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Section Name *</label>
                <input
                  required
                  value={secName}
                  onChange={(e) => setSecName(e.target.value.toUpperCase())}
                  placeholder="e.g. CSE-A or Section 1"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                <select
                  required
                  value={secDeptId}
                  onChange={(e) => setSecDeptId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Semester *</label>
                <select
                  required
                  value={secSemId}
                  onChange={(e) => setSecSemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSecModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingSecId ? 'Update' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: SUBJECT                                   */}
      {/* ------------------------------------------------ */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubId ? 'Edit Subject' : 'Create Academic Subject'}
              </h3>
              <button onClick={() => setShowSubModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject Name</label>
                  <input
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="Distributed Systems"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Code</label>
                  <input
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                    placeholder="CS601"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    required
                    value={subDeptId}
                    onChange={(e) => setSubDeptId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Semester</label>
                  <select
                    required
                    value={subSemId}
                    onChange={(e) => setSubSemId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assign Faculty / Instructor
                </label>
                <select
                  value={subFacultyId}
                  onChange={(e) => setSubFacultyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Unassigned (Assign later) —</option>
                  {facultyUsers.map((f) => (
                    <option key={f.facultyProfile?.id || f.id} value={f.facultyProfile?.id || ''}>
                      {f.name} ({f.facultyProfile?.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingSubId ? 'Update' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: ASSIGN FACULTY                            */}
      {/* ------------------------------------------------ */}
      {assigningSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign Faculty Instructor</h3>
                <p className="text-xs text-slate-500">
                  {assigningSubject.code} &bull; {assigningSubject.name}
                </p>
              </div>
              <button onClick={() => setAssigningSubject(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleAssignFaculty} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Faculty Member
                </label>
                <select
                  value={selectedFacultyProfileId}
                  onChange={(e) => setSelectedFacultyProfileId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Unassigned (Remove current instructor) —</option>
                  {facultyUsers.map((f) => (
                    <option key={f.facultyProfile?.id || f.id} value={f.facultyProfile?.id || ''}>
                      {f.name} ({f.facultyProfile?.designation || 'Faculty'}) - {f.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningSubject(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: MODULE (CREATE / EDIT)                    */}
      {/* ------------------------------------------------ */}
      {showModModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingModId ? 'Edit Course Module' : 'Create Course Module'}
              </h3>
              <button onClick={() => setShowModModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveModule} className="space-y-3">
              {!editingModId && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                  <select
                    required
                    value={modSubjectId}
                    onChange={(e) => setModSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Module Title</label>
                <input
                  required
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  placeholder="Module 1: Foundations..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order Sequence</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={modOrder}
                  onChange={(e) => setModOrder(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingModId ? 'Update Module' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: STUDENT ENROLLMENT                        */}
      {/* ------------------------------------------------ */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingEnrollmentId ? 'Edit Student Enrollment' : 'Enroll Student in Subject'}
                </h3>
                <p className="text-xs text-slate-500">Manage course participation and status</p>
              </div>
              <button onClick={() => setShowEnrollModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment} className="space-y-3.5">
              {!editingEnrollmentId ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Select Student *
                    </label>
                    <select
                      required
                      value={enrollStudentProfileId}
                      onChange={(e) => setEnrollStudentProfileId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                    >
                      {studentUsers.map((stu) => (
                        <option
                          key={stu.studentProfile?.id || stu.id}
                          value={stu.studentProfile?.id || stu.id}
                        >
                          {stu.name} ({stu.studentProfile?.rollNumber}) - {stu.studentProfile?.department?.code || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Select Subject / Course *
                    </label>
                    <select
                      required
                      value={enrollSubjectId}
                      onChange={(e) => setEnrollSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name} ({s.department?.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Section (Optional)</label>
                <select
                  value={enrollSectionId}
                  onChange={(e) => setEnrollSectionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Student Default Section —</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.department?.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enrollment Status</label>
                <select
                  value={enrollStatus}
                  onChange={(e) => setEnrollStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DROPPED">DROPPED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs"
                >
                  {editingEnrollmentId ? 'Update Status' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
