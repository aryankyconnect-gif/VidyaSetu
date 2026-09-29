// src/pages/app/SubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AcademicService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Subject, Department } from '../../types';
import { BookOpen, Plus, Search, Filter, Layers, FileText, Users, ArrowRight } from 'lucide-react';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // New Subject Modal (Admin only)
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubCredits, setNewSubCredits] = useState(3);
  const [newSubDept, setNewSubDept] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const [subsRes, deptsRes] = await Promise.all([
        AcademicService.getSubjects(selectedDept ? { departmentId: selectedDept } : {}),
        AcademicService.getDepartments(),
      ]);
      if (subsRes.data.success) setSubjects(subsRes.data.data);
      if (deptsRes.data.success) {
        setDepartments(deptsRes.data.data);
        if (deptsRes.data.data.length > 0 && !newSubDept) {
          setNewSubDept(deptsRes.data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedDept]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const sems = await AcademicService.getSemesters();
      const activeSem = sems.data.data.find((s: any) => s.isActive) || sems.data.data[0];

      await AcademicService.createSubject({
        name: newSubName,
        code: newSubCode,
        credits: Number(newSubCredits),
        departmentId: newSubDept,
        semesterId: activeSem.id,
      });

      setShowModal(false);
      setNewSubName('');
      setNewSubCode('');
      fetchSubjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subject');
    } finally {
      setCreating(false);
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Subjects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse course syllabi, structured modules, and study materials
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add New Subject
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject name or code (e.g., CS601)..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading academic subjects...</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No subjects found</h3>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-md">
                    {sub.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{sub.credits} Credits</span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">{sub.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{sub.department?.name}</p>

                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600">
                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                    {sub.faculty?.user?.name ? sub.faculty.user.name.charAt(0) : '—'}
                  </div>
                  <span className="truncate">{sub.faculty?.user?.name || 'Faculty To Be Assigned'}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" /> {sub._count?.modules || 0} Modules
                  </span>
                  <span className="flex items-center">
                    <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" /> {sub._count?.resources || 0} Notes
                  </span>
                </div>

                <Link
                  to={`/app/subjects/${sub.id}`}
                  className="inline-flex items-center font-bold text-brand-600 hover:text-brand-700"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Subject Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create Academic Subject</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define a new course code and curriculum metadata.</p>

            <form onSubmit={handleCreateSubject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Subject Name</label>
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Advanced Computer Networks"
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="e.g. CS605"
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={newSubCredits}
                    onChange={(e) => setNewSubCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Department</label>
                <select
                  value={newSubDept}
                  onChange={(e) => setNewSubDept(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700"
                >
                  {creating ? 'Creating...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
