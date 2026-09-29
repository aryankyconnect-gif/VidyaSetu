// src/pages/public/LandingPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Users,
  CheckCircle2,
  Sparkles,
  ClipboardCheck,
  Bell,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleQuickDemoLogin = async (email: string, pass: string) => {
    try {
      const res = await api.post('/auth/login', { email, password: pass });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/app/dashboard');
      }
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">VidyaSetu</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                Campus Learning Platform
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-600 transition"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 transition"
            >
              Open Campus Portal
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/80 px-3.5 py-1 text-xs font-bold text-brand-700 mb-6 shadow-xs">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
                Modern College LMS Architecture
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-tight">
                Your Campus, Your Learning, <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                  One Platform.
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                VidyaSetu unifies college students, faculty members, class representatives, and campus administrators into a single, high-performance academic ecosystem.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  to="/login"
                  className="rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg transition transform hover:-translate-y-0.5"
                >
                  Explore Demo Dashboards
                </Link>
                <a
                  href="#roles"
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  View Role Capabilities
                </a>
              </div>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="mt-16 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/40">
              <div className="border-b border-slate-100 pb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Instant One-Click Demo Access</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click any role to log in immediately with preloaded academic data.</p>
                </div>
                <span className="mt-2 sm:mt-0 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 self-start sm:self-auto">
                  Live PostgreSQL 17 Cluster
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Admin demo card */}
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 transition hover:border-purple-300">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">ADMIN</span>
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">Dr. Arvind Sharma</h4>
                  <p className="text-xs text-slate-500">System management, user control, academic hierarchy</p>
                  <button
                    onClick={() => handleQuickDemoLogin('admin@vidyasetu.edu', 'admin123')}
                    className="mt-4 w-full rounded-lg bg-purple-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition"
                  >
                    Enter as Admin &rarr;
                  </button>
                </div>

                {/* Faculty demo card */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 transition hover:border-blue-300">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">FACULTY</span>
                    <BookOpen className="h-4 w-4 text-brand-600" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">Prof. Rajesh Verma</h4>
                  <p className="text-xs text-slate-500">Subject manager, resource uploads, assignment grading, quizzes</p>
                  <button
                    onClick={() => handleQuickDemoLogin('faculty@vidyasetu.edu', 'faculty123')}
                    className="mt-4 w-full rounded-lg bg-brand-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition"
                  >
                    Enter as Faculty &rarr;
                  </button>
                </div>

                {/* CR demo card */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 transition hover:border-amber-300">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">CLASS REP</span>
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">Aman Gupta (CR)</h4>
                  <p className="text-xs text-slate-500">Section CSE-A liaison, class notices, peer directory</p>
                  <button
                    onClick={() => handleQuickDemoLogin('cr@vidyasetu.edu', 'cr123')}
                    className="mt-4 w-full rounded-lg bg-amber-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                  >
                    Enter as CR &rarr;
                  </button>
                </div>

                {/* Student demo card */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 transition hover:border-emerald-300">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">STUDENT</span>
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">Priya Sharma</h4>
                  <p className="text-xs text-slate-500">Coursework access, quiz player, grades, assignment submissions</p>
                  <button
                    onClick={() => handleQuickDemoLogin('student@vidyasetu.edu', 'student123')}
                    className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Enter as Student &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section id="roles" className="border-t border-slate-200 bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Engineered for Academic Excellence
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                A normalized relational data model powering transparent campus administration.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 mb-5">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Modular Subject Architecture</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Organized by departments, semesters, sections, and modules. Direct access to lecture notes, PDF handouts, and external syllabus references.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-5">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assignments & Automated Quizzes</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Interactive timed multiple-choice assessments with instant automated scoring, alongside coursework submissions with faculty grading rubrics.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-5">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Audience-Targeted Bulletins</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Broadcast urgent campus announcements or segment by target role, department, or section. Real-time notification streams with unread tracking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-brand-400" />
            <span className="font-bold text-white text-sm">VidyaSetu</span>
            <span>&mdash; Your Campus, Your Learning, One Platform</span>
          </div>
          <p>&copy; 2026 VidyaSetu Higher Education Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
