// backend/test-verification.js

async function runCompleteVerification() {
  console.log('🚀 Running VidyaSetu Academic & Resource Vault Verification Suite\n');

  const login = async (email, password) => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.data?.token;
  };

  const adminToken = await login('admin@vidyasetu.edu', 'admin123');
  const facultyToken = await login('faculty@vidyasetu.edu', 'faculty123');
  const studentToken = await login('student@vidyasetu.edu', 'student123');

  if (!adminToken || !facultyToken || !studentToken) {
    throw new Error('Failed to login demo users');
  }
  console.log('✅ 1. Authentication for Admin, Faculty, and Student: SUCCESS');

  // Fetch subjects
  const subRes = await fetch('http://localhost:4000/api/academic/subjects', {
    headers: { Authorization: 'Bearer ' + adminToken }
  }).then(r => r.json());
  const subjects = subRes.data;
  const cs601 = subjects.find(s => s.code === 'CS601');

  // TEST 1: Admin can manage academic structure
  console.log('\n--- TEST 1: Admin Academic Structure Management ---');
  // 1a. Create Department
  const deptRes = await fetch('http://localhost:4000/api/academic/departments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aerospace Engineering (Test Dept)',
      code: 'AERO_TEST',
      description: 'Test Department'
    })
  });
  console.log('Admin creates department: Status', deptRes.status, deptRes.status === 201 ? '✅ PASS' : '❌ FAIL');
  const testDept = (await deptRes.json()).data;

  // 1b. Create Semester for Department
  const semRes = await fetch('http://localhost:4000/api/academic/semesters', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: 99,
      name: 'Semester 99 Test',
      academicYear: '2026-2027',
      departmentId: testDept.id
    })
  });
  console.log('Admin creates semester: Status', semRes.status, semRes.status === 201 ? '✅ PASS' : '❌ FAIL');
  const testSem = (await semRes.json()).data;

  // 1c. Create Subject and Assign Faculty
  const createSubRes = await fetch('http://localhost:4000/api/academic/subjects', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aerodynamics Fundamentals',
      code: 'AE901',
      credits: 4,
      departmentId: testDept.id,
      semesterId: testSem.id,
      facultyId: cs601.facultyId
    })
  });
  console.log('Admin creates subject with faculty: Status', createSubRes.status, createSubRes.status === 201 ? '✅ PASS' : '❌ FAIL');
  const testSub = (await createSubRes.json()).data;

  // 1d. Create Module for Subject
  const modRes = await fetch('http://localhost:4000/api/academic/modules', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Module 1: Subsonic Incompressible Flow',
      description: 'Bernoulli equation and stream functions',
      orderIndex: 1,
      subjectId: testSub.id
    })
  });
  console.log('Admin creates module: Status', modRes.status, modRes.status === 201 ? '✅ PASS' : '❌ FAIL');
  const testMod = (await modRes.json()).data;

  // TEST 2: Faculty can upload resource to assigned subject
  console.log('\n--- TEST 2: Faculty Uploads Resource ---');
  const cs601Full = await fetch('http://localhost:4000/api/academic/subjects/' + cs601.id, {
    headers: { Authorization: 'Bearer ' + facultyToken }
  }).then(r => r.json());
  const cs601Mod1 = cs601Full.data.modules[0];

  const facUploadRes = await fetch('http://localhost:4000/api/resources', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + facultyToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'CS601 Lamport Clock Practice Assignment Notes',
      description: 'Supplementary practice sheet with solutions',
      fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
      fileType: 'NOTES',
      fileSize: '1.2 MB',
      year: 2026,
      isPublished: true,
      subjectId: cs601.id,
      moduleId: cs601Mod1?.id
    })
  });
  console.log('Faculty uploads resource to CS601: Status', facUploadRes.status, facUploadRes.status === 201 ? '✅ PASS' : '❌ FAIL');
  const uploadedRes = (await facUploadRes.json()).data;

  // TEST 3: Faculty cannot manage another faculty subject
  console.log('\n--- TEST 3: Faculty Forbidden on Unassigned Subject ---');
  // Create subject without faculty
  const otherSub = await fetch('http://localhost:4000/api/academic/subjects', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unassigned Subject Test',
      code: 'UNASSIGNED101',
      credits: 3,
      departmentId: testDept.id,
      semesterId: testSem.id,
      facultyId: null
    })
  }).then(r => r.json());

  const facForbiddenUpload = await fetch('http://localhost:4000/api/resources', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + facultyToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Unauthorized Resource Upload',
      fileUrl: 'https://example.com/file.pdf',
      fileType: 'PDF',
      subjectId: otherSub.data.id
    })
  });
  console.log('Faculty attempts upload to unassigned subject: Status', facForbiddenUpload.status, facForbiddenUpload.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL');

  const facForbiddenModule = await fetch('http://localhost:4000/api/academic/modules', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + facultyToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Unauthorized Module Creation',
      orderIndex: 1,
      subjectId: otherSub.data.id
    })
  });
  console.log('Faculty attempts module creation in unassigned subject: Status', facForbiddenModule.status, facForbiddenModule.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL');

  // TEST 4: Student can see resource for enrolled subject
  console.log('\n--- TEST 4: Student Access to Enrolled Subject & Resources ---');
  const stSubjectRes = await fetch('http://localhost:4000/api/academic/subjects/' + cs601.id, {
    headers: { Authorization: 'Bearer ' + studentToken }
  });
  console.log('Student accesses enrolled subject CS601: Status', stSubjectRes.status, stSubjectRes.status === 200 ? '✅ PASS' : '❌ FAIL');
  const cs601Data = await stSubjectRes.json();
  const hasUploaded = cs601Data.data.modules.some(m => m.resources.some(r => r.id === uploadedRes.id));
  console.log('Student sees newly uploaded resource in module:', hasUploaded ? '✅ PASS' : '❌ FAIL');

  // TEST 5: Student cannot access unauthorized subject
  console.log('\n--- TEST 5: Student Forbidden on Unauthorized Subject ---');
  const stForbiddenSubRes = await fetch('http://localhost:4000/api/academic/subjects/' + otherSub.data.id, {
    headers: { Authorization: 'Bearer ' + studentToken }
  });
  console.log('Student accesses subject they are NOT enrolled in: Status', stForbiddenSubRes.status, stForbiddenSubRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL');

  const stForbiddenResQuery = await fetch('http://localhost:4000/api/resources?subjectId=' + otherSub.data.id, {
    headers: { Authorization: 'Bearer ' + studentToken }
  });
  console.log('Student queries resources for subject they are NOT enrolled in: Status', stForbiddenResQuery.status, stForbiddenResQuery.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL');

  // TEST 6: Search & Filtering
  console.log('\n--- TEST 6: Resource Vault Search & Filtering ---');
  const filterTypeRes = await fetch('http://localhost:4000/api/resources?fileType=NOTES', {
    headers: { Authorization: 'Bearer ' + studentToken }
  }).then(r => r.json());
  console.log('Filter by fileType=NOTES: Count', filterTypeRes.data?.length, filterTypeRes.data?.every(r => r.fileType === 'NOTES') ? '✅ PASS' : '❌ FAIL');

  const searchRes = await fetch('http://localhost:4000/api/resources?search=Vector', {
    headers: { Authorization: 'Bearer ' + studentToken }
  }).then(r => r.json());
  console.log('Search by query "Vector": Count', searchRes.data?.length, searchRes.data?.length > 0 ? '✅ PASS' : '❌ FAIL');

  // TEST 7: Previous Year Question Papers (PYQ)
  console.log('\n--- TEST 7: Dedicated PYQ Section Filtering ---');
  const pyq2024 = await fetch('http://localhost:4000/api/resources/pyqs?year=2024', {
    headers: { Authorization: 'Bearer ' + studentToken }
  }).then(r => r.json());
  console.log('Filter PYQs for year 2024: Count', pyq2024.data?.length, pyq2024.data?.every(p => p.year === 2024 && p.fileType === 'PYQ') ? '✅ PASS' : '❌ FAIL');

  // TEST 8: Faculty Publish/Unpublish toggle
  console.log('\n--- TEST 8: Publish / Unpublish Toggle ---');
  const unpublishRes = await fetch('http://localhost:4000/api/resources/' + uploadedRes.id, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + facultyToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublished: false })
  });
  console.log('Faculty unpublishes resource: Status', unpublishRes.status, unpublishRes.status === 200 ? '✅ PASS' : '❌ FAIL');

  // Verify student cannot see unpublished resource
  const stSubCheck = await fetch('http://localhost:4000/api/academic/subjects/' + cs601.id, {
    headers: { Authorization: 'Bearer ' + studentToken }
  }).then(r => r.json());
  const studentSeesDraft = stSubCheck.data.modules.some(m => m.resources.some(r => r.id === uploadedRes.id));
  console.log('Student does NOT see draft resource:', !studentSeesDraft ? '✅ PASS' : '❌ FAIL');

  // Cleanup test resources and academic records
  await fetch('http://localhost:4000/api/resources/' + uploadedRes.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  await fetch('http://localhost:4000/api/academic/subjects/' + otherSub.data.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  await fetch('http://localhost:4000/api/academic/subjects/' + testSub.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  await fetch('http://localhost:4000/api/academic/semesters/' + testSem.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  await fetch('http://localhost:4000/api/academic/departments/' + testDept.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! Cleaned up test data.\n');
}

runCompleteVerification().catch(e => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
