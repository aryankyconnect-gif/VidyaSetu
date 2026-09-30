import { PrismaClient, Role, AnnouncementPriority, SubmissionStatus, QuestionType, DoubtStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VidyaSetu database seed...');

  // Clear existing data safely in reverse dependency order
  await prisma.doubtAttachment.deleteMany({});
  await prisma.doubtMessage.deleteMany({});
  await prisma.doubt.deleteMany({});
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

  const subDSA = await prisma.subject.create({
    data: {
      name: 'Data Structures & Algorithms',
      code: 'CS201',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: semesters[1].id, // Semester 2
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subDBMS = await prisma.subject.create({
    data: {
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: semesters[2].id, // Semester 3
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subOS = await prisma.subject.create({
    data: {
      name: 'Operating Systems',
      code: 'CS401',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: semesters[3].id, // Semester 4
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subCN = await prisma.subject.create({
    data: {
      name: 'Computer Networks',
      code: 'CS501',
      credits: 4,
      departmentId: cseDept.id,
      semesterId: semesters[4].id, // Semester 5
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  const subTOC = await prisma.subject.create({
    data: {
      name: 'Theory of Computation',
      code: 'CS502',
      credits: 3,
      departmentId: cseDept.id,
      semesterId: semesters[4].id, // Semester 5
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  // Additional Department Subjects for ECE & IT
  const subECE401 = await prisma.subject.create({
    data: {
      name: 'Digital Signal Processing',
      code: 'EC401',
      credits: 4,
      departmentId: eceDept.id,
      semesterId: semesters[3].id, // Semester 4
    },
  });

  const subECE601 = await prisma.subject.create({
    data: {
      name: 'Embedded Systems & IoT',
      code: 'EC601',
      credits: 3,
      departmentId: eceDept.id,
      semesterId: sem6.id, // Semester 6
    },
  });

  const subIT601 = await prisma.subject.create({
    data: {
      name: 'Cloud Architecture & DevOps',
      code: 'IT601',
      credits: 4,
      departmentId: itDept.id,
      semesterId: sem6.id, // Semester 6
    },
  });

  console.log('✅ Subjects created across CSE, ECE, and IT departments');

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

  // 6b. Modules for CS602 (Compiler Design)
  const cs602Mod1 = await prisma.module.create({
    data: {
      title: 'Module 1: Lexical Analysis & Finite Automata',
      description: 'Regular expressions, NFA to DFA conversion, lexer generation, and tokenization.',
      orderIndex: 1,
      subjectId: subCompiler.id,
    },
  });
  await prisma.module.create({
    data: {
      title: 'Module 2: Syntax Analysis & Parsing',
      description: 'Context-free grammars, LL(1), LR(0), SLR(1), and LALR parser construction.',
      orderIndex: 2,
      subjectId: subCompiler.id,
    },
  });

  // 6c. Modules for CS401 (Operating Systems)
  const cs401Mod1 = await prisma.module.create({
    data: {
      title: 'Module 1: Processes, Threads & Concurrency',
      description: 'Process life-cycle, context switching, scheduling algorithms, and IPC.',
      orderIndex: 1,
      subjectId: subOS.id,
    },
  });
  await prisma.module.create({
    data: {
      title: 'Module 2: Memory Management & Virtual Memory',
      description: 'Paging, segmentation, TLB, page replacement policies, and thrashing.',
      orderIndex: 2,
      subjectId: subOS.id,
    },
  });

  console.log('✅ Modules seeded for Distributed Systems, Compiler Design, and OS');

  // 7. Enrollments for Section A students
  const enrolledStudents = [crUser.studentProfile!, studentUser.studentProfile!, peer1.studentProfile!, peer2.studentProfile!];
  const allSubjects = [subDistributed, subCompiler, subCloud, subML, subDSA, subDBMS, subOS, subCN, subTOC, subECE401, subECE601, subIT601];

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

  // 8. Academic Resources & PYQs
  const samplePdfUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
  const alternativePdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const demoResources = [
    // --- CS601 Resources & Notes ---
    {
      title: 'Unit 1: Foundations of Distributed Systems - Complete Lecture Notes [Demo Data]',
      description: 'Comprehensive handwritten & typed lecture notes covering synchronous vs asynchronous models, failure modes, and CAP theorem.',
      fileUrl: samplePdfUrl,
      fileType: 'NOTES',
      fileSize: '3.4 MB',
      year: 2026,
      isPublished: true,
      subjectId: subDistributed.id,
      moduleId: mod1.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'Lecture 03 Slides - Vector Clocks and Distributed Ordering [Demo Data]',
      description: 'Visual slide deck explaining partial ordering, causality, and vector timestamp arithmetic.',
      fileUrl: 'https://raw.githubusercontent.com/vidyasetu/resources/main/lecture3-vector-clocks.pdf',
      fileType: 'SLIDES',
      fileSize: '4.2 MB',
      year: 2026,
      isPublished: true,
      subjectId: subDistributed.id,
      moduleId: mod3.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'Module 2: gRPC & Modern RPC Frameworks Presentation [Demo Data]',
      description: 'Official slide deck detailing Protocol Buffers v3, streaming RPCs, and load balancing patterns.',
      fileUrl: 'https://grpc.io/docs/what-is-grpc/introduction/',
      fileType: 'PPT',
      fileSize: '8.1 MB',
      year: 2026,
      isPublished: true,
      subjectId: subDistributed.id,
      moduleId: mod2.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'Raft Paper Walkthrough - In Search of an Understandable Consensus Algorithm [Demo Data]',
      description: 'Stanford paper annotations and leader election state machine breakdown.',
      fileUrl: 'https://raft.github.io/raft.pdf',
      fileType: 'NOTES',
      fileSize: '1.2 MB',
      year: 2025,
      isPublished: true,
      subjectId: subDistributed.id,
      moduleId: mod4.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'Recorded Lecture: Lamport Clocks and Vector Timestamps [Demo Data]',
      description: 'Full 52-minute classroom recording demonstrating vector clock synchronization with step-by-step trace exercises.',
      fileUrl: 'https://www.youtube.com/watch?v=OKrnJ4Wz-54',
      fileType: 'VIDEO',
      fileSize: '450 MB',
      year: 2026,
      isPublished: true,
      subjectId: subDistributed.id,
      moduleId: mod3.id,
      uploadedById: facultyUser.id,
    },

    // --- CS601 PYQs ---
    {
      title: 'CS601 End-Semester Exam Question Paper (Nov 2024) [Demo Data]',
      description: 'Official end-semester university question paper for Distributed Systems with marking scheme and solution hints.',
      fileUrl: samplePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.8 MB',
      year: 2024,
      isPublished: true,
      subjectId: subDistributed.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS601 Mid-Semester Examination Paper (Sep 2024) [Demo Data]',
      description: 'Mid-term question paper focusing on Modules 1 & 2: System models, RPC, and logical clocks.',
      fileUrl: alternativePdfUrl,
      fileType: 'PYQ',
      fileSize: '950 KB',
      year: 2024,
      isPublished: true,
      subjectId: subDistributed.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS601 End-Semester Exam Question Paper (Nov 2023) [Demo Data]',
      description: 'Comprehensive 3-hour examination paper covering consensus, Byzantine fault tolerance, and distributed shared memory.',
      fileUrl: samplePdfUrl,
      fileType: 'PYQ',
      fileSize: '2.1 MB',
      year: 2023,
      isPublished: true,
      subjectId: subDistributed.id,
      uploadedById: facultyUser.id,
    },

    // --- CS602 Compiler Design Resources & PYQs ---
    {
      title: 'Compiler Design: Lexical Analysis & Lex Generator Guide [Demo Data]',
      description: 'Comprehensive handbook on regular expressions to DFA and Flex/Lex specification format.',
      fileUrl: samplePdfUrl,
      fileType: 'PDF',
      fileSize: '2.7 MB',
      year: 2026,
      isPublished: true,
      subjectId: subCompiler.id,
      moduleId: cs602Mod1.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS602 End-Semester Examination Question Paper (Dec 2024) [Demo Data]',
      description: 'End-term paper containing LL(1) parsing table construction, LR grammar verification, and TAC generation problems.',
      fileUrl: samplePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.6 MB',
      year: 2024,
      isPublished: true,
      subjectId: subCompiler.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS602 End-Semester Examination Question Paper (Dec 2023) [Demo Data]',
      description: 'Previous year paper testing parser generators, syntax-directed translation, and DAG optimizations.',
      fileUrl: alternativePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.4 MB',
      year: 2023,
      isPublished: true,
      subjectId: subCompiler.id,
      uploadedById: facultyUser.id,
    },

    // --- CS401 Operating Systems Resources & PYQs ---
    {
      title: 'Operating Systems: Concurrency & Semaphores Practice Problems [Demo Data]',
      description: 'Classic synchronization problems including Producer-Consumer, Dining Philosophers, and Readers-Writers.',
      fileUrl: samplePdfUrl,
      fileType: 'NOTES',
      fileSize: '1.9 MB',
      year: 2025,
      isPublished: true,
      subjectId: subOS.id,
      moduleId: cs401Mod1.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS401 End-Semester Exam Question Paper (May 2024) [Demo Data]',
      description: 'OS end-sem question paper covering process scheduling algorithms, deadlock detection, and virtual memory page faults.',
      fileUrl: samplePdfUrl,
      fileType: 'PYQ',
      fileSize: '2.0 MB',
      year: 2024,
      isPublished: true,
      subjectId: subOS.id,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS401 End-Semester Exam Question Paper (May 2023) [Demo Data]',
      description: 'Annual examination question paper with detailed problem statements on Banker\'s algorithm and page replacement.',
      fileUrl: alternativePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.7 MB',
      year: 2023,
      isPublished: true,
      subjectId: subOS.id,
      uploadedById: facultyUser.id,
    },

    // --- CS501 Computer Networks PYQ ---
    {
      title: 'CS501 Computer Networks End-Semester Question Paper (Dec 2024) [Demo Data]',
      description: 'Questions on TCP/IP protocol suite, subnetting, BGP routing, and congestion control.',
      fileUrl: samplePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.8 MB',
      year: 2024,
      isPublished: true,
      subjectId: subCN.id,
      uploadedById: facultyUser.id,
    },
  ];

  for (const res of demoResources) {
    await prisma.resource.create({ data: res });
  }

  console.log(`✅ Seeded ${demoResources.length} rich demo resources & PYQs successfully`);

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

  // 10. Submissions & Grades with Similarity Scores
  const subPriya = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign2.id,
      studentId: studentUser.studentProfile!.id,
      fileUrl: 'https://github.com/priyasharma/vector-clocks-lms',
      content: 'Implemented vector clocks with clock tick, send event, and message receive comparison logic. Passes all unit test cases.',
      similarityScore: 11.4,
      similarityReport: 'Low similarity (11.4%) - Authentic, original work',
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
      similarityScore: 19.8,
      similarityReport: 'Low similarity (19.8%) - Authentic, original work',
      status: SubmissionStatus.SUBMITTED,
    },
  });

  // Peer 1 submitted Assignment 1
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assign1.id,
      studentId: peer1.studentProfile!.id,
      fileUrl: 'https://github.com/peer1/raft-kv-store',
      content: 'Basic Raft consensus implementation following standard GitHub reference template for 3-node cluster.',
      similarityScore: 78.5,
      similarityReport: 'High similarity (78.5%) detected with public boilerplate repository',
      status: SubmissionStatus.SUBMITTED,
    },
  });

  console.log('✅ Submissions with similarity indicators and grading seeded');

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

  // 15. Realistic Sample Doubts (Doubt Hub / Help Desk)
  // Doubt 1: DBMS Normalization (ANSWERED)
  const doubt1 = await prisma.doubt.create({
    data: {
      title: 'When is 3NF preferred over BCNF in production database systems?',
      topic: 'Normalization & Functional Dependencies',
      description: 'I understand that BCNF eliminates all anomalies due to functional dependencies where the LHS is not a superkey. But in practice, why do real-world relational database schemas often stop at 3NF rather than pushing to BCNF? Is dependency preservation always lost?',
      status: DoubtStatus.ANSWERED,
      subjectId: subDBMS.id,
      studentId: studentUser.studentProfile!.id,
      facultyId: facultyUser.facultyProfile!.id,
      attachments: {
        create: [
          {
            fileName: 'bcnf-decomposition-example.png',
            fileUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
            fileType: 'IMAGE',
            fileSize: 142000,
            uploadedById: studentUser.id,
          },
        ],
      },
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt1.id,
      senderId: studentUser.id,
      content: 'Can you provide a concrete example where decomposing into BCNF causes us to lose a crucial functional dependency?',
      isFaculty: false,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt1.id,
      senderId: facultyUser.id,
      content: 'Excellent question, Priya! Consider a relation R(Student, Subject, Teacher) with FDs: {Student, Subject} -> Teacher and Teacher -> Subject. The candidate keys are {Student, Subject} and {Teacher, Student}. Notice that Teacher -> Subject violates BCNF because Teacher is not a superkey. When decomposing into BCNF, we get R1(Teacher, Subject) and R2(Teacher, Student). However, the original dependency {Student, Subject} -> Teacher spans across both tables and cannot be verified without an expensive JOIN operation! In high-throughput production OLTP systems, preserving dependencies is critical to avoid multi-table locks, which is why 3NF is often chosen as the pragmatic sweet spot.',
      isFaculty: true,
      attachments: {
        create: [
          {
            fileName: '3NF_vs_BCNF_Comparison.pdf',
            fileUrl: 'https://raw.githubusercontent.com/vidyasetu/resources/main/3nf-vs-bcnf.pdf',
            fileType: 'PDF',
            fileSize: 284000,
            doubtId: doubt1.id,
            uploadedById: facultyUser.id,
          },
        ],
      },
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt1.id,
      senderId: studentUser.id,
      content: 'Thank you Prof. Verma! The R(Student, Subject, Teacher) example makes it crystal clear why 3NF is preferred when dependencies must be checked on single-row inserts.',
      isFaculty: false,
    },
  });

  // Doubt 2: DSA Linked-List (IN_DISCUSSION)
  const doubt2 = await prisma.doubt.create({
    data: {
      title: 'Why do we need a dummy node in singly linked lists?',
      topic: 'Linked List',
      description: 'I understand linked lists conceptually, but in algorithm implementations like merge two sorted lists or delete node, why are dummy/sentinel nodes so heavily recommended? Doesn\'t it waste extra memory?',
      status: DoubtStatus.IN_DISCUSSION,
      subjectId: subDSA.id,
      studentId: studentUser.studentProfile!.id,
      facultyId: facultyUser.facultyProfile!.id,
      attachments: {
        create: [
          {
            fileName: 'dummy_node_diagram.png',
            fileUrl: 'https://images.unsplash.com/photo-1516116211227-bbc32d4314be?w=800',
            fileType: 'IMAGE',
            fileSize: 98000,
            uploadedById: studentUser.id,
          },
        ],
      },
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt2.id,
      senderId: studentUser.id,
      content: 'Does creating a dummy node introduce memory leak risks in C++ or overhead in garbage-collected languages like Java and TypeScript?',
      isFaculty: false,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt2.id,
      senderId: facultyUser.id,
      content: 'A dummy node eliminates special-case branching for updating the head pointer. Without a dummy node, operations like prepending or inserting at the head require checking `if (head == null)`. With a dummy sentinel, every valid node always has a preceding node! In Java/JS, once you return `dummy.next`, the dummy node reference is dropped and cleaned up by GC. In C++, you can allocate it on the stack (`ListNode dummy(0);`) which has zero heap allocation overhead.',
      isFaculty: true,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt2.id,
      senderId: studentUser.id,
      content: 'Can you show how this simplifies the LeetCode 21 (Merge Two Sorted Lists) implementation?',
      isFaculty: false,
    },
  });

  // Doubt 3: Operating Systems Deadlock (OPEN)
  const doubt3 = await prisma.doubt.create({
    data: {
      title: 'Is an unsafe state in Banker\'s Algorithm strictly a deadlock?',
      topic: 'Deadlock Avoidance',
      description: 'In our lecture on deadlock avoidance, we studied that if a system enters an unsafe state, it does not necessarily mean a deadlock has occurred immediately. Why is it called unsafe if it might not deadlock?',
      status: DoubtStatus.OPEN,
      subjectId: subOS.id,
      studentId: studentUser.studentProfile!.id,
      facultyId: facultyUser.facultyProfile!.id,
      attachments: {
        create: [
          {
            fileName: 'resource_allocation_graph.png',
            fileUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
            fileType: 'IMAGE',
            fileSize: 112000,
            uploadedById: studentUser.id,
          },
        ],
      },
    },
  });

  // Doubt 4: Computer Networks TCP/UDP (RESOLVED)
  const doubt4 = await prisma.doubt.create({
    data: {
      title: 'Why does TCP require a 3-way handshake instead of a 2-way handshake?',
      topic: 'Transport Layer & TCP Handshake',
      description: 'Both client and server need to agree on sequence numbers. Why can\'t the server simply respond with SYN-ACK and immediately start sending data, making it a 2-way handshake? What vulnerability does this prevent?',
      status: DoubtStatus.RESOLVED,
      subjectId: subCN.id,
      studentId: crUser.studentProfile!.id,
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt4.id,
      senderId: crUser.id,
      content: 'If the client initiates the connection and sends its ISN (Initial Sequence Number), why does the server need a confirmation ACK before transmitting data?',
      isFaculty: false,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt4.id,
      senderId: facultyUser.id,
      content: 'Great question, Aman. In packet-switched networks, IP packets can get delayed, duplicated, and arrive out of order. Suppose a client sends a SYN packet that gets stuck in router queues. The client times out, terminates the attempt, and opens another connection. Much later, that delayed duplicate SYN arrives at the server. Under a 2-way handshake, the server would send a SYN-ACK, immediately allocate buffers and TCP control blocks, and believe a valid connection is active — while the client has already moved on! With a 3-way handshake, the server waits for the client\'s ACK. Since the client knows it didn\'t request that connection, it responds with an RST (Reset) packet, terminating the phantom connection and preventing massive server resource leakage.',
      isFaculty: true,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt4.id,
      senderId: crUser.id,
      content: 'That makes complete sense! It protects against ghost/delayed SYN packets and half-open connections. Thank you, marking this doubt as resolved!',
      isFaculty: false,
    },
  });

  // Doubt 5: Theory of Computation DFA/NFA (OPEN)
  const doubt5 = await prisma.doubt.create({
    data: {
      title: 'Equivalence of DFA and NFA: Why does subset construction result in 2^Q states?',
      topic: 'Finite Automata & Subset Construction',
      description: 'We proved that NFAs and DFAs have equal expressive power because any NFA can be transformed into a DFA using powerset/subset construction. Is the exponential blowup O(2^n) unavoidable in the worst case?',
      status: DoubtStatus.OPEN,
      subjectId: subTOC.id,
      studentId: studentUser.studentProfile!.id,
      facultyId: facultyUser.facultyProfile!.id,
    },
  });

  await prisma.doubtMessage.create({
    data: {
      doubtId: doubt5.id,
      senderId: studentUser.id,
      content: 'Are there standard regular languages where the minimal DFA strictly requires 2^n states while an n-state NFA is sufficient?',
      isFaculty: false,
    },
  });

  console.log('✅ Realistic sample doubts seeded: DBMS, DSA, OS, CN, TOC');

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
