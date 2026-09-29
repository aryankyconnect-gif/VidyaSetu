// src/components/common/Breadcrumbs.tsx
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x && x !== 'app');

  const routeNames: Record<string, string> = {
    dashboard: 'Dashboard',
    subjects: 'Subjects',
    assignments: 'Assignments',
    quizzes: 'Quizzes',
    announcements: 'Announcements',
    resources: 'Resources',
    users: 'Users',
    profile: 'Profile',
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link to="/app/dashboard" className="flex items-center hover:text-slate-900 transition">
        <Home className="h-3.5 w-3.5 mr-1 text-slate-400" />
        <span>Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/app/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[value] || (value.length > 10 ? `${value.slice(0, 8)}...` : value);

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize">{displayName}</span>
            ) : (
              <Link to={to} className="hover:text-slate-900 transition capitalize">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
