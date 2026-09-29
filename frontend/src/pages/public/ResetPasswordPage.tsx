// src/pages/public/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { GraduationCap, Lock, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        email,
        token,
        newPassword,
      });
      if (res.data.success) {
        alert('Password updated successfully! Please sign in with your new password.');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Please check reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900">VidyaSetu</span>
        </Link>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Set New Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Verification Code (Demo: 123456)
              </label>
              <div className="mt-1 relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                New Password
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Save New Password'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-medium text-slate-500 hover:underline">
                Cancel & Return to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
