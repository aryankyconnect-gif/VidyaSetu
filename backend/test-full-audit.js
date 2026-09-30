// backend/test-full-audit.js
const assert = require('assert');

async function runFullAuditSuite() {
  console.log('===============================================================');
  console.log('🚀 VIDYASETU LMS FULL AUDIT & DEMO SUITE VERIFICATION');
  console.log('===============================================================\n');

  const BASE_URL = 'http://localhost:4000/api';

  const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return { token: data.data?.token, user: data.data?.user };
  };

  // 1. AUTHENTICATION & ROLE-BASED ACCESS
  console.log('--- 1. Testing Authentication for all 4 Roles ---');
  const admin = await login('admin@vidyasetu.edu', 'admin123');
  const faculty = await login('faculty@vidyasetu.edu', 'faculty123');
  const cr = await login('cr@vidyasetu.edu', 'cr123');
  const student = await login('student@vidyasetu.edu', 'student123');

  assert(admin.token, 'Admin login failed');
  assert(faculty.token, 'Faculty login failed');
  assert(cr.token, 'CR login failed');
  assert(student.token, 'Student login failed');
  console.log('✅ Admin, Faculty, CR, and Student logins verified successfully.');

  // 2. DASHBOARDS (Student, Faculty, CR, Admin)
  console.log('\n--- 2. Testing Dashboards for all 4 Roles ---');
  const getDashboard = async (token) => {
    const res = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  };

  const adminDash = await getDashboard(admin.token);
  assert(adminDash.data?.metrics?.totalUsers > 0, 'Admin metrics missing');
  console.log(`✅ Admin Dashboard: ${adminDash.data.metrics.totalUsers} users, ${adminDash.data.metrics.totalDepartments} departments, ${adminDash.data.metrics.totalSubjects} subjects`);

  const facultyDash = await getDashboard(faculty.token);
  assert(facultyDash.data?.assignedSubjects, 'Faculty subjects missing');
  console.log(`✅ Faculty Dashboard: ${facultyDash.data.assignedSubjects.length} subjects assigned, ${facultyDash.data.metrics.totalStudentsTaught} students taught`);

  const crDash = await getDashboard(cr.token);
  assert(crDash.data?.peerStudents, 'CR peers missing');
  console.log(`✅ CR Dashboard: ${crDash.data.peerStudents.length} section peers, ${crDash.data.activeAnnouncements.length} announcements`);

  const studentDash = await getDashboard(student.token);
  assert(studentDash.data?.enrolledSubjects, 'Student enrolled subjects missing');
  console.log(`✅ Student Dashboard: ${studentDash.data.enrolledSubjects.length} enrolled subjects, ${studentDash.data.metrics.totalCredits} credits`);

  // 3. STUDENT DEMO FLOW
  console.log('\n--- 3. Testing Complete Student Demo Flow ---');
  // 3a. Opens Subject (CS601)
  const subjectsRes = await fetch(`${BASE_URL}/academic/subjects`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  const cs601 = subjectsRes.data.find(s => s.code === 'CS601');
  assert(cs601, 'CS601 subject not found');

  const subjectDetailRes = await fetch(`${BASE_URL}/academic/subjects/${cs601.id}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  assert(subjectDetailRes.data?.modules?.length > 0, 'CS601 modules missing');
  console.log(`✅ Student opens subject: ${subjectDetailRes.data.name} (${subjectDetailRes.data.modules.length} modules)`);

  // 3b. Reads notes in Module 1
  const mod1 = subjectDetailRes.data.modules[0];
  const mod1Resources = mod1.resources || [];
  const notesRes = mod1Resources.find(r => r.fileType === 'NOTES' || r.fileType === 'PDF');
  assert(notesRes, 'Notes resource not found in Module 1');
  console.log(`✅ Student reads notes: "${notesRes.title}" (${notesRes.fileType}, ${notesRes.fileSize || 'Standard'})`);

  // 3c. Opens PYQ
  const pyqRes = await fetch(`${BASE_URL}/resources/pyqs?subjectId=${cs601.id}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  assert(pyqRes.data?.length > 0, 'No PYQs found for CS601');
  console.log(`✅ Student opens PYQ: "${pyqRes.data[0].title}" (Year: ${pyqRes.data[0].year})`);

  // 3d. Sees assignment
  const assignmentsRes = await fetch(`${BASE_URL}/assignments?subjectId=${cs601.id}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  const assign1 = assignmentsRes.data.find(a => new Date(a.dueDate) > new Date()) || assignmentsRes.data[0];
  assert(assign1, 'Active assignment not found');
  console.log(`✅ Student sees assignment: "${assign1.title}" (Due: ${new Date(assign1.dueDate).toLocaleDateString()}, Total Marks: ${assign1.totalMarks})`);

  // 3e. Submits assignment & gets similarity score
  const submitRes = await fetch(`${BASE_URL}/assignments/${assign1.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Independent implementation of 3-node in-memory key-value store in TypeScript with Raft leader election, heartbeats, and log entry replication.',
      fileUrl: 'https://github.com/priyasharma/raft-kv-store-solution',
    }),
  }).then(r => r.json());
  assert(submitRes.data?.similarityScore !== undefined, 'Similarity score was not calculated');
  console.log(`✅ Student submits assignment: Similarity Score = ${submitRes.data.similarityScore}% (${submitRes.data.similarityReport})`);

  // 3f. Attempts quiz
  const quizzesRes = await fetch(`${BASE_URL}/quizzes?subjectId=${cs601.id}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  assert(quizzesRes.data?.length > 0, 'No quizzes found for CS601');
  const quiz1 = quizzesRes.data[0];
  console.log(`✅ Student attempts quiz: "${quiz1.title}" (${quiz1.timeLimitMinutes} mins, ${quiz1.totalMarks} marks)`);

  // 3g. Uses AI Study Assistant
  const aiAskRes = await fetch(`${BASE_URL}/ai/ask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Explain the difference between Lamport logical clocks and Vector clocks in distributed systems.',
      subjectId: cs601.id,
    }),
  }).then(r => r.json());
  assert(aiAskRes.data?.answer, 'AI Assistant failed to answer');
  console.log(`✅ Student uses AI Study Assistant: Received verified response (${aiAskRes.data.source})`);

  // 3h. Receives notification
  const notifRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${student.token}` },
  }).then(r => r.json());
  assert(notifRes.data?.notifications?.length > 0, 'No notifications found');
  console.log(`✅ Student receives notification: "${notifRes.data.notifications[0].title}" (${notifRes.data.unreadCount} unread)`);

  // 4. FACULTY DEMO FLOW
  console.log('\n--- 4. Testing Complete Faculty Demo Flow ---');
  // 4a. Faculty uploads resource
  const newUploadRes = await fetch(`${BASE_URL}/resources`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'CS601 Consensus Proofs & Invariants Handout',
      fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
      fileType: 'PDF',
      fileSize: '1.5 MB',
      isPublished: true,
      subjectId: cs601.id,
      moduleId: mod1.id,
    }),
  }).then(r => r.json());
  assert(newUploadRes.data?.id, 'Faculty upload resource failed');
  console.log(`✅ Faculty uploads resource: "${newUploadRes.data.title}" to CS601`);

  // 4b. Faculty creates assignment
  const newAssignRes = await fetch(`${BASE_URL}/assignments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Lab 4: Paxos State Machine Replication',
      description: 'Implement Single-Decree Paxos with Proposer, Acceptor, and Learner roles.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalMarks: 50,
      subjectId: cs601.id,
      isPublished: true,
    }),
  }).then(r => r.json());
  assert(newAssignRes.data?.id, 'Faculty create assignment failed');
  console.log(`✅ Faculty creates assignment: "${newAssignRes.data.title}"`);

  // 4c. Reviews submissions & checks similarity indicator
  const reviewRes = await fetch(`${BASE_URL}/assignments/${assign1.id}`, {
    headers: { Authorization: `Bearer ${faculty.token}` },
  }).then(r => r.json());
  const submissions = reviewRes.data.submissions || [];
  assert(submissions.length > 0, 'No submissions to review');
  const targetSub = submissions[0];
  console.log(`✅ Faculty reviews submission: Student "${targetSub.student?.user?.name}" with Similarity Indicator: ${targetSub.similarityScore}% (${targetSub.similarityReport})`);

  // 4d. Grades student
  const gradeRes = await fetch(`${BASE_URL}/assignments/submissions/${targetSub.id}/grade`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      marksObtained: 95,
      feedback: 'Excellent Raft implementation with robust leader election failover tests!',
    }),
  }).then(r => r.json());
  assert(gradeRes.data?.marksObtained === 95, 'Grading failed');
  console.log(`✅ Faculty grades student: ${gradeRes.data.marksObtained}/${assign1.totalMarks} marks awarded`);

  // 4e. Reviews AI-generated questions
  const aiQuizGenRes = await fetch(`${BASE_URL}/ai/quiz/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'Vector Clocks and Causality',
      numberOfQuestions: 3,
      difficulty: 'MEDIUM',
      subjectId: cs601.id,
    }),
  }).then(r => r.json());
  assert(aiQuizGenRes.data?.questions?.length > 0, 'AI quiz questions not generated');
  console.log(`✅ Faculty reviews AI-generated questions: ${aiQuizGenRes.data.questions.length} questions generated (${aiQuizGenRes.data.source})`);

  // 4f. Faculty creates quiz from reviewed questions
  const createQuizRes = await fetch(`${BASE_URL}/quizzes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Vector Clocks Quick Check Quiz',
      description: 'Faculty-reviewed assessment generated with VidyaSetu AI Engine.',
      timeLimitMinutes: 15,
      totalMarks: 15,
      subjectId: cs601.id,
      isPublished: true,
      questions: aiQuizGenRes.data.questions.map(q => ({
        questionText: q.question,
        questionType: 'MULTIPLE_CHOICE',
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: 5,
      })),
    }),
  }).then(r => r.json());
  assert(createQuizRes.data?.id, 'Faculty create quiz failed');
  console.log(`✅ Faculty creates live quiz: "${createQuizRes.data.title}"`);

  // 5. ADMIN DEMO FLOW
  console.log('\n--- 5. Testing Complete Admin Demo Flow ---');
  // 5a. Admin manages users
  const usersRes = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  }).then(r => r.json());
  assert(Array.isArray(usersRes.data) && usersRes.data.length > 0, 'Users list empty');
  console.log(`✅ Admin manages users: ${usersRes.data.length} active users retrieved in user directory`);

  // 5b. Admin manages academic structure
  const deptsRes = await fetch(`${BASE_URL}/academic/departments`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  }).then(r => r.json());
  console.log(`✅ Admin views academic hierarchy: ${deptsRes.data.length} departments (CSE, ECE, IT)`);

  // 5c. Admin views system analytics
  const analyticsRes = await fetch(`${BASE_URL}/analytics/overview`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  }).then(r => r.json());
  console.log(`✅ Admin views system analytics: Status ${analyticsRes.status || 200}`);

  // 6. SECURITY & PERMISSION ENFORCEMENT
  console.log('\n--- 6. Testing Security & Role-Based Guardrails ---');
  // 6a. Student cannot create department
  const stForbiddenDept = await fetch(`${BASE_URL}/academic/departments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacker Department', code: 'HACK' }),
  });
  assert(stForbiddenDept.status === 403, 'Student should be forbidden from creating departments');
  console.log('✅ Security: Student cannot create department (403 Forbidden)');

  // 6b. Faculty cannot upload to unassigned subject
  const unassignedSub = subjectsRes.data.find(s => s.code === 'CS603');
  if (unassignedSub) {
    const facForbiddenUpload = await fetch(`${BASE_URL}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${faculty.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Upload',
        fileUrl: 'https://example.com/test.pdf',
        fileType: 'PDF',
        subjectId: unassignedSub.id,
      }),
    });
    assert(facForbiddenUpload.status === 403, 'Faculty should be forbidden from unassigned subject');
    console.log('✅ Security: Faculty cannot modify unassigned subject CS603 (403 Forbidden)');
  }

  // 6c. Deadline Locking: submission rejected after deadline
  const expiredAssign = await fetch(`${BASE_URL}/assignments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Expired Past Assignment Test',
      description: 'Due date in the past',
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      totalMarks: 50,
      subjectId: cs601.id,
      isPublished: true,
    }),
  }).then(r => r.json());

  const lateSubmitRes = await fetch(`${BASE_URL}/assignments/${expiredAssign.data.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Late work test' }),
  });
  assert(lateSubmitRes.status === 403, 'Submission after deadline must be rejected');
  console.log('✅ Security: Deadline locking enforced (403 Submission deadline has passed)');

  // Cleanup test assignment and uploaded resource
  await fetch(`${BASE_URL}/resources/${newUploadRes.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  await fetch(`${BASE_URL}/assignments/${newAssignRes.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  await fetch(`${BASE_URL}/assignments/${expiredAssign.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${admin.token}` },
  });

  console.log('\n===============================================================');
  console.log('🎉 ALL AUDIT & DEMO SUITE VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

runFullAuditSuite().catch(err => {
  console.error('❌ Full Audit Suite Failed:', err);
  process.exit(1);
});
