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
  updateDepartment: (id: string, data: { name?: string; code?: string; description?: string }) =>
    api.patch(`/academic/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/academic/departments/${id}`),

  getSemesters: (params?: { departmentId?: string }) => api.get('/academic/semesters', { params }),
  createSemester: (data: { number: number; name: string; academicYear: string; isActive?: boolean; departmentId?: string }) =>
    api.post('/academic/semesters', data),
  updateSemester: (id: string, data: { number?: number; name?: string; academicYear?: string; isActive?: boolean; departmentId?: string | null }) =>
    api.patch(`/academic/semesters/${id}`, data),
  deleteSemester: (id: string) => api.delete(`/academic/semesters/${id}`),

  getSections: (params?: { departmentId?: string; semesterId?: string }) =>
    api.get('/academic/sections', { params }),
  createSection: (data: { name: string; departmentId: string; semesterId: string }) =>
    api.post('/academic/sections', data),
  updateSection: (id: string, data: { name?: string; departmentId?: string; semesterId?: string }) =>
    api.patch(`/academic/sections/${id}`, data),
  deleteSection: (id: string) => api.delete(`/academic/sections/${id}`),

  getEnrollments: (params?: { subjectId?: string; studentId?: string; sectionId?: string; departmentId?: string; semesterId?: string; status?: string; search?: string }) =>
    api.get('/academic/enrollments', { params }),
  createEnrollment: (data: { studentId: string; subjectId: string; sectionId?: string; status?: string }) =>
    api.post('/academic/enrollments', data),
  updateEnrollment: (id: string, data: { status?: string; sectionId?: string | null }) =>
    api.patch(`/academic/enrollments/${id}`, data),
  deleteEnrollment: (id: string) => api.delete(`/academic/enrollments/${id}`),

  getSubjects: (params?: { departmentId?: string; semesterId?: string; facultyId?: string; myEnrolled?: boolean; myAssigned?: boolean; search?: string }) =>
    api.get('/academic/subjects', { params }),
  getSubjectById: (id: string) => api.get(`/academic/subjects/${id}`),
  createSubject: (data: { name: string; code: string; credits: number; departmentId: string; semesterId: string; facultyId?: string }) =>
    api.post('/academic/subjects', data),
  updateSubject: (id: string, data: { name?: string; code?: string; credits?: number; departmentId?: string; semesterId?: string; facultyId?: string | null }) =>
    api.patch(`/academic/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/academic/subjects/${id}`),
  assignFaculty: (id: string, facultyId: string | null) =>
    api.patch(`/academic/subjects/${id}/assign-faculty`, { facultyId }),

  getModules: (subjectId: string) => api.get('/academic/modules', { params: { subjectId } }),
  createModule: (data: { title: string; description?: string; orderIndex: number; subjectId: string }) =>
    api.post('/academic/modules', data),
  updateModule: (id: string, data: { title?: string; description?: string; orderIndex?: number }) =>
    api.patch(`/academic/modules/${id}`, data),
  deleteModule: (id: string) => api.delete(`/academic/modules/${id}`),
};

export const ResourceService = {
  getResources: (params?: {
    subjectId?: string;
    moduleId?: string;
    fileType?: string;
    departmentId?: string;
    semesterId?: string;
    year?: number;
    search?: string;
    isPublished?: boolean;
  }) => api.get('/resources', { params }),

  getPyqs: (params?: {
    departmentId?: string;
    semesterId?: string;
    subjectId?: string;
    year?: number;
    search?: string;
  }) => api.get('/resources/pyqs', { params }),

  createResource: (data: {
    title: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    fileSize?: string;
    year?: number;
    isPublished?: boolean;
    subjectId: string;
    moduleId?: string;
  }) => api.post('/resources', data),

  updateResource: (
    id: string,
    data: {
      title?: string;
      description?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: string;
      year?: number;
      isPublished?: boolean;
      moduleId?: string | null;
    }
  ) => api.patch(`/resources/${id}`, data),

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
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    avatarUrl?: string;
    rollNumber?: string;
    batchYear?: number;
    departmentId?: string;
    semesterId?: string;
    sectionId?: string;
    term?: string;
    employeeId?: string;
    designation?: string;
  }) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.patch(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
  toggleStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }),
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) =>
    api.patch('/users/me/profile', data),
};

export const AnalyticsService = {
  getStudentAnalytics: (studentProfileId?: string) =>
    api.get(`/analytics/student${studentProfileId ? `/${studentProfileId}` : ''}`),
  getFacultyAnalytics: (facultyProfileId?: string) =>
    api.get(`/analytics/faculty${facultyProfileId ? `/${facultyProfileId}` : ''}`),
  getInstitutionalOverview: () => api.get('/analytics/overview'),
};

export const AIServiceClient = {
  getStatus: () => api.get('/ai/status'),
  generateQuiz: (params: { topic: string; numberOfQuestions?: number; difficulty?: string; subjectId?: string }) =>
    api.post('/ai/quiz/generate', params),
  askQuestion: (params: { question: string; context?: string; subjectId?: string }) =>
    api.post('/ai/ask', params),
  summarize: (data: { title?: string; content: string } | string, legacyContent?: string) => {
    if (typeof data === 'string') {
      return api.post('/ai/summarize', { title: data, content: legacyContent || '' });
    }
    return api.post('/ai/summarize', data);
  },
  draftAnnouncement: (topic: string, targetAudience: string, keyPoints: string[]) =>
    api.post('/ai/draft-announcement', { topic, targetAudience, keyPoints }),
};

export const DoubtService = {
  getDoubts: (params?: { subjectId?: string; status?: string; search?: string; tab?: string }) =>
    api.get('/doubts', { params }),
  getDoubtById: (id: string) => api.get(`/doubts/${id}`),
  getStats: () => api.get('/doubts/stats'),
  createDoubt: (data: {
    subjectId: string;
    topic: string;
    title: string;
    description: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
    }>;
  }) => api.post('/doubts', data),
  addMessage: (
    id: string,
    data: {
      content: string;
      attachments?: Array<{
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize?: number;
      }>;
    }
  ) => api.post(`/doubts/${id}/messages`, data),
  updateStatus: (id: string, status: string) => api.patch(`/doubts/${id}/status`, { status }),
};

