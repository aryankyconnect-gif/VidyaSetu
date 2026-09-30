// src/pages/app/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DashboardService } from '../../services/api';
import { RoleBadge, Badge } from '../../components/common/Badge';
import {
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Megaphone,
  MessageSquare,
  FolderArchive,
  CheckSquare,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await DashboardService.getStats();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard statistics', err);
      setError(err.response?.data?.message || 'Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Gathering real-time campus data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
        <h3 className="mt-3 text-sm font-bold text-rose-900">Failed to load campus statistics</h3>
        <p className="mt-1 text-xs text-rose-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 p-6 text-white shadow-lg shadow-brand-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Academic Session 2025-2026</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs text-blue-100/80 mt-1">
              VidyaSetu Centralized Portal &bull; Role:{' '}
              <span className="font-bold text-white capitalize">{user?.role.toLowerCase()}</span>
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {user?.role === 'ADMIN' && (
              <Link
                to="/app/analytics"
                className="inline-flex items-center rounded-xl bg-brand-500/30 border border-white/20 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-brand-500/40 transition"
              >
                <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                Academic Analytics
              </Link>
            )}
            <Link
              to="/app/announcements"
              className="inline-flex items-center rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 transition"
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              Campus Notices
            </Link>
          </div>
        </div>
      </div>

      {/* Role-Specific Dashboard Views */}
      {user?.role === 'ADMIN' && <AdminDashboardView data={data} />}
      {user?.role === 'FACULTY' && <FacultyDashboardView data={data} />}
      {user?.role === 'CR' && <CRDashboardView data={data} />}
      {user?.role === 'STUDENT' && <StudentDashboardView data={data} />}
    </div>
  );
};

// ==========================================
// REUSABLE STAT CARD COMPONENT
// ==========================================
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  to?: string;
  sublabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor,
  bgColor,
  to,
  sublabel,
}) => {
  const cardContent = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition group h-full flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 truncate mr-2">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : '0'}
        </p>
        {sublabel && (
          <p className="mt-0.5 text-[11px] text-slate-400 font-medium truncate">{sublabel}</p>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block transition transform hover:-translate-y-0.5">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

// ==========================================
// ADMIN DASHBOARD VIEW
// ==========================================
const AdminDashboardView: React.FC<{ data: any }> = ({ data }) => {
  const metrics = data?.metrics || {};
  const logs = data?.recentAuditLogs || [];
  const departments = data?.departments || [];

  return (
    <div className="space-y-6">
      {/* 9 Core Database Statistics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Campus Live Overview
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            Database-backed Real Metrics
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
          <StatCard
            label="Total Students"
            value={metrics.totalStudents ?? 0}
            icon={GraduationCap}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-50"
            to="/app/users"
            sublabel="Registered students in database"
          />

          <StatCard
            label="Total Faculty"
            value={metrics.totalFaculty ?? 0}
            icon={BookOpen}
            iconColor="text-brand-600"
            bgColor="bg-brand-50"
            to="/app/users"
            sublabel="Faculty & department instructors"
          />

          <StatCard
            label="Total CRs"
            value={metrics.totalCRs ?? 0}
            icon={ShieldCheck}
            iconColor="text-amber-600"
            bgColor="bg-amber-50"
            to="/app/users"
            sublabel="Active Class Representatives"
          />

          <StatCard
            label="Total Departments"
            value={metrics.totalDepartments ?? 0}
            icon={Building}
            iconColor="text-purple-600"
            bgColor="bg-purple-50"
            to="/app/academic"
            sublabel="Academic faculties & departments"
          />

          <StatCard
            label="Total Subjects"
            value={metrics.totalSubjects ?? 0}
            icon={FileText}
            iconColor="text-indigo-600"
            bgColor="bg-indigo-50"
            to="/app/academic"
            sublabel="Curriculum subjects & courses"
          />

          <StatCard
            label="Total Resources"
            value={metrics.totalResources ?? 0}
            icon={FolderArchive}
            iconColor="text-sky-600"
            bgColor="bg-sky-50"
            to="/app/resources"
            sublabel="Uploaded course notes & materials"
          />

          <StatCard
            label="Total Assignments"
            value={metrics.totalAssignments ?? 0}
            icon={CheckSquare}
            iconColor="text-rose-600"
            bgColor="bg-rose-50"
            to="/app/assignments"
            sublabel="Coursework assignments posted"
          />

          <StatCard
            label="Total Submissions"
            value={metrics.totalSubmissions ?? 0}
            icon={TrendingUp}
            iconColor="text-teal-600"
            bgColor="bg-teal-50"
            to="/app/analytics"
            sublabel="Student submitted works"
          />

          <StatCard
            label="Total Quizzes"
            value={metrics.totalQuizzes ?? 0}
            icon={HelpCircle}
            iconColor="text-violet-600"
            bgColor="bg-violet-50"
            to="/app/quizzes"
            sublabel="Published & active quiz assessments"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Academic Departments</h3>
            <Link to="/app/subjects" className="text-xs font-semibold text-brand-600 hover:underline">
              Manage Subjects &rarr;
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {departments.map((dept: any) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {dept.name} <span className="text-xs text-brand-600 font-mono">({dept.code})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{dept.description}</p>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-600 font-semibold">
                  <span className="rounded-md bg-white px-2 py-1 border border-slate-200">
                    {dept._count?.students || 0} Students
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 border border-slate-200">
                    {dept._count?.subjects || 0} Subjects
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Trail */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">System Audit Trail</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live</span>
          </div>
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent audit activity</p>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="text-xs border-b border-slate-50 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.details}</p>
                  {log.user && (
                    <span className="text-[10px] text-slate-400">by {log.user.name} ({log.user.role})</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// FACULTY DASHBOARD VIEW
// ==========================================
const FacultyDashboardView: React.FC<{ data: any }> = ({ data }) => {
  const metrics = data?.metrics || {};
  const subjects = data?.assignedSubjects || [];
  const submissions = data?.recentSubmissions || [];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Assigned Courses</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-600">{metrics.assignedSubjectsCount || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Active Students</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.totalStudentsTaught || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Submissions to Grade</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.pendingGradingCount || 0}</p>
        </div>
      </div>

      {/* Doubt Hub Banner Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Faculty Help Desk &bull; Doubt Hub</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review and answer academic doubts asked by students across your assigned subjects.
            </p>
          </div>
        </div>
        <Link
          to="/app/doubts"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition shrink-0"
        >
          Open Doubt Hub &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned Subjects */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Assigned Subject Portfolios</h3>
            <Link to="/app/subjects" className="text-xs font-semibold text-brand-600 hover:underline">
              View All Subjects &rarr;
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {subjects.map((sub: any) => (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 hover:border-brand-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {sub.code}
                  </span>
                  <span className="text-xs text-slate-500">{sub.credits} Credits</span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-900">{sub.name}</h4>
                <p className="text-xs text-slate-500">{sub.department?.name}</p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs text-slate-600">
                  <span>{sub._count?.enrollments || 0} Students</span>
                  <span>{sub._count?.assignments || 0} Assignments</span>
                  <Link
                    to={`/app/subjects/${sub.id}`}
                    className="font-bold text-brand-600 hover:text-brand-700"
                  >
                    Open &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Submissions Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Grading Queue</h3>
            <Link to="/app/assignments" className="text-xs font-semibold text-brand-600 hover:underline">
              All Assignments
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {submissions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No submissions waiting for grading.</p>
            ) : (
              submissions.map((sub: any) => (
                <div key={sub.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{sub.student?.user?.name}</p>
                    {sub.grade ? (
                      <Badge variant="success">Graded ({sub.grade.marksObtained})</Badge>
                    ) : (
                      <Badge variant="warning">Needs Grade</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 truncate">{sub.assignment?.title}</p>
                  <div className="mt-2 flex justify-end">
                    <Link
                      to={`/app/assignments/${sub.assignment?.id}`}
                      className="text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      Grade Submission &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CR DASHBOARD VIEW
// ==========================================
const CRDashboardView: React.FC<{ data: any }> = ({ data }) => {
  const section = data?.section;
  const metrics = data?.metrics || {};
  const peers = data?.peerStudents || [];
  const announcements = data?.activeAnnouncements || [];

  return (
    <div className="space-y-6">
      {/* Section Tag */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-md bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-bold">
              Class Representative (CR)
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Section: {section?.name || 'CSE-A'}
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Department: {section?.department?.name} &bull; {section?.semester?.name}
          </p>
        </div>
        <Link
          to="/app/announcements"
          className="mt-3 sm:mt-0 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
        >
          Post Class Announcement &rarr;
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Section Strength</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.peersCount || 0} Students</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Active Courseworks</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.enrolledSubjectsCount || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Class Notices</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.announcementsCount || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Class Roster */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Section Student Directory ({peers.length})
          </h3>
          <div className="mt-4 space-y-2">
            {peers.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                    {p.user?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.user?.name}</p>
                    <p className="text-[11px] text-slate-500">{p.user?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {p.rollNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Active Class Bulletins
          </h3>
          <div className="mt-4 space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50/50 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant={a.priority === 'URGENT' ? 'danger' : 'warning'}>{a.priority}</Badge>
                  <span className="text-[10px] text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="mt-1 font-bold text-slate-900">{a.title}</h4>
                <p className="text-slate-600 mt-0.5 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STUDENT DASHBOARD VIEW
// ==========================================
const StudentDashboardView: React.FC<{ data: any }> = ({ data }) => {
  const metrics = data?.metrics || {};
  const subjects = data?.enrolledSubjects || [];
  const assignments = data?.assignments || [];
  const quizzes = data?.upcomingQuizzes || [];
  const grades = data?.recentGrades || [];

  return (
    <div className="space-y-6">
      {/* Student Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Enrolled Subjects</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-600">{metrics.enrolledSubjectsCount || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Registered Credits</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.totalCredits || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Pending Assignments</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.pendingAssignmentsCount || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Completed Quizzes</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.completedQuizzesCount || 0}</p>
        </div>
      </div>

      {/* Enrolled Subjects Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Enrolled Courses & Syllabi</h3>
          <Link to="/app/subjects" className="text-xs font-semibold text-brand-600 hover:underline">
            All Course Details &rarr;
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((sub: any) => (
            <div
              key={sub.id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-brand-400 hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded">
                  {sub.code}
                </span>
                <span className="text-xs text-slate-500">{sub.credits} Credits</span>
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-900 line-clamp-1">{sub.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {sub.faculty?.user?.name || 'Faculty Assigned'}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs">
                <span className="text-slate-500">{sub._count?.modules || 0} Modules</span>
                <Link
                  to={`/app/subjects/${sub.id}`}
                  className="font-bold text-brand-600 hover:text-brand-700"
                >
                  Study &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assignments Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Assignments</h3>
            <Link to="/app/assignments" className="text-xs font-semibold text-brand-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No assignments due</p>
            ) : (
              assignments.map((a: any) => {
                const sub = a.submissions?.[0];
                return (
                  <div key={a.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50/40 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-600">{a.subject?.code}</span>
                      {sub?.grade ? (
                        <Badge variant="success">Graded ({sub.grade.marksObtained}/{a.totalMarks})</Badge>
                      ) : sub ? (
                        <Badge variant="info">Submitted</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 mt-1">{a.title}</h4>
                    <p className="text-slate-500 mt-1 flex items-center">
                      <Clock className="mr-1 h-3 w-3" /> Due: {new Date(a.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quizzes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Quizzes & Assessments</h3>
            <Link to="/app/quizzes" className="text-xs font-semibold text-brand-600 hover:underline">
              Take Quiz
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {quizzes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active quizzes</p>
            ) : (
              quizzes.map((q: any) => {
                const attempt = q.attempts?.[0];
                return (
                  <div key={q.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50/40 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-600">{q.subject?.code}</span>
                      {attempt ? (
                        <Badge variant="success">Score: {attempt.score}/{q.totalMarks}</Badge>
                      ) : (
                        <Badge variant="primary">Available</Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 mt-1">{q.title}</h4>
                    <p className="text-slate-500 mt-1">{q.timeLimitMinutes} minutes &bull; {q.totalMarks} Marks</p>
                    <div className="mt-2 text-right">
                      <Link
                        to={`/app/quizzes/${q.id}`}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        {attempt ? 'View Results &rarr;' : 'Start Quiz &rarr;'}
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Grades & Feedback */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Grades</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verified</span>
          </div>
          <div className="mt-4 space-y-3">
            {grades.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No graded submissions yet</p>
            ) : (
              grades.map((g: any) => (
                <div key={g.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50/40 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{g.submission?.assignment?.title}</p>
                    <span className="font-mono font-extrabold text-emerald-600">
                      {g.marksObtained}/{g.submission?.assignment?.totalMarks}
                    </span>
                  </div>
                  {g.feedback && (
                    <p className="mt-1 text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                      &ldquo;{g.feedback}&rdquo;
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">Graded by {g.gradedBy?.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
