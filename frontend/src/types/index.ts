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
  departmentId?: string;
  department?: Department;
  _count?: {
    subjects?: number;
    students?: number;
    sections?: number;
  };
}

export interface Section {
  id: string;
  name: string;
  departmentId: string;
  department?: Department;
  semesterId: string;
  semester?: Semester;
  crProfiles?: Array<{
    id: string;
    term: string;
    user?: { id: string; name: string; email: string };
  }>;
  _count?: {
    students?: number;
    enrollments?: number;
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
    department?: Department;
    semester?: Semester;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      avatarUrl?: string;
    };
    section?: Section;
  };
  subjectId: string;
  subject?: Subject;
  sectionId?: string;
  section?: Section;
  status: string;
  enrolledAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'PDF' | 'NOTES' | 'SLIDES' | 'PPT' | 'PYQ' | 'VIDEO' | 'REFERENCE' | 'DOCUMENT' | string;
  fileSize?: string;
  year?: number;
  isPublished: boolean;
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    code: string;
    departmentId?: string;
    semesterId?: string;
    department?: Department;
    semester?: Semester;
  };
  moduleId?: string;
  module?: { id: string; title: string; orderIndex?: number };
  uploadedById: string;
  uploadedBy?: { id: string; name: string; role: Role };
  createdAt: string;
  updatedAt?: string;
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
  similarityScore?: number;
  similarityReport?: string;
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

export interface MatchedPassage {
  textA: string;
  textB: string;
  length: number;
}

export interface SubmissionSimilarityPair {
  id: string;
  assignmentId: string;
  similarityScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedPassages: MatchedPassage[];
  submissionA: {
    id: string;
    student: {
      id: string;
      rollNumber: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
    };
    fileUrl?: string;
    content?: string;
    extractedText?: string;
    extractionStatus?: string;
    grade?: Grade;
    submittedAt: string;
  };
  submissionB: {
    id: string;
    student: {
      id: string;
      rollNumber: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
    };
    fileUrl?: string;
    content?: string;
    extractedText?: string;
    extractionStatus?: string;
    grade?: Grade;
    submittedAt: string;
  };
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

// -------------------------------------------------------------
// Doubt Hub & Help Desk Types
// -------------------------------------------------------------
export type DoubtStatus = 'OPEN' | 'IN_DISCUSSION' | 'ANSWERED' | 'RESOLVED';

export interface DoubtAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  doubtId: string;
  messageId?: string;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    name: string;
    role: Role;
  };
  createdAt: string;
}

export interface DoubtMessage {
  id: string;
  doubtId: string;
  senderId: string;
  content: string;
  isFaculty: boolean;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: Role;
  };
  attachments?: DoubtAttachment[];
  createdAt: string;
  updatedAt?: string;
  deliveryStatus?: 'sending' | 'sent' | 'failed';
}

export interface Doubt {
  id: string;
  title: string;
  description: string;
  topic: string;
  status: DoubtStatus;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    facultyId?: string;
  };
  studentId: string;
  student: {
    id: string;
    rollNumber: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
      role: Role;
    };
  };
  facultyId?: string;
  faculty?: {
    id: string;
    designation?: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
      role: Role;
    };
  };
  attachments?: DoubtAttachment[];
  messages?: DoubtMessage[];
  _count?: {
    messages?: number;
    attachments?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DoubtStats {
  total: number;
  open: number;
  inDiscussion: number;
  answered: number;
  resolved: number;
}

// -------------------------------------------------------------
// Academic Analytics Types (Real Database Contracts)
// -------------------------------------------------------------
export interface StudentAnalyticsData {
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
    rollNumber: string;
    batchYear: number;
    department?: string;
    semester?: string;
    section?: string;
  };
  assignmentCompletion: {
    totalAssigned: number;
    totalSubmitted: number;
    completionPercentage: number;
    pendingCount: number;
    pendingAssignments: Array<{
      id: string;
      title: string;
      dueDate: string;
      totalMarks: number;
      subjectCode: string;
      subjectName: string;
      isOverdue: boolean;
    }>;
    submittedAssignments: Array<{
      submissionId: string;
      assignmentId: string;
      title: string;
      totalMarks: number;
      marksObtained: number | null;
      feedback: string | null;
      status: string;
      submittedAt: string;
      isGraded: boolean;
    }>;
    hasData: boolean;
  };
  quizPerformance: {
    totalAttempts: number;
    averageScore: number;
    scores: Array<{
      id: string;
      quizId: string;
      title: string;
      subjectCode: string;
      subjectName: string;
      score: number;
      totalMarks: number;
      percentage: number;
      completedAt: string;
    }>;
    hasData: boolean;
  };
  subjectPerformance: Array<{
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    facultyName: string;
    assignedCount: number;
    submittedCount: number;
    averageAssignmentScore: number | null;
    quizzesAttemptedCount: number;
    averageQuizScore: number | null;
    hasData: boolean;
  }>;
  resourceUsage: {
    isTracked: boolean;
    totalAccessEvents: number;
    message: string;
  };
  academicActivity: Array<{
    id: string;
    type: 'SUBMISSION' | 'QUIZ' | 'DOUBT' | 'SYSTEM';
    title: string;
    timestamp: string;
    details?: string;
  }>;
}

export interface FacultyAnalyticsData {
  faculty: {
    id: string;
    userId: string;
    name: string;
    email: string;
    employeeId: string;
    designation: string;
    department: string;
    subjectsCount: number;
    subjects: Array<{
      id: string;
      code: string;
      name: string;
      enrolledStudents: number;
    }>;
  };
  assignmentSubmissionStats: {
    totalAssignments: number;
    totalExpectedSubmissions: number;
    totalActualSubmissions: number;
    overallSubmissionRate: number;
    assignments: Array<{
      id: string;
      title: string;
      subjectCode: string;
      subjectName: string;
      dueDate: string;
      totalMarks: number;
      enrolledCount: number;
      submissionCount: number;
      gradedCount: number;
      pendingCount: number;
      submissionRate: number;
      isPublished: boolean;
    }>;
    hasData: boolean;
  };
  gradingProgress: {
    totalSubmissions: number;
    gradedSubmissions: number;
    pendingGrading: number;
    progressPercentage: number;
    hasData: boolean;
  };
  quizPerformance: {
    totalQuizzes: number;
    totalAttempts: number;
    overallAverageScore: number;
    quizzes: Array<{
      id: string;
      title: string;
      subjectCode: string;
      subjectName: string;
      totalMarks: number;
      questionsCount: number;
      attemptsCount: number;
      averageScorePercentage: number | null;
      isPublished: boolean;
    }>;
    hasData: boolean;
  };
  resourcePublishing: {
    totalPublished: number;
    byType: Record<string, number>;
    recentResources: Array<{
      id: string;
      title: string;
      fileType: string;
      subjectCode: string;
      createdAt: string;
    }>;
    hasData: boolean;
  };
  facultyActivity: Array<{
    id: string;
    type: 'GRADE' | 'ASSIGNMENT' | 'RESOURCE' | 'QUIZ' | 'DOUBT';
    title: string;
    timestamp: string;
  }>;
}

export interface InstitutionalAnalyticsData {
  summary: {
    totalStudents: number;
    totalFaculty: number;
    totalDepartments: number;
    totalSubjects: number;
    totalAssignments: number;
    totalSubmissions: number;
    gradedSubmissions: number;
    pendingGrading: number;
    gradingRate: number;
    totalQuizzes: number;
    totalQuizAttempts: number;
    totalResources: number;
  };
  departments: Array<{
    id: string;
    name: string;
    code: string;
    studentsCount: number;
    facultyCount: number;
    subjectsCount: number;
  }>;
  studentsList: Array<{
    profileId: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    semester: string;
  }>;
  facultyList: Array<{
    profileId: string;
    name: string;
    email: string;
    employeeId: string;
    designation: string;
    department: string;
  }>;
}


