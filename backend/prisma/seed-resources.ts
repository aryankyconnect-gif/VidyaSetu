// backend/prisma/seed-resources.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Academic Hierarchy Resources & Demo PYQs...');

  // Find faculty user
  const facultyUser = await prisma.user.findFirst({
    where: { role: 'FACULTY' },
    include: { facultyProfile: true },
  });

  if (!facultyUser) {
    console.error('Faculty user not found!');
    return;
  }

  // Find CS601, CS602, CS401, CS501
  const cs601 = await prisma.subject.findFirst({ where: { code: 'CS601' }, include: { modules: true } });
  const cs602 = await prisma.subject.findFirst({ where: { code: 'CS602' } });
  const cs401 = await prisma.subject.findFirst({ where: { code: 'CS401' } });
  const cs501 = await prisma.subject.findFirst({ where: { code: 'CS501' } });

  // 1. Create modules for CS602 (Compiler Design) if not existing
  let cs602Mod1 = await prisma.module.findFirst({ where: { subjectId: cs602?.id, orderIndex: 1 } });
  if (!cs602Mod1 && cs602) {
    cs602Mod1 = await prisma.module.create({
      data: {
        title: 'Module 1: Lexical Analysis & Finite Automata',
        description: 'Regular expressions, NFA to DFA conversion, lexer generation, and tokenization.',
        orderIndex: 1,
        subjectId: cs602.id,
      },
    });
    await prisma.module.create({
      data: {
        title: 'Module 2: Syntax Analysis & Parsing',
        description: 'Context-free grammars, LL(1), LR(0), SLR(1), and LALR parser construction.',
        orderIndex: 2,
        subjectId: cs602.id,
      },
    });
    await prisma.module.create({
      data: {
        title: 'Module 3: Intermediate Code Generation & Optimization',
        description: 'Three-address code, DAG representations, basic blocks, and loop optimizations.',
        orderIndex: 3,
        subjectId: cs602.id,
      },
    });
  }

  // 2. Create modules for CS401 (Operating Systems) if not existing
  let cs401Mod1 = await prisma.module.findFirst({ where: { subjectId: cs401?.id, orderIndex: 1 } });
  if (!cs401Mod1 && cs401) {
    cs401Mod1 = await prisma.module.create({
      data: {
        title: 'Module 1: Processes, Threads & Concurrency',
        description: 'Process life-cycle, context switching, scheduling algorithms, and IPC.',
        orderIndex: 1,
        subjectId: cs401.id,
      },
    });
    await prisma.module.create({
      data: {
        title: 'Module 2: Memory Management & Virtual Memory',
        description: 'Paging, segmentation, TLB, page replacement policies, and thrashing.',
        orderIndex: 2,
        subjectId: cs401.id,
      },
    });
  }

  // Clean existing demo resources to avoid duplicates
  await prisma.resource.deleteMany({
    where: {
      title: { contains: '[Demo Data]' },
    },
  });

  const samplePdfUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
  const alternativePdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const demoResources = [
    // --- CS601 Resources ---
    {
      title: 'Unit 1: Foundations of Distributed Systems - Complete Lecture Notes [Demo Data]',
      description: 'Comprehensive handwritten & typed lecture notes covering synchronous vs asynchronous models, failure modes, and CAP theorem.',
      fileUrl: samplePdfUrl,
      fileType: 'NOTES',
      fileSize: '3.4 MB',
      year: 2026,
      isPublished: true,
      subjectId: cs601!.id,
      moduleId: cs601!.modules[0]?.id || null,
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
      subjectId: cs601!.id,
      moduleId: cs601!.modules[1]?.id || null,
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
      subjectId: cs601!.id,
      moduleId: cs601!.modules[2]?.id || null,
      uploadedById: facultyUser.id,
    },
    {
      title: 'Reference Material: The Raft Consensus Algorithm Specification [Demo Data]',
      description: 'Canonical reference paper with annotated leader election rules and log replication invariants.',
      fileUrl: 'https://raft.github.io/raft.pdf',
      fileType: 'REFERENCE',
      fileSize: '1.2 MB',
      year: 2025,
      isPublished: true,
      subjectId: cs601!.id,
      moduleId: cs601!.modules[3]?.id || null,
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
      subjectId: cs601!.id,
      moduleId: null,
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
      subjectId: cs601!.id,
      moduleId: null,
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
      subjectId: cs601!.id,
      moduleId: null,
      uploadedById: facultyUser.id,
    },
    {
      title: 'CS601 End-Semester Exam Question Paper (Nov 2022) [Demo Data]',
      description: 'Archive examination question paper from academic year 2021-2022.',
      fileUrl: alternativePdfUrl,
      fileType: 'PYQ',
      fileSize: '1.5 MB',
      year: 2022,
      isPublished: true,
      subjectId: cs601!.id,
      moduleId: null,
      uploadedById: facultyUser.id,
    },

    // --- CS602 Compiler Design Resources & PYQs ---
    ...(cs602 ? [
      {
        title: 'Compiler Design: Lexical Analysis & Lex Generator Guide [Demo Data]',
        description: 'Comprehensive handbook on regular expressions to DFA and Flex/Lex specification format.',
        fileUrl: samplePdfUrl,
        fileType: 'PDF',
        fileSize: '2.7 MB',
        year: 2026,
        isPublished: true,
        subjectId: cs602.id,
        moduleId: cs602Mod1?.id || null,
        uploadedById: facultyUser.id,
      },
      {
        title: 'Lecture Slides: Bottom-Up Parsing & Shift-Reduce Conflicts [Demo Data]',
        description: 'Detailed slides with parsing tables, handle pruning, and SLR(1) conflict resolution examples.',
        fileUrl: 'https://www.cs.cornell.edu/courses/cs4120/2021sp/lectures/06parse/lec06-slides.pdf',
        fileType: 'PPT',
        fileSize: '4.6 MB',
        year: 2026,
        isPublished: true,
        subjectId: cs602.id,
        moduleId: null,
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
        subjectId: cs602.id,
        moduleId: null,
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
        subjectId: cs602.id,
        moduleId: null,
        uploadedById: facultyUser.id,
      },
    ] : []),

    // --- CS401 Operating Systems Resources & PYQs ---
    ...(cs401 ? [
      {
        title: 'Operating Systems: Concurrency & Semaphores Practice Problems [Demo Data]',
        description: 'Classic synchronization problems including Producer-Consumer, Dining Philosophers, and Readers-Writers.',
        fileUrl: samplePdfUrl,
        fileType: 'NOTES',
        fileSize: '1.9 MB',
        year: 2025,
        isPublished: true,
        subjectId: cs401.id,
        moduleId: cs401Mod1?.id || null,
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
        subjectId: cs401.id,
        moduleId: null,
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
        subjectId: cs401.id,
        moduleId: null,
        uploadedById: facultyUser.id,
      },
    ] : []),

    // --- CS501 Computer Networks PYQ ---
    ...(cs501 ? [
      {
        title: 'CS501 Computer Networks End-Semester Question Paper (Dec 2024) [Demo Data]',
        description: 'Questions on TCP/IP protocol suite, subnetting, BGP routing, and congestion control.',
        fileUrl: samplePdfUrl,
        fileType: 'PYQ',
        fileSize: '1.8 MB',
        year: 2024,
        isPublished: true,
        subjectId: cs501.id,
        moduleId: null,
        uploadedById: facultyUser.id,
      },
    ] : []),
  ];

  for (const res of demoResources) {
    await prisma.resource.create({ data: res });
  }

  console.log(`✅ Seeded ${demoResources.length} rich demo resources & PYQs successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
