// src/components/common/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from './Badge';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  Megaphone,
  FolderArchive,
  Users,
  UserCheck,
  GraduationCap,
  X,
  Sparkles,
  MessageSquare,
  Building2,
  BarChart2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      label: 'Dashboard',
      path: '/app/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Academic Analytics',
      path: '/app/analytics',
      icon: BarChart2,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Subjects & Modules',
      path: '/app/subjects',
      icon: BookOpen,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Assignments',
      path: '/app/assignments',
      icon: FileText,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Quizzes',
      path: '/app/quizzes',
      icon: HelpCircle,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'AI Learning Suite',
      path: '/app/ai-assistant',
      icon: Sparkles,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: '💬 Doubt Hub',
      path: '/app/doubts',
      icon: MessageSquare,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Announcements',
      path: '/app/announcements',
      icon: Megaphone,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Resource Vault & PYQ',
      path: '/app/resources',
      icon: FolderArchive,
      roles: ['ADMIN', 'FACULTY', 'CR', 'STUDENT'],
    },
    {
      label: 'Academic Structure',
      path: '/app/academic',
      icon: Building2,
      roles: ['ADMIN'],
    },
    {
      label: 'User Directory',
      path: '/app/users',
      icon: Users,
      roles: ['ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <NavLink to="/app/dashboard" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                VidyaSetu
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Campus LMS v1.0
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current user badge info */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
              <div className="mt-0.5">
                <RoleBadge role={user?.role || 'STUDENT'} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`mr-3 h-4 w-4 transition-colors ${
                        isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Campus tagline & AI status footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border border-blue-100">
            <div className="flex items-center space-x-2 text-brand-700">
              <Sparkles className="h-4 w-4 shrink-0" />
              <p className="text-[11px] font-bold">Campus AI Engine</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 leading-snug">
              Gemini-powered summaries & quiz auto-generation ready.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
