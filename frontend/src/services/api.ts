// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vidyasetu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired, remove stored token and redirect to login
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/landing') && currentPath !== '/') {
        localStorage.removeItem('vidyasetu_token');
        localStorage.removeItem('vidyasetu_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Service Methods ---
export const AcademicService = {
  getDepartments: () => api.get('/academic/departments'),
  createDepartment: (data: { name: string; code: string; description?: string }) =>
    api.post('/academic/departments', data),

  getSemesters: () => api.get('/academic/semesters'),
  createSemester: (data: { number: number; name: string; academicYear: string; isActive?: boolean }) =>
    api.post('/academic/semesters', data),

  getSections: (params?: { departmentId?: string; semesterId?: string }) =>
    api.get('/academic/sections', { params }),
  createSection: (data: { name: string; departmentId: string; semesterId: string }) =>
    api.post('/academic/sections', data),

  getSubjects: (params?: { departmentId?: string; semesterId?: string; facultyId?: string; myEnrolled?: boolean }) =>
    api.get('/academic/subjects', { params }),
  getSubjectById: (id: string) => api.get(`/academic/subjects/${id}`),
  createSubject: (data: { name: string; code: string; credits: number; departmentId: string; semesterId: string; facultyId?: string }) =>
    api.post('/academic/subjects', data),

  createModule: (data: { title: string; description?: string; orderIndex: number; subjectId: string }) =>
    api.post('/academic/modules', data),
};

export const ResourceService = {
  getResources: (params?: { subjectId?: string; moduleId?: string; fileType?: string }) =>
    api.get('/resources', { params }),
  createResource: (data: { title: string; description?: string; fileUrl: string; fileType: string; subjectId: string; moduleId?: string }) =>
    api.post('/resources', data),
  deleteResource: (id: string) => api.delete(`/resources/${id}`),
};

export const AssignmentService = {
  getAssignments: (params?: { subjectId?: string }) => api.get('/assignments', { params }),
  getAssignmentById: (id: string) => api.get(`/assignments/${id}`),
  createAssignment: (data: { title: string; description: string; dueDate: string; totalMarks: number; subjectId: string }) =>
    api.post('/assignments', data),
  submitAssignment: (id: string, data: { fileUrl?: string; content?: string }) =>
    api.post(`/assignments/${id}/submit`, data),
  gradeSubmission: (submissionId: string, data: { marksObtained: number; feedback?: string }) =>
    api.post(`/assignments/submissions/${submissionId}/grade`, data),
};

export const QuizService = {
  getQuizzes: (params?: { subjectId?: string }) => api.get('/quizzes', { params }),
  getQuizById: (id: string) => api.get(`/quizzes/${id}`),
  createQuiz: (data: {
    title: string;
    description?: string;
    timeLimitMinutes: number;
    totalMarks: number;
    subjectId: string;
    isPublished: boolean;
    dueDate?: string;
    questions?: Array<{
      questionText: string;
      questionType: string;
      options: string[];
      correctAnswer: string;
      marks: number;
    }>;
  }) => api.post('/quizzes', data),
  submitQuizAttempt: (id: string, answers: Record<string, string>) =>
    api.post(`/quizzes/${id}/attempt`, { answers }),
};

export const AnnouncementService = {
  getAnnouncements: () => api.get('/announcements'),
  createAnnouncement: (data: {
    title: string;
    content: string;
    priority?: string;
    targetRole?: string | null;
    departmentId?: string;
    sectionId?: string;
  }) => api.post('/announcements', data),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
};

export const NotificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
};

export const DashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const UserService = {
  getUsers: (params?: { role?: string; search?: string; departmentId?: string }) =>
    api.get('/users', { params }),
  getUserById: (id: string) => api.get(`/users/${id}`),
  toggleStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }),
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) =>
    api.patch('/users/me/profile', data),
};

export const AIServiceClient = {
  summarize: (title: string, content: string) => api.post('/ai/summarize', { title, content }),
  generateQuiz: (topic: string, numberOfQuestions = 5) => api.post('/ai/generate-quiz', { topic, numberOfQuestions }),
  draftAnnouncement: (topic: string, targetAudience: string, keyPoints: string[]) =>
    api.post('/ai/draft-announcement', { topic, targetAudience, keyPoints }),
};
