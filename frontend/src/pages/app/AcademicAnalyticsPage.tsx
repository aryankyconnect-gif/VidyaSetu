// src/pages/app/AcademicAnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AnalyticsService } from '../../services/api';
import {
  StudentAnalyticsData,
  FacultyAnalyticsData,
  InstitutionalAnalyticsData,
} from '../../types';
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  GraduationCap,
  HelpCircle,
  FolderArchive,
  FileText,
  UserCheck,
  Calendar,
  Building,
  RefreshCw,
  Search,
  Award,
} from 'lucide-react';

export const AcademicAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  // View state for Admin: 'overview' | 'student' | 'faculty'
  const [adminViewTab, setAdminViewTab] = useState<'overview' | 'student' | 'faculty'>('overview');

  // Selected student / faculty for Admin or Faculty inspection
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string>('');
  const [selectedFacultyProfileId, setSelectedFacultyProfileId] = useState<string>('');

  // Data states
  const [institutionalData, setInstitutionalData] = useState<InstitutionalAnalyticsData | null>(null);
  const [studentData, setStudentData] = useState<StudentAnalyticsData | null>(null);
  const [facultyData, setFacultyData] = useState<FacultyAnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Institutional Overview (Admin only)
  const loadInstitutionalOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AnalyticsService.getInstitutionalOverview();
      if (res.data.success) {
        setInstitutionalData(res.data.data);
        if (res.data.data.studentsList?.length > 0 && !selectedStudentProfileId) {
          setSelectedStudentProfileId(res.data.data.studentsList[0].profileId);
        }
        if (res.data.data.facultyList?.length > 0 && !selectedFacultyProfileId) {
          setSelectedFacultyProfileId(res.data.data.facultyList[0].profileId);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load institutional overview');
    } finally {
      setLoading(false);
    }
  };

  // Load Student Analytics
  const loadStudentAnalytics = async (profileId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await AnalyticsService.getStudentAnalytics(profileId);
      if (res.data.success) {
        setStudentData(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load student analytics');
    } finally {
      setLoading(false);
    }
  };

  // Load Faculty Analytics
  const loadFacultyAnalytics = async (profileId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await AnalyticsService.getFacultyAnalytics(profileId);
      if (res.data.success) {
        setFacultyData(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load faculty analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN') {
      if (adminViewTab === 'overview') {
        loadInstitutionalOverview();
      } else if (adminViewTab === 'student') {
        loadStudentAnalytics(selectedStudentProfileId || undefined);
      } else if (adminViewTab === 'faculty') {
        loadFacultyAnalytics(selectedFacultyProfileId || undefined);
      }
    } else if (role === 'FACULTY') {
      loadFacultyAnalytics();
    } else if (role === 'STUDENT' || role === 'CR') {
      loadStudentAnalytics();
    }
  }, [role, adminViewTab]);

  const handleStudentChange = (profileId: string) => {
    setSelectedStudentProfileId(profileId);
    loadStudentAnalytics(profileId);
  };

  const handleFacultyChange = (profileId: string) => {
    setSelectedFacultyProfileId(profileId);
    loadFacultyAnalytics(profileId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200">
              Database-Driven Analytics
            </span>
            <span className="text-xs text-slate-400">Zero Fake Metrics &bull; Live Academic Records</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Academic Performance & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time evaluation of assignment completion, quiz scoring, grading progress, and curriculum engagement
          </p>
        </div>

        {/* Admin Navigation Tabs */}
        {role === 'ADMIN' && (
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setAdminViewTab('overview')}
              className={`rounded-lg px-3 py-1.5 transition ${
                adminViewTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Institutional Overview
            </button>
            <button
              onClick={() => {
                setAdminViewTab('student');
                if (selectedStudentProfileId) loadStudentAnalytics(selectedStudentProfileId);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                adminViewTab === 'student'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Analytics
            </button>
            <button
              onClick={() => {
                setAdminViewTab('faculty');
                if (selectedFacultyProfileId) loadFacultyAnalytics(selectedFacultyProfileId);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                adminViewTab === 'faculty'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Faculty Analytics
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <h3 className="mt-2 text-sm font-bold text-rose-900">Unable to load analytics</h3>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
          <button
            onClick={() => {
              if (role === 'ADMIN') {
                if (adminViewTab === 'overview') loadInstitutionalOverview();
                else if (adminViewTab === 'student') loadStudentAnalytics(selectedStudentProfileId);
                else loadFacultyAnalytics(selectedFacultyProfileId);
              } else if (role === 'FACULTY') loadFacultyAnalytics();
              else loadStudentAnalytics();
            }}
            className="mt-3 inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Computing actual academic records...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 1. ADMIN INSTITUTIONAL OVERVIEW */}
          {role === 'ADMIN' && adminViewTab === 'overview' && institutionalData && (
            <InstitutionalOverviewView
              data={institutionalData}
              onSelectStudent={(id) => {
                setAdminViewTab('student');
                handleStudentChange(id);
              }}
              onSelectFaculty={(id) => {
                setAdminViewTab('faculty');
                handleFacultyChange(id);
              }}
            />
          )}

          {/* 2. STUDENT ANALYTICS VIEW */}
          {((role === 'ADMIN' && adminViewTab === 'student') || role === 'STUDENT' || role === 'CR') && (
            <div>
              {role === 'ADMIN' && institutionalData && (
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <GraduationCap className="h-4 w-4 text-brand-600" />
                    <span>Select Student to Inspect:</span>
                  </div>
                  <select
                    value={selectedStudentProfileId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {institutionalData.studentsList?.map((s) => (
                      <option key={s.profileId} value={s.profileId}>
                        {s.name} ({s.rollNumber}) &bull; {s.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {studentData ? (
                <StudentAnalyticsView data={studentData} />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                  No student analytics data available.
                </div>
              )}
            </div>
          )}

          {/* 3. FACULTY ANALYTICS VIEW */}
          {((role === 'ADMIN' && adminViewTab === 'faculty') || role === 'FACULTY') && (
            <div>
              {role === 'ADMIN' && institutionalData && (
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                    <span>Select Faculty Member to Inspect:</span>
                  </div>
                  <select
                    value={selectedFacultyProfileId}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {institutionalData.facultyList?.map((f) => (
                      <option key={f.profileId} value={f.profileId}>
                        {f.name} ({f.employeeId}) &bull; {f.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {facultyData ? (
                <FacultyAnalyticsView data={facultyData} />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                  No faculty analytics data available.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ==========================================
// INSTITUTIONAL OVERVIEW VIEW
// ==========================================
const InstitutionalOverviewView: React.FC<{
  data: InstitutionalAnalyticsData;
  onSelectStudent: (id: string) => void;
  onSelectFaculty: (id: string) => void;
}> = ({ data, onSelectStudent, onSelectFaculty }) => {
  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Submissions</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.totalSubmissions}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">From {s.totalAssignments} assignments</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Grading Progress</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.gradingRate}%</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {s.gradedSubmissions} graded / {s.pendingGrading} pending
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Quiz Engagement</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <HelpCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.totalQuizAttempts}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Across {s.totalQuizzes} active quizzes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Course Materials</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <FolderArchive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.totalResources}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Published library resources</p>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Academic Department Distribution</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.departments.map((dept) => (
            <div
              key={dept.id}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                  {dept.code}
                </span>
                <h4 className="mt-2 text-sm font-bold text-slate-900">{dept.name}</h4>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{dept.studentsCount} Students</span>
                <span>{dept.facultyCount} Faculty</span>
                <span>{dept.subjectsCount} Subjects</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Selectors for Detailed Inspection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student Inspection Roster */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Student Performance Rosters</h3>
          <p className="text-xs text-slate-500 mb-3">Click any student to view their assignment completion & quiz scores</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {data.studentsList.map((stu) => (
              <div
                key={stu.profileId}
                onClick={() => onSelectStudent(stu.profileId)}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-brand-50 hover:border-brand-200 cursor-pointer transition text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{stu.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {stu.rollNumber} &bull; {stu.department}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-brand-600 hover:underline">
                  Inspect &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Inspection Roster */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Faculty Performance Rosters</h3>
          <p className="text-xs text-slate-500 mb-3">Click any instructor to view submission rate & grading progress</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {data.facultyList.map((fac) => (
              <div
                key={fac.profileId}
                onClick={() => onSelectFaculty(fac.profileId)}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-brand-50 hover:border-brand-200 cursor-pointer transition text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{fac.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {fac.employeeId} &bull; {fac.designation}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-brand-600 hover:underline">
                  Inspect &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STUDENT ANALYTICS VIEW
// ==========================================
const StudentAnalyticsView: React.FC<{ data: StudentAnalyticsData }> = ({ data }) => {
  const { student, assignmentCompletion: ac, quizPerformance: qp, subjectPerformance: sp, resourceUsage, academicActivity } = data;

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-lg">
            {student.name[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{student.name}</h2>
            <p className="text-xs text-slate-500 font-mono">
              Roll No: <span className="font-bold text-slate-700">{student.rollNumber}</span> &bull; {student.department} &bull; {student.semester}
              {student.section ? ` &bull; Section ${student.section}` : ''}
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Batch Year: <span className="font-bold text-slate-700">{student.batchYear}</span>
        </div>
      </div>

      {/* 1. ASSIGNMENT COMPLETION */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Assignment Completion</h3>
            <p className="text-xs text-slate-400">Coursework assigned across active enrolled subjects</p>
          </div>
          <span className="text-xs font-bold text-brand-600">
            {ac.completionPercentage}% Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, ac.completionPercentage)}%` }}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Total Assigned</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">{ac.totalAssigned}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Submitted</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{ac.totalSubmitted}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Pending</span>
            <span className="text-xl font-extrabold text-amber-600 mt-1 block">{ac.pendingCount}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Completion Rate</span>
            <span className="text-xl font-extrabold text-brand-600 mt-1 block">{ac.completionPercentage}%</span>
          </div>
        </div>

        {/* Assignment Lists or Empty State */}
        {!ac.hasData ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No assignment data available yet.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Pending assignments */}
            {ac.pendingAssignments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />
                  Pending Submissions ({ac.pendingAssignments.length})
                </h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
                  {ac.pendingAssignments.map((p) => (
                    <div key={p.id} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{p.title}</span>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.subjectCode} &bull; {p.subjectName}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">
                          Due: {new Date(p.dueDate).toLocaleDateString()}
                        </span>
                        {p.isOverdue && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted assignments */}
            {ac.submittedAssignments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Submitted Work ({ac.submittedAssignments.length})
                </h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
                  {ac.submittedAssignments.map((s) => (
                    <div key={s.submissionId} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{s.title}</span>
                        <div className="text-[11px] text-slate-400">
                          Submitted on {new Date(s.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        {s.isGraded ? (
                          <div>
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {s.marksObtained} / {s.totalMarks} pts
                            </span>
                            {s.feedback && (
                              <p className="text-[10px] text-slate-500 mt-1 italic max-w-xs truncate">
                                "{s.feedback}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. QUIZ PERFORMANCE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quiz Assessment Performance</h3>
            <p className="text-xs text-slate-400">Live score records from completed attempts</p>
          </div>
          <span className="text-xs font-bold text-violet-600">
            Average Score: {qp.averageScore}%
          </span>
        </div>

        {!qp.hasData ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No quiz attempts available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Visual Score Bars */}
            <div className="space-y-2.5">
              {qp.scores.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-bold text-slate-900">{q.title}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        ({q.subjectCode})
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {q.score} / {q.totalMarks} pts ({q.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        q.percentage >= 75
                          ? 'bg-emerald-500'
                          : q.percentage >= 50
                          ? 'bg-brand-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, q.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. SUBJECT-LEVEL PERFORMANCE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Subject-Level Academic Performance</h3>
          <p className="text-xs text-slate-400">Direct scores and completion breakdown per course</p>
        </div>

        {sp.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No enrolled subject data available.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sp.map((sub) => (
              <div
                key={sub.subjectId}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                      {sub.subjectCode}
                    </span>
                    <span className="text-[11px] text-slate-500">{sub.credits} Credits</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">{sub.subjectName}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Faculty: {sub.facultyName}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Assignments
                    </span>
                    <span className="font-bold text-slate-800">
                      {sub.submittedCount} / {sub.assignedCount} submitted
                    </span>
                    {sub.averageAssignmentScore !== null && (
                      <span className="text-[11px] text-emerald-600 block font-semibold mt-0.5">
                        Avg: {sub.averageAssignmentScore}%
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Quizzes
                    </span>
                    <span className="font-bold text-slate-800">
                      {sub.quizzesAttemptedCount} attempted
                    </span>
                    {sub.averageQuizScore !== null && (
                      <span className="text-[11px] text-violet-600 block font-semibold mt-0.5">
                        Avg: {sub.averageQuizScore}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. RESOURCE USAGE & AUDIT INTEGRITY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Resource Usage Tracking</h3>
        {!resourceUsage.isTracked ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <FolderArchive className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-700">No resource usage data available</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Student views, downloads, and access events are not currently tracked in the database.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-800 font-semibold">
            {resourceUsage.message}
          </div>
        )}
      </div>

      {/* 5. ACADEMIC ACTIVITY TIMELINE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Recent Academic Activity Log</h3>
        {academicActivity.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No academic activity records found yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {academicActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                    {act.type === 'SUBMISSION' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : act.type === 'QUIZ' ? (
                      <HelpCircle className="h-3.5 w-3.5 text-violet-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-brand-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{act.title}</span>
                    {act.details && (
                      <span className="text-slate-500 ml-2 text-[11px]">{act.details}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// FACULTY ANALYTICS VIEW
// ==========================================
const FacultyAnalyticsView: React.FC<{ data: FacultyAnalyticsData }> = ({ data }) => {
  const { faculty, assignmentSubmissionStats: ass, gradingProgress: gp, quizPerformance: qp, resourcePublishing: rp, facultyActivity } = data;

  return (
    <div className="space-y-6">
      {/* Faculty Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-lg">
            {faculty.name[0]?.toUpperCase() || 'F'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{faculty.name}</h2>
            <p className="text-xs text-slate-500">
              {faculty.designation} &bull; {faculty.department} &bull; Employee ID:{' '}
              <span className="font-mono font-bold text-slate-700">{faculty.employeeId}</span>
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Assigned Courses:{' '}
          <span className="font-bold text-brand-600">{faculty.subjectsCount} Subjects</span>
        </div>
      </div>

      {/* 1. ASSIGNMENT SUBMISSION RATE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Student Assignment Submission Rate</h3>
            <p className="text-xs text-slate-400">Based on students enrolled in faculty's assigned courses</p>
          </div>
          <span className="text-xs font-bold text-brand-600">
            {ass.overallSubmissionRate}% Turn-in Rate
          </span>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Posted Assignments</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">{ass.totalAssignments}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Expected Submissions</span>
            <span className="text-xl font-extrabold text-slate-700 mt-1 block">{ass.totalExpectedSubmissions}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Actual Received</span>
            <span className="text-xl font-extrabold text-teal-600 mt-1 block">{ass.totalActualSubmissions}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Submission Rate</span>
            <span className="text-xl font-extrabold text-brand-600 mt-1 block">{ass.overallSubmissionRate}%</span>
          </div>
        </div>

        {!ass.hasData ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No assignment data available yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
            {ass.assignments.map((a) => (
              <div key={a.id} className="p-3 bg-white flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{a.title}</span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {a.subjectCode} &bull; Due: {new Date(a.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">
                    {a.submissionCount} / {a.enrolledCount} ({a.submissionRate}%)
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {a.gradedCount} graded &bull; {a.pendingCount} pending
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GRADING PROGRESS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Grading & Evaluation Progress</h3>
            <p className="text-xs text-slate-400">Current evaluation status of submitted student work</p>
          </div>
          <span className="text-xs font-bold text-emerald-600">
            {gp.progressPercentage}% Graded
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, gp.progressPercentage)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Total Submitted</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">{gp.totalSubmissions}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Graded</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{gp.gradedSubmissions}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
            <span className="text-[11px] text-slate-500 font-semibold block">Pending Review</span>
            <span className="text-xl font-extrabold text-amber-600 mt-1 block">{gp.pendingGrading}</span>
          </div>
        </div>

        {!gp.hasData && (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No grading data available yet.
          </div>
        )}
      </div>

      {/* 3. QUIZ PERFORMANCE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quiz Assessment Statistics</h3>
            <p className="text-xs text-slate-400">Attempts and scoring for instructor's quizzes</p>
          </div>
          <span className="text-xs font-bold text-violet-600">
            Overall Average: {qp.overallAverageScore}%
          </span>
        </div>

        {!qp.hasData ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No quiz attempts available yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
            {qp.quizzes.map((q) => (
              <div key={q.id} className="p-3 bg-white flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{q.title}</span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {q.subjectCode} &bull; {q.questionsCount} Questions &bull; {q.totalMarks} Total Marks
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">
                    {q.attemptsCount} Attempts
                  </span>
                  <div className="text-[11px] font-semibold text-violet-600 mt-0.5">
                    {q.averageScorePercentage !== null ? `Avg: ${q.averageScorePercentage}%` : 'No attempts'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. RESOURCE PUBLISHING ACTIVITY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Resource Publishing Activity</h3>
            <p className="text-xs text-slate-400">Verified study notes & reference materials uploaded</p>
          </div>
          <span className="text-xs font-bold text-sky-600">
            {rp.totalPublished} Published Items
          </span>
        </div>

        {!rp.hasData ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No resource publishing activity recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Format Distribution Chips */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(rp.byType).map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-700"
                >
                  {type}: {count}
                </span>
              ))}
            </div>

            {/* Recent Publications */}
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
              {rp.recentResources.map((r) => (
                <div key={r.id} className="p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {r.fileType}
                    </span>
                    <span className="font-bold text-slate-900">{r.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {r.subjectCode} &bull; {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. FACULTY ACTIVITY TIMELINE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Recent Teaching & Evaluation Activity</h3>
        {facultyActivity.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No recent activity recorded.
          </p>
        ) : (
          <div className="space-y-2">
            {facultyActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <Award className="h-3.5 w-3.5 text-brand-600" />
                  <span className="font-bold text-slate-800">{act.title}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
