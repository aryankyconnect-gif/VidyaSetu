// prisma/seed.ts
import { PrismaClient, Role, AnnouncementPriority, SubmissionStatus, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VidyaSetu database seed...');

  // Clear existing data safely in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.cRProfile.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.facultyProfile.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Departments
  const cseDept = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description: 'Department of Computer Science & Engineering - Excellence in Computing, AI & Systems.',
    },
  });

  const eceDept = await prisma.department.create({
    data: {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      description: 'Department of Electronics & Communication - VLSI, Embedded Systems, and Signal Processing.',
    },
  });

  const itDept = await prisma.department.create({
    data: {
      name: 'Information Technology',
      code: 'IT',
      description: 'Department of Information Technology - Cloud Computing, Information Security & Software Systems.',
    },
  });

  console.log('✅ Departments seeded: CSE, ECE, IT');

  // 2. Semesters (1 to 8)
  const semesters = [];
  for (let i = 1; i <= 8; i++) {
    const sem = await prisma.semester.create({
      data: {
        number: i,
        name: `Semester ${i}`,
        academicYear: '2025-2026',
        isActive: i === 6, // Semester 6 is current active
      },
    });
    semesters.push(sem);
  }
  const sem6 = semesters[5];
  console.log('✅ Semesters 1 through 8 seeded (Semester 6 active)');

  // 3. Sections for Sem 6
  const sectionA = await prisma.section.create({
    data: {
      name: 'CSE-A',
      departmentId: cseDept.id,
      semesterId: sem6.id,
    },
  });

  const sectionB = await prisma.section.create({
    data: {
      name: 'CSE-B',
      departmentId: cseDept.id,
      semesterId: sem6.id,
    },
  });

  console.log('✅ Sections seeded: CSE-A, CSE-B');

  // Password Hashes
  const adminHash = await bcrypt.hash('admin123', 10);
  const facultyHash = await bcrypt.hash('faculty123', 10);
  const crHash = await bcrypt.hash('cr123', 10);
  const studentHash = await bcrypt.hash('student123', 10);

  // 4. Create Users & Profiles

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@vidyasetu.edu',
      password: adminHash,
      role: Role.ADMIN,
      name: 'Dr. Arvind Sharma',
      phone: '+91 98765 43210',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  // Faculty User
  const facultyUser = await prisma.user.create({
    data: {
      email: 'faculty@vidyasetu.edu',
      password: facultyHash,
      role: Role.FACULTY,
      name: 'Prof. Rajesh Verma',
      phone: '+91 98765 43211',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      facultyProfile: {
        create: {
          employeeId: 'EMP-CSE-102',
          designation: 'Associate Professor & HOD-Academics',
          departmentId: cseDept.id,
        },
      },
    },
    include: { facultyProfile: true },
  });

  // CR User (Class Representative)
  const crUser = await prisma.user.create({
    data: {
      email: 'cr@vidyasetu.edu',
      password: crHash,
      role: Role.CR,
      name: 'Aman Gupta (CR)',
      phone: '+91 98765 43212',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      studentProfile: {
        create: {
          rollNumber: '2024CSE042',
          batchYear: 2024,
          departmentId: cseDept.id,
          semesterId: sem6.id,
          sectionId: sectionA.id,
        },
      },
    },
    include: { studentProfile: true },
  });

  // Link CRProfile
  await prisma.cRProfile.create({
    data: {
      userId: crUser.id,
      studentProfileId: crUser.studentProfile!.id,
      sectionId: sectionA.id,
      term: '2025-2026',
    },
  });

  // Student User
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@vidyasetu.edu',
      password: studentHash,
      role: Role.STUDENT,
      name: 'Priya Sharma',
      phone: '+91 98765 43213',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      studentProfile: {
        create: {
          rollNumber: '2024CSE088',
          batchYear: 2024,
          departmentId: cseDept.id,
          semesterId: sem6.id,
          sectionId: sectionA.id,
        },
      },
    },
    include: { studentProfile: true },
  });

  // Additional Peer Students for class roster
  const peer1 = await prisma.user.create({
    data: {
      email: 'rohan.mehta@vidyasetu.edu',
      password: studentHash,
      role: Role.STUDENT,
      name: 'Rohan Mehta',
      studentProfile: {
        create: {
          rollNumber: '2024CSE015',
          batchYear: 2024,
          departmentId: cseDept.id,
          semesterId: sem6.id,
          sectionId: sectionA.id,
        },
      },
    },
    include: { studentProfile: true },
  });

  const peer2 = await prisma.user.create({
    data: {
      email: 'neha.patel@vidyasetu.edu',
      password: studentHash,
      role: Role.STUDENT,
      name: 'Neha Patel',
      studentProfile: {
        create: {
          rollNumber: '2024CSE029',
          batchYear: 2024,
          departmentId: cseDept.id,
          semesterId: sem6.id,
          sectionId: sectionA.id,
        },
      },
    },
    include: { studentProfile: true },
  });

  console.log('✅ Users & Profiles created (Admin, Faculty, CR, Student, Peers)');

  // 5. Subjects for Semester 6
  const subDistributed = await prisma.subject.create({
    data: {
      name: 'Distributed Systems',
      code: 'CS601',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: sem6.id,
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subCompiler = await prisma.subject.create({
    data: {
      name: 'Compiler Design',
      code: 'CS602',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: sem6.id,
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subCloud = await prisma.subject.create({
    data: {
      name: 'Cloud Computing & Microservices',
      code: 'CS603',
      credits: 3,
      departmentId: cseDept.id,
      semesterId: sem6.id,
    },
  });

  const subML = await prisma.subject.create({
    data: {
      name: 'Machine Learning Foundations',
      code: 'CS604',
      credits: 3,
      departmentId: cseDept.id,
      semesterId: sem6.id,
    },
  });

  console.log('✅ Subjects created: CS601, CS602, CS603, CS604');

  // 6. Modules for Distributed Systems
  const mod1 = await prisma.module.create({
    data: {
      title: 'Module 1: Foundations of Distributed Computing',
      description: 'System models, network latency, fallacies of distributed computing, and architectural patterns.',
      orderIndex: 1,
      subjectId: subDistributed.id,
    },
  });

  const mod2 = await prisma.module.create({
    data: {
      title: 'Module 2: Interprocess Communication & RPC',
      description: 'Remote Procedure Calls (RPC), gRPC, Protocol Buffers, and message broker architectures.',
      orderIndex: 2,
      subjectId: subDistributed.id,
    },
  });

  const mod3 = await prisma.module.create({
    data: {
      title: 'Module 3: Logical Clocks & Synchronization',
      description: 'Lamport timestamps, vector clocks, mutual exclusion, and bully leader election.',
      orderIndex: 3,
      subjectId: subDistributed.id,
    },
  });

  const mod4 = await prisma.module.create({
    data: {
      title: 'Module 4: Consensus & Fault Tolerance',
      description: 'CAP Theorem, 2-Phase Commit, Paxos, and the Raft consensus algorithm.',
      orderIndex: 4,
      subjectId: subDistributed.id,
    },
  });

  console.log('✅ Modules seeded for Distributed Systems');

  // 7. Enrollments for Section A students
  const enrolledStudents = [crUser.studentProfile!, studentUser.studentProfile!, peer1.studentProfile!, peer2.studentProfile!];
  const allSubjects = [subDistributed, subCompiler, subCloud, subML];

  for (const stu of enrolledStudents) {
    for (const sub of allSubjects) {
      await prisma.enrollment.create({
        data: {
          studentId: stu.id,
          subjectId: sub.id,
          sectionId: sectionA.id,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('✅ Students enrolled in active subjects');

  // 8. Academic Resources
  await prisma.resource.create({
    data: {
      title: 'CS601 Complete Course Syllabus & Lecture Plan',
      description: 'Comprehensive 14-week lecture sequence, textbook references, and grading rubrics.',
      fileUrl: 'https://raw.githubusercontent.com/vidyasetu/resources/main/cs601-syllabus.pdf',
      fileType: 'PDF',
      subjectId: subDistributed.id,
      moduleId: mod1.id,
      uploadedById: facultyUser.id,
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Lecture 03 Slides - Vector Clocks and Distributed Ordering',
      description: 'Visual slide deck explaining partial ordering, causality, and vector timestamp arithmetic.',
      fileUrl: 'https://raw.githubusercontent.com/vidyasetu/resources/main/lecture3-vector-clocks.pdf',
      fileType: 'SLIDES',
      subjectId: subDistributed.id,
      moduleId: mod3.id,
      uploadedById: facultyUser.id,
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Raft Paper Walkthrough - In Search of an Understandable Consensus Algorithm',
      description: 'Stanford paper annotations and leader election state machine breakdown.',
      fileUrl: 'https://raft.github.io/raft.pdf',
      fileType: 'NOTES',
      subjectId: subDistributed.id,
      moduleId: mod4.id,
      uploadedById: facultyUser.id,
    },
  });

  console.log('✅ Study resources seeded');

  // 9. Assignments
  const dueIn10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const dueIn4Days = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  const assign1 = await prisma.assignment.create({
    data: {
      title: 'Assignment 1: Distributed Key-Value Store with Raft Protocol',
      description: 'Implement a 3-node in-memory key-value store in Node.js or Go with leader election and log replication.',
      dueDate: dueIn10Days,
      totalMarks: 100,
      subjectId: subDistributed.id,
      createdById: facultyUser.id,
    },
  });

  const assign2 = await prisma.assignment.create({
    data: {
      title: 'Assignment 2: Vector Clocks Causality Tracker',
      description: 'Build a lightweight module that tracks vector timestamps across 4 concurrent processes and detects concurrent events.',
      dueDate: dueIn4Days,
      totalMarks: 50,
      subjectId: subDistributed.id,
      createdById: facultyUser.id,
    },
  });

  console.log('✅ Assignments seeded');

  // 10. Submissions & Grades
  const subPriya = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign2.id,
      studentId: studentUser.studentProfile!.id,
      fileUrl: 'https://github.com/priyasharma/vector-clocks-lms',
      content: 'Implemented vector clocks with clock tick, send event, and message receive comparison logic. Passes all unit test cases.',
      status: SubmissionStatus.GRADED,
    },
  });

  await prisma.grade.create({
    data: {
      submissionId: subPriya.id,
      marksObtained: 47,
      feedback: 'Outstanding implementation! Elegant handling of concurrent event detection and clean unit test assertions.',
      gradedById: facultyUser.id,
    },
  });

  // Aman (CR) submitted
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign2.id,
      studentId: crUser.studentProfile!.id,
      fileUrl: 'https://github.com/amangupta/distributed-vector-sync',
      content: 'Completed task with TypeScript classes for Node Process and Message payload.',
      status: SubmissionStatus.SUBMITTED,
    },
  });

  console.log('✅ Submissions and grading seeded');

  // 11. Quizzes & Questions
  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'CS601 Midterm Prep: Distributed Clocks & Consistency',
      description: 'Test your understanding of logical clocks, total ordering, and consistency guarantees.',
      timeLimitMinutes: 20,
      totalMarks: 20,
      isPublished: true,
      dueDate: dueIn10Days,
      subjectId: subDistributed.id,
      createdById: facultyUser.id,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'Which logical clock mechanism guarantees that if Event A caused Event B, then Clock(A) < Clock(B) AND vice versa for causal relations?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      optionsJson: JSON.stringify(['Lamport Timestamps', 'Vector Clocks', 'Network Time Protocol (NTP)', 'Monotonic Hardware Clocks']),
      correctAnswer: '1', // Index 1: Vector Clocks
      marks: 5,
      orderIndex: 1,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'According to the CAP theorem, which property MUST be sacrificed when a network partition occurs in a distributed database requiring 100% availability?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      optionsJson: JSON.stringify(['Strict Consistency', 'Availability', 'Fault Tolerance', 'Latency']),
      correctAnswer: '0', // Index 0: Strict Consistency
      marks: 5,
      orderIndex: 2,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'In the Raft consensus algorithm, candidate nodes can only win an election if their log is at least as up-to-date as the majority of voters.',
      questionType: QuestionType.TRUE_FALSE,
      optionsJson: JSON.stringify(['True', 'False']),
      correctAnswer: '0', // Index 0: True
      marks: 5,
      orderIndex: 3,
    },
  });

  const q4 = await prisma.question.create({
    data: {
      quizId: quiz1.id,
      questionText: 'What is the primary drawback of using 2-Phase Commit (2PC) in high-throughput distributed transactions?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      optionsJson: JSON.stringify(['Data corruption on read', 'It is a blocking protocol vulnerable to coordinator failure', 'It cannot handle integers', 'Requires quantum clocks']),
      correctAnswer: '1', // Index 1
      marks: 5,
      orderIndex: 4,
    },
  });

  // Student Priya attempted quiz
  await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      studentId: studentUser.studentProfile!.id,
      score: 20,
      answersJson: JSON.stringify({
        [q1.id]: '1',
        [q2.id]: '0',
        [q3.id]: '0',
        [q4.id]: '1',
      }),
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  console.log('✅ Quiz, questions, and student attempt seeded');

  // 12. Announcements
  await prisma.announcement.create({
    data: {
      title: 'Spring 2026 Mid-Semester Examination Schedule Announced',
      content: 'The mid-term examination timetable has been officially finalized. CS601 Distributed Systems exam is slated for March 28th at 10:00 AM. Admit cards will be verified electronically.',
      priority: AnnouncementPriority.URGENT,
      targetRole: null, // Broadcast to all
      authorId: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'CR Council Meeting: Academic Feedback & Semester Fest Schedule',
      content: 'All Class Representatives (CRs) of Semester 6 are requested to attend the monthly academic liaison meeting in Conference Hall B on Friday at 3:30 PM.',
      priority: AnnouncementPriority.HIGH,
      targetRole: Role.CR,
      authorId: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'CS601 Lab Session Rescheduled to Thursday 2:00 PM',
      content: 'Due to scheduled network maintenance in the server room, Wednesday lab for CSE-A is shifted to Thursday 2:00 PM in Lab 304.',
      priority: AnnouncementPriority.MEDIUM,
      targetRole: Role.STUDENT,
      departmentId: cseDept.id,
      sectionId: sectionA.id,
      authorId: facultyUser.id,
    },
  });

  console.log('✅ Announcements seeded');

  // 13. Notifications
  await prisma.notification.create({
    data: {
      userId: studentUser.id,
      title: 'Assignment Graded',
      message: 'Prof. Rajesh Verma graded your submission for Assignment 2: 47/50 ("Outstanding implementation!").',
      link: '/app/assignments',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: studentUser.id,
      title: 'New Quiz Published',
      message: 'A new practice quiz "CS601 Midterm Prep" is now available.',
      link: '/app/quizzes',
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: facultyUser.id,
      title: 'New Submission',
      message: 'Aman Gupta submitted Assignment 2: Vector Clocks Causality Tracker.',
      link: '/app/assignments',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: crUser.id,
      title: 'CR Council Notice',
      message: 'CR Council Meeting scheduled for Friday at 3:30 PM in Conference Hall B.',
      link: '/app/announcements',
      isRead: false,
    },
  });

  console.log('✅ Notifications seeded');

  // 14. Audit Logs
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: 'ROOT',
      details: 'VidyaSetu LMS initialized with academic departments and seed roles.',
      userId: adminUser.id,
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'SUBJECT_ASSIGNMENT',
      entity: 'SUBJECT',
      entityId: subDistributed.id,
      details: 'Prof. Rajesh Verma assigned as lead faculty for CS601 Distributed Systems.',
      userId: adminUser.id,
      ipAddress: '127.0.0.1',
    },
  });

  console.log('\n=============================================');
  console.log('🎉 VIDYASETU DATABASE SEEDED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('Demo Credentials for Testing:');
  console.log('🔹 ADMIN:   admin@vidyasetu.edu   / admin123');
  console.log('🔹 FACULTY: faculty@vidyasetu.edu / faculty123');
  console.log('🔹 CR:      cr@vidyasetu.edu      / cr123');
  console.log('🔹 STUDENT: student@vidyasetu.edu / student123');
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
