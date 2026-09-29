// src/types/index.ts

export type Role = 'ADMIN' | 'FACULTY' | 'CR' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  studentProfile?: StudentProfile;
  facultyProfile?: FacultyProfile;
  crProfile?: CRProfile;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNumber: string;
  batchYear: number;
  departmentId: string;
  department?: Department;
  semesterId: string;
  semester?: Semester;
  sectionId?: string;
  section?: Section;
}

export interface FacultyProfile {
  id: string;
  userId: string;
  employeeId: string;
  designation: string;
  departmentId: string;
  department?: Department;
  subjects?: Subject[];
}

export interface CRProfile {
  id: string;
  userId: string;
  studentProfileId: string;
  sectionId: string;
  section?: Section;
  term: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: {
    students?: number;
    faculties?: number;
    subjects?: number;
  };
}

export interface Semester {
  id: string;
  number: number;
  name: string;
  academicYear: string;
  isActive: boolean;
}

export interface Section {
  id: string;
  name: string;
  departmentId: string;
  department?: Department;
  semesterId: string;
  semester?: Semester;
  _count?: {
    students?: number;
  };
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  subjectId: string;
  resources?: Resource[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  departmentId: string;
  department?: Department;
  semesterId: string;
  semester?: Semester;
  facultyId?: string;
  faculty?: {
    id: string;
    designation: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  };
  modules?: Module[];
  resources?: Resource[];
  assignments?: Assignment[];
  quizzes?: Quiz[];
  enrollments?: Enrollment[];
  _count?: {
    modules?: number;
    resources?: number;
    assignments?: number;
    quizzes?: number;
    enrollments?: number;
  };
}

export interface Enrollment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    rollNumber: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
    section?: Section;
  };
  subjectId: string;
  subject?: Subject;
  sectionId?: string;
  status: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'PDF' | 'NOTES' | 'SLIDES' | 'LINK' | string;
  subjectId: string;
  subject?: { id: string; name: string; code: string };
  moduleId?: string;
  module?: { id: string; title: string };
  uploadedById: string;
  uploadedBy?: { id: string; name: string; role: Role };
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  subjectId: string;
  subject?: { id: string; name: string; code: string };
  createdById: string;
  createdBy?: { id: string; name: string };
  submissions?: AssignmentSubmission[];
  _count?: {
    submissions?: number;
  };
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignment?: Assignment;
  studentId: string;
  student?: {
    id: string;
    rollNumber: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
    section?: Section;
  };
  fileUrl?: string;
  content?: string;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE';
  submittedAt: string;
  grade?: Grade;
}

export interface Grade {
  id: string;
  submissionId: string;
  submission?: AssignmentSubmission;
  marksObtained: number;
  feedback?: string;
  gradedById: string;
  gradedBy?: { id: string; name: string };
  gradedAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: string[];
  correctAnswer?: string;
  marks: number;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  answersJson: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  student?: {
    user: { id: string; name: string; email: string };
  };
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  totalMarks: number;
  isPublished: boolean;
  dueDate?: string;
  subjectId: string;
  subject?: { id: string; name: string; code: string };
  createdById: string;
  createdBy?: { id: string; name: string };
  questions?: Question[];
  attempts?: QuizAttempt[];
  myAttempt?: QuizAttempt | null;
  _count?: {
    questions?: number;
    attempts?: number;
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetRole?: Role;
  departmentId?: string;
  department?: Department;
  sectionId?: string;
  section?: Section;
  authorId: string;
  author: {
    id: string;
    name: string;
    role: Role;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    role: Role;
    email: string;
  };
  timestamp: string;
}
