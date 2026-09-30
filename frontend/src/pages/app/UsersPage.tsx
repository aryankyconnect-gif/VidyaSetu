// src/pages/app/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { UserService, AcademicService } from '../../services/api';
import { User, Role, Department, Semester, Section } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  KeyRound,
  ShieldCheck,
  Check,
  X,
  Mail,
  Phone,
  Building,
  GraduationCap,
  BookOpen,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // Create form state
  const [createRole, setCreateRole] = useState<Role>('STUDENT');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRollNumber, setCreateRollNumber] = useState('');
  const [createBatchYear, setCreateBatchYear] = useState(new Date().getFullYear());
  const [createDeptId, setCreateDeptId] = useState('');
  const [createSemId, setCreateSemId] = useState('');
  const [createSecId, setCreateSecId] = useState('');
  const [createTerm, setCreateTerm] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createDesignation, setCreateDesignation] = useState('Assistant Professor');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<Role>('STUDENT');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editBatchYear, setEditBatchYear] = useState(2026);
  const [editDeptId, setEditDeptId] = useState('');
  const [editSemId, setEditSemId] = useState('');
  const [editSecId, setEditSecId] = useState('');
  const [editTerm, setEditTerm] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, semsRes, secsRes] = await Promise.all([
        UserService.getUsers(roleFilter !== 'ALL' ? { role: roleFilter } : {}),
        AcademicService.getDepartments(),
        AcademicService.getSemesters(),
        AcademicService.getSections(),
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (deptsRes.data.success) {
        setDepartments(deptsRes.data.data);
        if (deptsRes.data.data.length > 0 && !createDeptId) {
          setCreateDeptId(deptsRes.data.data[0].id);
        }
      }
      if (semsRes.data.success) {
        setSemesters(semsRes.data.data);
        if (semsRes.data.data.length > 0 && !createSemId) {
          setCreateSemId(semsRes.data.data[0].id);
        }
      }
      if (secsRes.data.success) setSections(secsRes.data.data);
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.response?.data?.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.isActive;
    try {
      await UserService.toggleStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u)));
      showNotification('success', `User account ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update user status');
    }
  };

  // Open Edit User Modal
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');

    if (u.studentProfile) {
      setEditRollNumber(u.studentProfile.rollNumber || '');
      setEditBatchYear(u.studentProfile.batchYear || 2026);
      setEditDeptId(u.studentProfile.departmentId || (departments[0]?.id || ''));
      setEditSemId(u.studentProfile.semesterId || (semesters[0]?.id || ''));
      setEditSecId(u.studentProfile.sectionId || '');
    } else {
      setEditRollNumber('');
      setEditBatchYear(2026);
      setEditDeptId(departments[0]?.id || '');
      setEditSemId(semesters[0]?.id || '');
      setEditSecId('');
    }

    if (u.crProfile) {
      setEditTerm(u.crProfile.term || '');
      setEditSecId(u.crProfile.sectionId || '');
    } else {
      setEditTerm('2026-2027');
    }

    if (u.facultyProfile) {
      setEditEmployeeId(u.facultyProfile.employeeId || '');
      setEditDesignation(u.facultyProfile.designation || 'Associate Professor');
      setEditDeptId(u.facultyProfile.departmentId || (departments[0]?.id || ''));
    } else {
      setEditEmployeeId('');
      setEditDesignation('Assistant Professor');
    }
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const payload: any = {
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
        phone: createPhone || undefined,
      };

      if (createRole === 'STUDENT' || createRole === 'CR') {
        payload.rollNumber = createRollNumber;
        payload.batchYear = Number(createBatchYear);
        payload.departmentId = createDeptId;
        payload.semesterId = createSemId;
        payload.sectionId = createSecId || undefined;
        if (createRole === 'CR') {
          payload.term = createTerm;
        }
      } else if (createRole === 'FACULTY') {
        payload.employeeId = createEmployeeId;
        payload.designation = createDesignation;
        payload.departmentId = createDeptId;
      }

      await UserService.createUser(payload);
      showNotification('success', `Created user ${createName} (${createRole})`);
      setShowCreateModal(false);
      // Reset form
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePhone('');
      setCreateRollNumber('');
      setCreateEmployeeId('');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submit Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        phone: editPhone || null,
        role: editRole,
      };

      if (editRole === 'STUDENT' || editRole === 'CR') {
        payload.rollNumber = editRollNumber;
        payload.batchYear = Number(editBatchYear);
        payload.departmentId = editDeptId;
        payload.semesterId = editSemId;
        payload.sectionId = editSecId || null;
        if (editRole === 'CR') {
          payload.term = editTerm;
        }
      } else if (editRole === 'FACULTY') {
        payload.employeeId = editEmployeeId;
        payload.designation = editDesignation;
        payload.departmentId = editDeptId;
      }

      await UserService.updateUser(editingUser.id, payload);
      showNotification('success', `Updated user ${editName}`);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 6) {
      showNotification('error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('error', 'Passwords do not match');
      return;
    }

    setSubmittingReset(true);
    try {
      await UserService.resetPassword(resettingUser.id, newPassword);
      showNotification('success', `Password reset successfully for ${resettingUser.name}`);
      setResettingUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmittingReset(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="danger">ADMIN</Badge>;
      case 'FACULTY':
        return <Badge variant="primary">FACULTY</Badge>;
      case 'CR':
        return <Badge variant="warning">CR</Badge>;
      case 'STUDENT':
        return <Badge variant="info">STUDENT</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const filteredUsers = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchRoll = u.studentProfile?.rollNumber?.toLowerCase().includes(q);
      const matchEmp = u.facultyProfile?.employeeId?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRoll && !matchEmp) return false;
    }
    return true;
  });

  const countByRole = (r: Role) => users.filter((u) => u.role === r).length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
              Admin Workspace
            </span>
            <span className="text-xs text-slate-400">Security & RBAC Accounts</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, faculty staff, class representatives, and system administrators
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create New User
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Students', count: countByRole('STUDENT'), color: 'text-sky-600 bg-sky-50' },
          { label: 'Faculty', count: countByRole('FACULTY'), color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Class Reps', count: countByRole('CR'), color: 'text-amber-600 bg-amber-50' },
          { label: 'Admins', count: countByRole('ADMIN'), color: 'text-rose-600 bg-rose-50' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{item.count}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, roll number, or employee ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {['ALL', 'STUDENT', 'FACULTY', 'CR', 'ADMIN'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                roleFilter === role
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No users found</h3>
          <p className="mt-1 text-xs text-slate-500">Try changing your search query or role filter.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Identifier / Dept</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const identifier =
                    u.studentProfile?.rollNumber ||
                    u.facultyProfile?.employeeId ||
                    u.crProfile?.studentProfileId ||
                    'Staff ID';

                  const dept =
                    u.studentProfile?.department?.name ||
                    u.facultyProfile?.department?.name ||
                    'Administration';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                            {u.name[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center mt-0.5 space-x-2">
                              <span className="flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {u.email}
                              </span>
                              {u.phone && (
                                <span className="flex items-center text-slate-400">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-700">{identifier}</div>
                        <div className="text-[11px] text-slate-400">{dept}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-400 font-semibold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mr-1.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Edit User & Roles"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setResettingUser(u);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition"
                            title="Reset Account Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                              u.isActive
                                ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: CREATE USER                               */}
      {/* ------------------------------------------------ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Campus Account</h3>
                <p className="text-xs text-slate-500">Provide user credentials and role-specific academic details</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Role *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['STUDENT', 'FACULTY', 'CR', 'ADMIN'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`rounded-xl py-2 px-3 text-xs font-bold transition border ${
                        createRole === r
                          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="john@vidyasetu.edu"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password * (Min 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* STUDENT or CR Specific Fields */}
              {(createRole === 'STUDENT' || createRole === 'CR') && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <GraduationCap className="h-4 w-4 text-brand-600" />
                    <span>Academic Student Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Roll Number *</label>
                      <input
                        required
                        value={createRollNumber}
                        onChange={(e) => setCreateRollNumber(e.target.value)}
                        placeholder="2026CSE099"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Batch Year</label>
                      <input
                        type="number"
                        value={createBatchYear}
                        onChange={(e) => setCreateBatchYear(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Department *</label>
                      <select
                        required
                        value={createDeptId}
                        onChange={(e) => setCreateDeptId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Semester *</label>
                      <select
                        required
                        value={createSemId}
                        onChange={(e) => setCreateSemId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.academicYear})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Section {createRole === 'CR' ? '*' : '(Optional)'}
                      </label>
                      <select
                        required={createRole === 'CR'}
                        value={createSecId}
                        onChange={(e) => setCreateSecId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">— Unassigned —</option>
                        {sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name} ({sec.department?.code || ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {createRole === 'CR' && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">CR Term</label>
                        <input
                          value={createTerm}
                          onChange={(e) => setCreateTerm(e.target.value)}
                          placeholder="2026-2027"
                          className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FACULTY Specific Fields */}
              {createRole === 'FACULTY' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                    <span>Faculty Staff Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Employee ID *</label>
                      <input
                        required
                        value={createEmployeeId}
                        onChange={(e) => setCreateEmployeeId(e.target.value)}
                        placeholder="EMP-CSE-105"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation *</label>
                      <input
                        required
                        value={createDesignation}
                        onChange={(e) => setCreateDesignation(e.target.value)}
                        placeholder="Associate Professor"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Department *</label>
                      <select
                        required
                        value={createDeptId}
                        onChange={(e) => setCreateDeptId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs disabled:opacity-50"
                >
                  {submittingCreate ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: EDIT USER & ASSIGN ROLE                   */}
      {/* ------------------------------------------------ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit User & Role Assignment</h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              {/* Role Assignment */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assign Role *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['STUDENT', 'FACULTY', 'CR', 'ADMIN'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`rounded-xl py-2 px-3 text-xs font-bold transition border ${
                        editRole === r
                          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Student/CR Fields */}
              {(editRole === 'STUDENT' || editRole === 'CR') && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <GraduationCap className="h-4 w-4 text-brand-600" />
                    <span>Academic Student Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Roll Number</label>
                      <input
                        value={editRollNumber}
                        onChange={(e) => setEditRollNumber(e.target.value)}
                        placeholder="2026CSE099"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Batch Year</label>
                      <input
                        type="number"
                        value={editBatchYear}
                        onChange={(e) => setEditBatchYear(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Department</label>
                      <select
                        value={editDeptId}
                        onChange={(e) => setEditDeptId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Semester</label>
                      <select
                        value={editSemId}
                        onChange={(e) => setEditSemId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.academicYear})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Section</label>
                      <select
                        value={editSecId}
                        onChange={(e) => setEditSecId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">— Unassigned —</option>
                        {sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name} ({sec.department?.code || ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {editRole === 'CR' && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">CR Term</label>
                        <input
                          value={editTerm}
                          onChange={(e) => setEditTerm(e.target.value)}
                          placeholder="2026-2027"
                          className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Faculty Fields */}
              {editRole === 'FACULTY' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                    <span>Faculty Staff Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Employee ID</label>
                      <input
                        value={editEmployeeId}
                        onChange={(e) => setEditEmployeeId(e.target.value)}
                        placeholder="EMP-CSE-105"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation</label>
                      <input
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        placeholder="Associate Professor"
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Department</label>
                      <select
                        value={editDeptId}
                        onChange={(e) => setEditDeptId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-xs disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL: RESET PASSWORD                            */}
      {/* ------------------------------------------------ */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Account Password</h3>
                <p className="text-xs text-slate-500">{resettingUser.name} &bull; {resettingUser.email}</p>
              </div>
              <button onClick={() => setResettingUser(null)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password (Min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
                <strong>Security Notice:</strong> The user will need to log in using this new password. Passwords are securely hashed with bcrypt.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-xs disabled:opacity-50"
                >
                  {submittingReset ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
