// src/pages/public/UnauthorizedPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
        <ShieldAlert className="h-9 w-9" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        Your account role ({user?.role || 'Guest'}) does not have administrative clearance to access this protected area.
      </p>
      <div className="mt-6 flex space-x-3">
        <Link
          to="/app/dashboard"
          className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to My Dashboard
        </Link>
      </div>
    </div>
  );
};
