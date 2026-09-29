// src/pages/public/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { GraduationCap, ArrowRight, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success && res.data.data) {
        login(res.data.data.token, res.data.data.user);
        navigate('/app/dashboard');
      } else {
        setErrorMessage(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Unable to connect to VidyaSetu API. Please check server.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/30">
            <GraduationCap className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">VidyaSetu</span>
        </Link>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your campus account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Your Campus, Your Learning, One Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-200/80">
          {/* Quick Demo Credential Autofill Chips */}
          <div className="mb-6 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              <span>Select Demo Account:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@vidyasetu.edu', 'admin123')}
                className="rounded-lg border border-purple-200 bg-purple-50/60 px-2.5 py-1.5 text-left text-xs font-semibold text-purple-800 hover:bg-purple-100 transition"
              >
                🎓 Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('faculty@vidyasetu.edu', 'faculty123')}
                className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1.5 text-left text-xs font-semibold text-blue-800 hover:bg-blue-100 transition"
              >
                👨‍🏫 Faculty
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('cr@vidyasetu.edu', 'cr123')}
                className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
              >
                ⭐ Class Rep (CR)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('student@vidyasetu.edu', 'student123')}
                className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
              >
                📚 Student
              </button>
            </div>
          </div>

          {isExpired && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
              Your session has expired. Please sign in again.
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 shrink-0 text-rose-500" />
              {errorMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Campus Email Address
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vidyasetu.edu"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 focus:outline-none transition disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Portal'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-900">
              &larr; Back to VidyaSetu Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
