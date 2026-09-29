// src/pages/app/ProfilePage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { User, Mail, Phone, BookOpen, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await UserService.updateProfile({ name, phone });
      await refreshProfile();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'FACULTY':
        return 'primary';
      case 'CR':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile</h1>
        <p className="text-xs text-slate-500 mt-1">Manage your account information and academic details</p>
      </div>

      {successMsg && (
        <div className="flex items-center rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-extrabold text-white shadow-md">
            {user?.name?.[0] || 'U'}
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <div>
                <Badge variant={getRoleBadgeVariant(user?.role)}>{user?.role || 'USER'}</Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              {user?.studentProfile && (
                <>
                  <div>
                    <span className="text-slate-400">Roll Number:</span>{' '}
                    <strong className="font-mono text-slate-800">{user.studentProfile.rollNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Department:</span>{' '}
                    <strong className="text-slate-800">{user.studentProfile.department?.name || 'Computer Science'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Semester:</span>{' '}
                    <strong className="text-slate-800">{user.studentProfile.semester?.name || 'Semester 6'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Section:</span>{' '}
                    <strong className="text-slate-800">{user.studentProfile.section?.name || 'CSE-A'}</strong>
                  </div>
                </>
              )}

              {user?.facultyProfile && (
                <>
                  <div>
                    <span className="text-slate-400">Employee ID:</span>{' '}
                    <strong className="font-mono text-slate-800">{user.facultyProfile.employeeId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Designation:</span>{' '}
                    <strong className="text-slate-800">{user.facultyProfile.designation}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Department:</span>{' '}
                    <strong className="text-slate-800">{user.facultyProfile.department?.name || 'Computer Science'}</strong>
                  </div>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <div>
                  <span className="text-slate-400">Permissions:</span>{' '}
                  <strong className="text-slate-800">Super Administrator (Full Access)</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Edit Personal Information</h3>
        <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-bold text-slate-700">Full Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Email Address (Read Only)</label>
            <input
              disabled
              value={user?.email || ''}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Phone Number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
