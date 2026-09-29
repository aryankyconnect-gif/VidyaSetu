// src/pages/app/AnnouncementsPage.tsx
import React, { useState, useEffect } from 'react';
import { AnnouncementService, AIServiceClient } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Announcement } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Megaphone, Plus, Trash2, Sparkles, X, Clock, Pin, AlertTriangle, Info } from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'FACULTY' || user?.role === 'CR';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [targetRole, setTargetRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI draft state
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await AnnouncementService.getAnnouncements();
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await AnnouncementService.createAnnouncement({
        title,
        content,
        priority,
        targetRole: targetRole || null,
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      setPriority('MEDIUM');
      setTargetRole('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this announcement?')) return;
    try {
      await AnnouncementService.deleteAnnouncement(id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const handleAiDraft = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    try {
      const res = await AIServiceClient.draftAnnouncement(aiTopic, targetRole || 'Students', [aiTopic]);
      if (res.data.success && res.data.data) {
        setTitle(res.data.data.title || `Notice: ${aiTopic}`);
        setContent(res.data.data.content || res.data.data.draft || '');
        setShowAiDraft(false);
        setAiTopic('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI drafting failed. You can write your announcement directly.');
    } finally {
      setAiLoading(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <Badge variant="danger">URGENT</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High Priority</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">General</Badge>;
      default:
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filterPriority !== 'ALL' && a.priority !== filterPriority) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campus Notice Board</h1>
          <p className="text-xs text-slate-500 mt-1">Official circulars, academic notices, and department updates</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Post Notice
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterPriority(tab)}
            className={`rounded-lg px-3 py-1.5 font-semibold transition ${
              filterPriority === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' ? 'All Notices' : tab}
          </button>
        ))}
      </div>

      {/* Notices List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No notices in this category</h3>
          <p className="mt-1 text-xs text-slate-500">Check back later or post a new campus announcement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map(notice => {
            const isAuthor = notice.authorId === user?.id || user?.role === 'ADMIN';
            const isUrgent = notice.priority === 'URGENT';

            return (
              <div
                key={notice.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  isUrgent ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      {isUrgent && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                      {getPriorityBadge(notice.priority)}
                      {notice.targetRole && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                          To: {notice.targetRole}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-slate-900">{notice.title}</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-line">{notice.content}</p>

                    <div className="mt-4 flex items-center flex-wrap gap-4 text-[11px] text-slate-400">
                      <span>Posted by <strong className="text-slate-700">{notice.author?.name || 'Academic Office'}</strong> ({notice.author?.role})</span>
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(notice.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      title="Delete notice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Campus Notice</h3>
                <p className="text-xs text-slate-500">Share updates with students and staff</p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* AI Assistant toggle */}
            <div className="mb-4 rounded-xl bg-purple-50 border border-purple-200 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-xs font-bold text-purple-900">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-600" /> AI Notice Drafter
                </span>
                <button
                  type="button"
                  onClick={() => setShowAiDraft(!showAiDraft)}
                  className="text-xs font-bold text-purple-700 hover:underline"
                >
                  {showAiDraft ? 'Hide Drafter' : 'Draft with AI'}
                </button>
              </div>

              {showAiDraft && (
                <div className="mt-3 space-y-2">
                  <input
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="e.g. Rescheduling CS601 lab due to campus festival"
                    className="w-full rounded-lg border border-purple-300 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={aiLoading || !aiTopic}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {aiLoading ? 'Drafting...' : 'Generate Notice Content'}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Notice Title</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Mid-term Exam Schedule Announced"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Priority Level</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium / General</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Target Audience</label>
                  <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">All Campus</option>
                    <option value="STUDENT">Students Only</option>
                    <option value="FACULTY">Faculty Only</option>
                    <option value="CR">Class Representatives</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Content</label>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Full text of the announcement..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
