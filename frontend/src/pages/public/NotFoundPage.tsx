// src/pages/public/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
        <HelpCircle className="h-9 w-9" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        The campus resource, subject, or route you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Return to VidyaSetu Home
        </Link>
      </div>
    </div>
  );
};
