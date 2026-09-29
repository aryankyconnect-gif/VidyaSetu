// src/pages/app/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { UserService } from '../../services/api';
import { User, Role } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Users, Search, Filter, ShieldCheck, Check, X, UserCheck, UserX, Mail, Phone } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await UserService.getUsers(roleFilter !== 'ALL' ? { role: roleFilter } : {});
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.isActive;
    try {
      await UserService.toggleStatus(user.id, newStatus);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: newStatus } : u)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
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

  const filteredUsers = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchRoll = u.studentProfile?.rollNumber?.toLowerCase().includes(q);
      const matchEmp = u.facultyProfile?.employeeId?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchEmp) return false;
    }
    return true;
  });

  const countByRole = (r: Role) => users.filter(u => u.role === r).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
        <p className="text-xs text-slate-500 mt-1">Directory of students, faculty members, class representatives, and administrators</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Students', count: countByRole('STUDENT'), color: 'text-sky-600 bg-sky-50' },
          { label: 'Faculty', count: countByRole('FACULTY'), color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Class Reps', count: countByRole('CR'), color: 'text-amber-600 bg-amber-50' },
          { label: 'Admins', count: countByRole('ADMIN'), color: 'text-rose-600 bg-rose-50' },
        ].map(item => (
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
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, roll number, or employee ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'STUDENT', 'FACULTY', 'CR', 'ADMIN'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No users found</h3>
          <p className="mt-1 text-xs text-slate-500">Try changing your search terms or role filters.</p>
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
                {filteredUsers.map(u => {
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
                            {u.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center mt-0.5">
                              <Mail className="h-3 w-3 mr-1" />
                              {u.email}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
