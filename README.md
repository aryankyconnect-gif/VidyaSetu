# VidyaSetu LMS

> *"Your Campus, Your Learning, One Platform"*

VidyaSetu is a centralized Learning Management System (LMS) designed for colleges and universities. It provides a cohesive, role-based digital campus environment tailored for **Students**, **Faculty**, **Class Representatives (CRs)**, and **Administrators**.

---

## 🚀 Live Services

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API Server:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Database:** PostgreSQL on `localhost:5433` (database: `vidyasetu`)

---

## 🔑 Demo Credentials

All roles are pre-seeded with rich academic data across multiple departments (CSE, ECE, IT), semesters (Sem 1 to Sem 8), active modules, lecture notes, PYQs, assignments with similarity indicators, quizzes, announcements, notifications, and peer doubt discussions.

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Dr. Arvind Sharma | `admin@vidyasetu.edu` | `admin123` | System oversight, User activation/deactivation, Academic structure (Depts, Sems, Subjects, Modules), System Analytics |
| **Faculty** | Prof. Rajesh Verma | `faculty@vidyasetu.edu` | `faculty123` | Subject syllabus, Resource uploads, Create assignments, Review submissions with Similarity Detection, Grade students, AI & Manual Quizzes |
| **Class Rep (CR)** | Aman Gupta | `cr@vidyasetu.edu` | `cr123` | Student view + Campus notices, Resource uploads, Section alerts, Peer roster |
| **Student** | Priya Sharma | `student@vidyasetu.edu` | `student123` | Enrolled subjects, Modules, PDF Notes preview, PYQ archives, Assignment submission, Timed quizzes, AI Study Assistant, Doubt Hub |

> **Tip:** You can click the quick-login demo cards directly on the [VidyaSetu Landing Page](http://localhost:5173).

---

## 💻 Exact Startup Commands

### 1. Start PostgreSQL (Port 5433)
If PostgreSQL is not already running on port `5433`, launch it with the included data directory:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\postgres.exe" -D "c:\Users\Raushan\Desktop\VidyaSetu\pgdata"
```

### 2. Database Sync & Seed
```powershell
cd c:\Users\Raushan\Desktop\VidyaSetu\backend
npx prisma db push
npm run seed
```

### 3. Start Backend API Server (Port 4000)
```powershell
cd c:\Users\Raushan\Desktop\VidyaSetu\backend
npm run build
npm run dev
# Or for production:
node dist/index.js
```
*Health Check:* `http://localhost:4000/api/health`

### 4. Start Frontend Client (Port 5173)
```powershell
cd c:\Users\Raushan\Desktop\VidyaSetu\frontend
npm run build     # Clean build with zero TypeScript / bundler errors
npm run dev       # Starts Vite dev server on http://localhost:5173
```

### 5. Automated Verification Suite
To run the automated verification suite covering all 23 features, security checks, and demo flows:
```powershell
cd c:\Users\Raushan\Desktop\VidyaSetu\backend
node test-full-audit.js
```

---

## 🎯 Final Hackathon Demo Walkthrough

### 👨‍🎓 Student Demo Flow
1. **Login:** Login with `student@vidyasetu.edu` / `student123` (or click Student Demo card on Landing Page).
2. **Dashboard:** View enrolled subjects (Distributed Systems, Compiler Design, Cloud, ML), registered credits (44), pending assignments, upcoming quizzes, and recent grades.
3. **Open Subject:** Click **Distributed Systems (CS601)** &rarr; View course header with instructor Prof. Rajesh Verma.
4. **Read Notes:** On the **Curriculum & Modules** tab, expand *Module 1: Foundations of Distributed Computing* &rarr; Click **Preview PDF** on *"Unit 1: Foundations of Distributed Systems"* to view the notes inline in the PDF preview modal with zoom & fullscreen controls.
5. **Open PYQ:** Switch to the **Previous Year Papers (PYQ)** tab &rarr; Filter by year (2024, 2023, 2022) &rarr; Click **Preview PDF** to read the university end-semester question paper.
6. **See Assignment:** Switch to the **Course Assignments** tab (or navigate to **Assignments** in the sidebar) &rarr; See *Assignment 2: Vector Clocks Causality Tracker* with due date and max marks.
7. **Submit Assignment:** Click **Submit Work** &rarr; Enter solution notes/code and repository link &rarr; Submit. The system calculates token-level similarity analysis in real time.
8. **Attempt Quiz:** Switch to **Quizzes** &rarr; Start the timed quiz &rarr; Answer multiple-choice questions &rarr; Submit to receive instant scoring and percentage badge.
9. **Use AI Study Assistant:** Click **AI Learning Suite** in the sidebar &rarr; Ask questions about course concepts (e.g., *"Explain Lamport vs Vector clocks"*) &rarr; Receive grounded academic explanations. Try the **Lecture Summarizer** to generate key concepts, important exam points, and practice questions.
10. **Receive Notifications:** Check the notification bell in the top header &rarr; Notice unread alerts for new assignments, quizzes, and grading feedback.

### 👩‍🏫 Faculty Demo Flow
1. **Login:** Login with `faculty@vidyasetu.edu` / `faculty123`.
2. **Dashboard:** View assigned subjects, pending grading queue, recent student submissions, and announcements.
3. **Open Subject:** Go to **Subjects** &rarr; Open **Distributed Systems (CS601)**.
4. **Upload Resource:** Click **Upload Resource** &rarr; Select category (Notes, Slides, PYQ, Video, Reference), associate with a module, and publish immediately.
5. **Create Assignment:** Click **Create Assignment** &rarr; Set title, description, deadline, and total marks &rarr; Publish.
6. **Review Submissions & Similarity Indicator:** Navigate to **Assignments** &rarr; Click **Review Submissions** on *Assignment 1* or *Assignment 2* &rarr; Inspect student submissions with color-coded **Similarity Indicators**:
   - 🟢 `11.4% Original (Low)` - Authentic student work.
   - 🟡 `25-50% Moderate` - Common references / template overlap.
   - 🔴 `>50% High (Flagged)` - Plagiarism warning with matching source breakdown.
7. **Grade Student:** Enter marks awarded and qualitative feedback &rarr; Click **Save Grade**. The student's status updates to `Graded` and a notification is dispatched.
8. **Create Quiz / AI Quiz Generator:** Navigate to **Quizzes** &rarr; Click **AI Quiz Generator** &rarr; Input topic (e.g. *"Vector Clocks and Causality"*), choose difficulty (*Medium*), select question count &rarr; Click **Generate Quiz Questions**.
9. **Review AI Questions:** Review generated MCQs with options, correct answer, and explanation from the AI Question Bank / Gemini &rarr; Click **Save as Live Quiz** to publish immediately to enrolled students.

### 👨‍💼 Super Admin Demo Flow
1. **Login:** Login with `admin@vidyasetu.edu` / `admin123`.
2. **Dashboard:** View university-wide metrics (total users, departments, subjects, resources, enrollments, real-time audit logs).
3. **Manage Users:** Navigate to **User Directory** (`/app/users`) &rarr; Filter by role (Faculty, Student, CR, Admin) or search by roll number/name &rarr; Toggle user status (Active/Suspended) &rarr; Reset passwords.
4. **Manage Academic Structure:** Navigate to **Academic Structure** (`/app/academic`) &rarr; Create or edit Departments (CSE, ECE, IT), Semesters (1 to 8), Subjects, and Modules.
5. **View System Analytics:** Navigate to **Academic Analytics** (`/app/analytics`) &rarr; Review department enrollment distribution, academic performance, and resource usage.

---

## ✅ Audited Features Status

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | **Authentication** | ✅ Fully Functional | JWT access + refresh tokens, bcrypt hashing, cookie & header auth |
| 2 | **Role-Based Authorization** | ✅ Fully Functional | Strict RBAC guards on backend routes and frontend route wrappers |
| 3 | **Student Dashboard** | ✅ Fully Functional | Enrolled subjects, credits, pending assignments, grades, notices |
| 4 | **Faculty Dashboard** | ✅ Fully Functional | Assigned subjects, grading queue, recent submissions |
| 5 | **CR Dashboard** | ✅ Fully Functional | Section peers, batch roster, section notices |
| 6 | **Admin Dashboard** | ✅ Fully Functional | System-wide statistics, live audit logs, department breakdown |
| 7 | **Academic Hierarchy** | ✅ Fully Functional | Dept &rarr; Sem &rarr; Section &rarr; Subject &rarr; Module &rarr; Resource |
| 8 | **Resource Vault** | ✅ Fully Functional | Multi-filter (Dept, Sem, Subject, Module, Type, Year), search, grid/list |
| 9 | **PYQ Section** | ✅ Fully Functional | Dedicated PYQ archives with year filtering, download, and PDF preview |
| 10 | **Assignment Creation** | ✅ Fully Functional | Faculty can create coursework with due dates, marks, and rubrics |
| 11 | **Assignment Submission** | ✅ Fully Functional | Text response + repository URL submission |
| 12 | **Deadline Locking** | ✅ Fully Functional | Strict backend and UI lock preventing submissions after due date |
| 13 | **PDF Preview** | ✅ Fully Functional | In-app modal viewer with zoom, fullscreen, and fallback options |
| 14 | **Grading** | ✅ Fully Functional | Marks entry + qualitative feedback with instant notification to student |
| 15 | **Similarity Detection** | ✅ Fully Functional | Real-time token Jaccard similarity indicator (Original, Moderate, Flagged) |
| 16 | **Quiz System** | ✅ Fully Functional | Timed MCQ attempts with question navigation and instant scoring |
| 17 | **AI Quiz Generation** | ✅ Fully Functional | Gemini-powered + PostgreSQL question bank with faculty preview |
| 18 | **AI Study Assistant** | ✅ Fully Functional | Conversational course tutor + 3-part study material summarizer |
| 19 | **Notifications** | ✅ Fully Functional | Real-time bell popover with unread badge counter and mark-as-read |
| 20 | **Announcements** | ✅ Fully Functional | Campus & section notices with priority tags (Normal, High, Urgent) |
| 21 | **Analytics** | ✅ Fully Functional | Academic performance, department breakdown, course enrollments |
| 22 | **Search** | ✅ Fully Functional | Header global search and Resource Vault deep search |
| 23 | **Responsive Design** | ✅ Fully Functional | Mobile sidebar drawer, responsive grids, zero horizontal overflow |
