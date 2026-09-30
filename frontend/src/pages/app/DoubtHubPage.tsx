// src/pages/app/DoubtHubPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DoubtService, AcademicService } from '../../services/api';
import { Doubt, DoubtMessage, DoubtStatus, Subject, DoubtStats } from '../../types';
import { Badge, RoleBadge } from '../../components/common/Badge';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Paperclip,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  User,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Eye,
  Download,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const DoubtHubPage: React.FC = () => {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  // Core Data States
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<Doubt | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<DoubtStats>({
    total: 0,
    open: 0,
    inDiscussion: 0,
    answered: 0,
    resolved: 0,
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(isFaculty ? 'new' : 'all');

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Ask Doubt Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [askSubjectId, setAskSubjectId] = useState('');
  const [askTopic, setAskTopic] = useState('');
  const [askTitle, setAskTitle] = useState('');
  const [askDescription, setAskDescription] = useState('');
  const [askAttachments, setAskAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileType: string; fileSize?: number }>
  >([]);
  const [submittingDoubt, setSubmittingDoubt] = useState(false);

  // Chat Input State
  const [messageInput, setMessageInput] = useState('');
  const [chatAttachments, setChatAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileType: string; fileSize?: number }>
  >([]);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // References
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch subjects for filters and dropdowns
  useEffect(() => {
    AcademicService.getSubjects()
      .then((res) => {
        if (res.data.success) {
          setSubjects(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load academic subjects', err);
      });
  }, []);

  // Fetch doubt stats for badge counts
  const fetchStats = async () => {
    try {
      const res = await DoubtService.getStats();
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doubt statistics', err);
    }
  };

  // Fetch doubts list based on filters
  const fetchDoubts = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params: any = {};
        if (selectedSubjectId) params.subjectId = selectedSubjectId;
        if (selectedStatus) params.status = selectedStatus;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (activeTab && activeTab !== 'all') params.tab = activeTab;

        const res = await DoubtService.getDoubts(params);
        if (res.data.success) {
          setDoubts(res.data.data);

          // If a doubt was already selected, update its reference in the list
          if (selectedDoubt) {
            const updated = res.data.data.find((d: Doubt) => d.id === selectedDoubt.id);
            if (updated) {
              setSelectedDoubt((prev) => (prev ? { ...prev, ...updated } : updated));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch doubts', err);
        if (!silent) addToast('error', 'Failed to load doubts. Please try again.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedSubjectId, selectedStatus, searchQuery, activeTab, selectedDoubt?.id]
  );

  useEffect(() => {
    fetchDoubts();
    fetchStats();
  }, [fetchDoubts]);

  // Load single doubt with full chat thread
  const openDoubt = async (doubtId: string) => {
    setChatLoading(true);
    try {
      const res = await DoubtService.getDoubtById(doubtId);
      if (res.data.success) {
        setSelectedDoubt(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doubt details', err);
      addToast('error', 'Could not open doubt thread.');
    } finally {
      setChatLoading(false);
    }
  };

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedDoubt) {
      scrollToBottom();
    }
  }, [selectedDoubt?.messages?.length]);

  // Real-time polling for selected doubt chat thread
  useEffect(() => {
    if (!selectedDoubt?.id) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await DoubtService.getDoubtById(selectedDoubt.id);
        if (res.data.success) {
          const freshData: Doubt = res.data.data;
          setSelectedDoubt((current) => {
            if (!current) return freshData;
            // Check if messages changed or status changed
            const currentMsgs = current.messages || [];
            const freshMsgs = freshData.messages || [];
            if (
              freshMsgs.length !== currentMsgs.length ||
              freshData.status !== current.status ||
              freshData.updatedAt !== current.updatedAt
            ) {
              return freshData;
            }
            return current;
          });
        }
      } catch (err) {
        // Silent fail during background polling
      }
    }, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedDoubt?.id]);

  // Handle file uploads (converts file to data URL with mime type & name)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    destination: 'modal' | 'chat'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const fileType = isImg ? 'IMAGE' : isPdf ? 'PDF' : 'ATTACHMENT';

      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = reader.result as string;
        const newAttachment = {
          fileName: file.name,
          fileUrl,
          fileType,
          fileSize: file.size,
        };

        if (destination === 'modal') {
          setAskAttachments((prev) => [...prev, newAttachment]);
        } else {
          setChatAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Submit Ask a Doubt
  const handlePostDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askSubjectId || !askTopic.trim() || !askTitle.trim() || !askDescription.trim()) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }

    setSubmittingDoubt(true);
    try {
      const res = await DoubtService.createDoubt({
        subjectId: askSubjectId,
        topic: askTopic.trim(),
        title: askTitle.trim(),
        description: askDescription.trim(),
        attachments: askAttachments,
      });

      if (res.data.success) {
        const createdDoubt = res.data.data;
        addToast('success', 'Doubt posted successfully! Faculty has been notified.');
        setShowAskModal(false);
        // Reset modal form
        setAskSubjectId('');
        setAskTopic('');
        setAskTitle('');
        setAskDescription('');
        setAskAttachments([]);

        // Refresh list and open new thread
        await fetchDoubts();
        await fetchStats();
        openDoubt(createdDoubt.id);
      }
    } catch (err: any) {
      console.error('Failed to post doubt', err);
      addToast('error', err.response?.data?.message || 'Failed to post doubt. Please try again.');
    } finally {
      setSubmittingDoubt(false);
    }
  };

  // Send Message in Chat Thread
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDoubt) return;

    const content = messageInput.trim();
    if (!content && chatAttachments.length === 0) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: DoubtMessage = {
      id: tempId,
      doubtId: selectedDoubt.id,
      senderId: user?.id || '',
      content: content || '(File Attachment)',
      isFaculty,
      sender: {
        id: user?.id || '',
        name: user?.name || 'You',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl,
        role: user?.role || 'STUDENT',
      },
      attachments: chatAttachments.map((att, i) => ({
        id: `temp-att-${i}`,
        doubtId: selectedDoubt.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        uploadedById: user?.id || '',
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    // Optimistically append message
    setSelectedDoubt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticMessage],
      };
    });

    const currentMsgText = messageInput;
    const currentAttachments = [...chatAttachments];
    setMessageInput('');
    setChatAttachments([]);
    setSendingMessage(true);

    try {
      const res = await DoubtService.addMessage(selectedDoubt.id, {
        content: content || 'Shared an attachment',
        attachments: currentAttachments,
      });

      if (res.data.success) {
        const serverMessage = res.data.data;
        // Update optimistic message with confirmed server message
        setSelectedDoubt((prev) => {
          if (!prev) return prev;
          const msgs = (prev.messages || []).map((m) =>
            m.id === tempId ? { ...serverMessage, deliveryStatus: 'sent' } : m
          );
          // If faculty answered, update status to IN_DISCUSSION if it was OPEN
          let updatedStatus = prev.status;
          if (isFaculty && prev.status === 'OPEN') {
            updatedStatus = 'IN_DISCUSSION';
          }
          return {
            ...prev,
            status: updatedStatus,
            messages: msgs,
          };
        });
        fetchStats();
      }
    } catch (err: any) {
      console.error('Failed to send message', err);
      // Mark optimistic message as failed
      setSelectedDoubt((prev) => {
        if (!prev) return prev;
        const msgs = (prev.messages || []).map((m) =>
          m.id === tempId ? { ...m, deliveryStatus: 'failed' } : m
        );
        return { ...prev, messages: msgs };
      });
      addToast('error', 'Message failed to send. Check your connection.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Change Doubt Status (Faculty or Student)
  const handleUpdateStatus = async (newStatus: DoubtStatus) => {
    if (!selectedDoubt) return;
    try {
      const res = await DoubtService.updateStatus(selectedDoubt.id, newStatus);
      if (res.data.success) {
        setSelectedDoubt((prev) => (prev ? { ...prev, status: newStatus } : prev));
        addToast('success', `Doubt marked as ${newStatus.replace('_', ' ')}.`);
        fetchDoubts(true);
        fetchStats();
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
      addToast('error', err.response?.data?.message || 'Failed to update doubt status.');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: DoubtStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">OPEN</Badge>;
      case 'IN_DISCUSSION':
        return <Badge variant="info">IN DISCUSSION</Badge>;
      case 'ANSWERED':
        return <Badge variant="purple">ANSWERED</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">RESOLVED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Format timestamp nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center space-x-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl transition-all ${
              t.type === 'success'
                ? 'bg-emerald-600'
                : t.type === 'error'
                ? 'bg-rose-600'
                : 'bg-indigo-600'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <HelpCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-300" />
              <span>Academic Help Desk &bull; Doubt Hub</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              💬 Doubt Hub
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isFaculty
                ? 'Address student academic doubts, provide rich explanations, share resources, and guide your courses in real-time.'
                : 'Directly ask your subject professors academic questions, clarify lecture concepts, attach problem screenshots, and resolve doubts.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAskModal(true)}
              className="inline-flex items-center justify-center space-x-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Ask a Doubt</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 border-t border-white/10 pt-4">
          <div className="rounded-lg bg-white/5 p-2.5 backdrop-blur-xs">
            <p className="text-[11px] text-slate-400 font-medium">Total Threads</p>
            <p className="text-lg font-extrabold text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/20">
            <p className="text-[11px] text-amber-300 font-medium">New Doubts (OPEN)</p>
            <p className="text-lg font-extrabold text-amber-400 mt-0.5">{stats.open}</p>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-2.5 border border-sky-500/20">
            <p className="text-[11px] text-sky-300 font-medium">In Discussion</p>
            <p className="text-lg font-extrabold text-sky-400 mt-0.5">{stats.inDiscussion}</p>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-2.5 border border-purple-500/20">
            <p className="text-[11px] text-purple-300 font-medium">Answered</p>
            <p className="text-lg font-extrabold text-purple-400 mt-0.5">{stats.answered}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-emerald-300 font-medium">Resolved</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{stats.resolved}</p>
          </div>
        </div>
      </div>

      {/* Main Hub Split Layout: Left Doubt List, Right Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-290px)] min-h-[640px]">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Doubt Threads Directory & Filters            */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
            selectedDoubt ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header & Tabs */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
              {isFaculty ? (
                <>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setActiveTab('new')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'new'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    New ({stats.open})
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'active'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Active ({stats.inDiscussion})
                  </button>
                  <button
                    onClick={() => setActiveTab('answered')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'answered'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Answered ({stats.answered})
                  </button>
                  <button
                    onClick={() => setActiveTab('resolved')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'resolved'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Resolved ({stats.resolved})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    All Doubts
                  </button>
                  <button
                    onClick={() => setActiveTab('my')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'my'
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    My Doubts
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'active'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Active Conversations
                  </button>
                  <button
                    onClick={() => setActiveTab('resolved')}
                    className={`rounded-lg px-2.5 py-1.5 font-bold transition shrink-0 ${
                      activeTab === 'resolved'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Resolved Doubts
                  </button>
                </>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doubts by title, question, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters: Subject & Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-hidden"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_DISCUSSION">IN DISCUSSION</option>
                <option value="ANSWERED">ANSWERED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
          </div>

          {/* Doubt Thread Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <p className="text-xs text-slate-500">Loading academic doubts...</p>
              </div>
            ) : doubts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">No Doubts Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    {searchQuery || selectedSubjectId || selectedStatus
                      ? 'No doubts match the selected filters. Try broadening your search.'
                      : 'No academic doubts have been asked yet. Click "+ Ask a Doubt" to post the first question!'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAskModal(true)}
                  className="rounded-lg bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 text-xs font-bold hover:bg-brand-100 transition"
                >
                  Ask a Doubt Now
                </button>
              </div>
            ) : (
              doubts.map((d) => {
                const isSelected = selectedDoubt?.id === d.id;
                const lastMsg = d.messages?.[0];

                return (
                  <div
                    key={d.id}
                    onClick={() => openDoubt(d.id)}
                    className={`cursor-pointer rounded-xl p-3.5 transition-all ${
                      isSelected
                        ? 'bg-brand-50/70 border border-brand-200 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {d.subject?.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 truncate max-w-[130px]">
                          {d.topic}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center space-x-1.5">
                        {renderStatusBadge(d.status)}
                        <span className="text-[10px] text-slate-400">{formatTime(d.updatedAt)}</span>
                      </div>
                    </div>

                    <h4 className="mt-1.5 text-xs font-bold text-slate-900 line-clamp-1">
                      {d.title}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>

                    {/* Last message preview */}
                    {lastMsg ? (
                      <div className="mt-2.5 rounded-lg bg-white/80 border border-slate-100 p-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">
                          {lastMsg.sender?.role === 'FACULTY' ? '👨‍🏫 Faculty:' : '💬 ' + lastMsg.sender?.name.split(' ')[0] + ':'}
                        </span>
                        <span className="truncate">{lastMsg.content}</span>
                      </div>
                    ) : null}

                    {/* Footer info: Student + Message count */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100/80">
                      <div className="flex items-center space-x-1.5 truncate">
                        <div className="h-4 w-4 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[9px]">
                          {d.student?.user?.name.charAt(0) || 'S'}
                        </div>
                        <span className="truncate font-medium">{d.student?.user?.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({d.student?.rollNumber})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {d._count?.attachments ? (
                          <span className="flex items-center space-x-0.5 text-slate-400">
                            <Paperclip className="h-3 w-3" />
                            <span>{d._count.attachments}</span>
                          </span>
                        ) : null}
                        <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                          <MessageCircle className="h-3 w-3 text-indigo-500" />
                          <span>{d._count?.messages || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Doubt Chat & Interactive Conversation       */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
            !selectedDoubt ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {!selectedDoubt ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-50/40">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-inner">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                Select a Doubt Conversation
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
                Choose a question from the left directory to inspect the discussion thread, answer
                student queries, or post your questions.
              </p>
              <button
                onClick={() => setShowAskModal(true)}
                className="mt-5 inline-flex items-center space-x-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Ask a New Doubt</span>
              </button>
            </div>
          ) : (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedDoubt(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/80 lg:hidden"
                    >
                      &larr; Back
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                          {selectedDoubt.subject?.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {selectedDoubt.subject?.name} &bull; {selectedDoubt.topic}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        {selectedDoubt.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {renderStatusBadge(selectedDoubt.status)}
                  </div>
                </div>

                {/* Subheader: Asked By & Status Action Controls */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/70 text-xs">
                  <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>
                        Student: <strong className="text-slate-800">{selectedDoubt.student?.user?.name}</strong>
                      </span>
                    </span>
                    {selectedDoubt.faculty && (
                      <span className="flex items-center space-x-1">
                        <GraduationCap className="h-3.5 w-3.5 text-brand-600" />
                        <span>
                          Faculty: <strong className="text-slate-800">{selectedDoubt.faculty?.user?.name}</strong>
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Faculty & Student Status Actions */}
                  <div className="flex items-center space-x-1.5">
                    {isFaculty && (
                      <>
                        {selectedDoubt.status !== 'ANSWERED' && (
                          <button
                            onClick={() => handleUpdateStatus('ANSWERED')}
                            className="inline-flex items-center space-x-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 text-xs font-bold hover:bg-purple-100 transition"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark as Answered</span>
                          </button>
                        )}
                        {selectedDoubt.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleUpdateStatus('RESOLVED')}
                            className="inline-flex items-center space-x-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Mark as Resolved</span>
                          </button>
                        )}
                        {(selectedDoubt.status === 'ANSWERED' || selectedDoubt.status === 'RESOLVED') && (
                          <button
                            onClick={() => handleUpdateStatus('IN_DISCUSSION')}
                            className="inline-flex items-center space-x-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 text-xs font-bold hover:bg-slate-200 transition"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Re-open</span>
                          </button>
                        )}
                      </>
                    )}

                    {!isFaculty && (
                      <>
                        {selectedDoubt.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => handleUpdateStatus('RESOLVED')}
                            className="inline-flex items-center space-x-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Mark Doubt Resolved</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus('IN_DISCUSSION')}
                            className="inline-flex items-center space-x-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 text-xs font-bold hover:bg-slate-200 transition"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Re-open Doubt</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
                {/* Pinned Original Doubt Card */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                        {selectedDoubt.student?.user?.name.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {selectedDoubt.student?.user?.name}
                          <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                            (Roll: {selectedDoubt.student?.rollNumber})
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Asked on {new Date(selectedDoubt.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                      Original Doubt
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {selectedDoubt.description}
                  </p>

                  {/* Original Attachments */}
                  {selectedDoubt.attachments && selectedDoubt.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span>Attached Files & Screenshots ({selectedDoubt.attachments.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDoubt.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="group relative flex items-center space-x-2 rounded-xl border border-slate-200 bg-white p-2 hover:border-brand-400 transition"
                          >
                            {att.fileType === 'IMAGE' ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(att.fileUrl)}
                                className="flex items-center space-x-2 text-left"
                              >
                                <img
                                  src={att.fileUrl}
                                  alt={att.fileName}
                                  className="h-9 w-9 rounded-lg object-cover border border-slate-100"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 max-w-[130px] truncate">
                                    {att.fileName}
                                  </p>
                                  <span className="text-[10px] text-brand-600 flex items-center gap-0.5 font-semibold">
                                    <Eye className="h-3 w-3" /> View Preview
                                  </span>
                                </div>
                              </button>
                            ) : (
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-left"
                              >
                                <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 max-w-[130px] truncate">
                                    {att.fileName}
                                  </p>
                                  <span className="text-[10px] text-slate-500 font-semibold">PDF Document</span>
                                </div>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conversation Messages */}
                {selectedDoubt.messages && selectedDoubt.messages.length > 0 ? (
                  selectedDoubt.messages.map((msg) => {
                    const isCurrentUser = msg.senderId === user?.id;
                    const isFac = msg.isFaculty || msg.sender?.role === 'FACULTY' || msg.sender?.role === 'ADMIN';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isCurrentUser ? 'items-end' : 'items-start'
                        } space-y-1`}
                      >
                        {/* Sender info header */}
                        <div className="flex items-center space-x-1.5 text-[11px] px-1">
                          <span className="font-bold text-slate-700">
                            {isCurrentUser ? 'You' : msg.sender?.name}
                          </span>
                          {isFac && (
                            <span className="rounded bg-indigo-100 text-indigo-800 px-1.5 py-0.2 text-[9px] font-bold">
                              FACULTY
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Bubble Content */}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs text-xs leading-relaxed ${
                            isCurrentUser
                              ? 'bg-brand-600 text-white rounded-br-xs'
                              : isFac
                              ? 'bg-white border-2 border-indigo-200 text-slate-800 rounded-bl-xs shadow-indigo-100/50'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Message Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/40 space-y-2">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className={`rounded-lg p-2 border flex items-center space-x-2 ${
                                    isCurrentUser
                                      ? 'bg-brand-700/60 border-brand-500 text-white'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  {att.fileType === 'IMAGE' ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage(att.fileUrl)}
                                      className="flex items-center space-x-2 text-left"
                                    >
                                      <img
                                        src={att.fileUrl}
                                        alt={att.fileName}
                                        className="h-8 w-8 rounded object-cover"
                                      />
                                      <span className="text-[11px] font-bold underline truncate max-w-[150px]">
                                        {att.fileName}
                                      </span>
                                    </button>
                                  ) : (
                                    <a
                                      href={att.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2"
                                    >
                                      <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                                      <span className="text-[11px] font-bold underline truncate max-w-[150px]">
                                        {att.fileName}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Delivery Status Indicator */}
                        {msg.deliveryStatus && (
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400 px-1">
                            {msg.deliveryStatus === 'sending' && (
                              <>
                                <div className="h-2 w-2 animate-spin rounded-full border border-brand-600 border-t-transparent" />
                                <span className="text-slate-500 font-medium">Sending...</span>
                              </>
                            )}
                            {msg.deliveryStatus === 'sent' && (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-600 font-medium">Sent</span>
                              </>
                            )}
                            {msg.deliveryStatus === 'failed' && (
                              <>
                                <AlertCircle className="h-3 w-3 text-rose-500" />
                                <span className="text-rose-600 font-medium">Failed to send</span>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage()}
                                  className="underline text-brand-600 ml-1 font-bold"
                                >
                                  Retry
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No replies yet. Type your answer or message below to start the conversation!
                  </div>
                )}

                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200">
                {/* Staged Attachments Preview Strip */}
                {chatAttachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {chatAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-1.5 rounded-lg bg-white border border-slate-200 px-2 py-1 text-xs"
                      >
                        {att.fileType === 'IMAGE' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-rose-500" />
                        )}
                        <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                          {att.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end space-x-2"
                >
                  {/* File Upload Hidden Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'chat')}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Image or PDF"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <div className="relative flex-1">
                    <textarea
                      rows={2}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isFaculty
                          ? 'Write your explanation or advice for this doubt (Enter to send)...'
                          : 'Type your question, clarification, or follow-up...'
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingMessage || (!messageInput.trim() && chatAttachments.length === 0)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    {sendingMessage ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Shift + Enter for new line</span>
                  <span className="flex items-center space-x-1 text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time polling sync active</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ASK A DOUBT MODAL                                         */}
      {/* ========================================================= */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ask a Doubt</h3>
                  <p className="text-xs text-slate-500">
                    Submit your query directly to assigned faculty for guidance.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/80 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePostDoubt} className="p-5 space-y-4 text-xs">
              {/* Subject Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={askSubjectId}
                  onChange={(e) => setAskSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  <option value="">Select Enrolled Subject...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linked List, Deadlock Avoidance, Normalization"
                  value={askTopic}
                  onChange={(e) => setAskTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              {/* Doubt Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Doubt Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why do we need a dummy node in singly linked lists?"
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain your confusion, what you have tried, and specific questions you have for the professor..."
                  value={askDescription}
                  onChange={(e) => setAskDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              {/* Attachment Section */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Attachments (Image, PDF, Screenshot)
                </label>

                <input
                  ref={modalFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, 'modal')}
                  className="hidden"
                />

                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-4 text-center hover:border-brand-400 hover:bg-slate-50 transition"
                >
                  <div className="flex flex-col items-center space-y-1 text-slate-500">
                    <Paperclip className="h-5 w-5 text-brand-600" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click to upload images, lecture PDFs, or code screenshots
                    </p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>

                {/* Staged Attachments in Modal */}
                {askAttachments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {askAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs"
                      >
                        {att.fileType === 'IMAGE' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-rose-500" />
                        )}
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                          {att.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAskAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDoubt}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {submittingDoubt ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Doubt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IMAGE PREVIEW LIGHTBOX                                    */}
      {/* ========================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Attachment preview"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubtHubPage;
