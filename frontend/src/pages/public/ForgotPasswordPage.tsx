// src/pages/public/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { GraduationCap, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch {
      setIsSubmitted(true);
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
          Reset Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enter your registered campus email address
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200">
          {isSubmitted ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Instructions Dispatched</h3>
              <p className="mt-2 text-xs text-slate-600">
                If an account exists for <span className="font-semibold">{email}</span>, password reset instructions have been sent. (Development demo code: <b>123456</b>)
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/reset-password?email=' + encodeURIComponent(email))}
                  className="w-full rounded-xl bg-brand-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-700"
                >
                  Proceed to Reset Code Screen &rarr;
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Campus Email
                </label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@vidyasetu.edu"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-medium text-brand-600 hover:underline">
                  &larr; Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
