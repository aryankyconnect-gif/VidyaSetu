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

All roles are pre-seeded with rich academic data (Departments, Semesters, Sections, Subjects, Modules, Resources, Assignments, Quizzes, Announcements, and Attendance/Audit logs).

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Dr. Arvind Sharma | `admin@vidyasetu.edu` | `admin123` | System oversight, User activation/deactivation, Academic structure, Audit logs |
| **Faculty** | Prof. Rajesh Verma | `faculty@vidyasetu.edu` | `faculty123` | Subject syllabus, Resource upload, Create/grade assignments, Quizzes |
| **Class Rep (CR)** | Aman Gupta | `cr@vidyasetu.edu` | `cr123` | Student view + Campus notices, Resource uploads, Section alerts |
| **Student** | Priya Sharma | `student@vidyasetu.edu` | `student123` | Enrolled subjects, Resources, Submit assignments, Attempt timed quizzes, Scores |

> **Tip:** You can also click the quick-login demo cards directly on the [VidyaSetu Landing Page](http://localhost:5173).

---

## 🛠️ Architecture & Tech Stack

```
VidyaSetu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # 20 relational models (PostgreSQL)
│   │   └── seed.ts             # Comprehensive academic seed script
│   ├── src/
│   │   ├── config/             # App & environment configuration
│   │   ├── controllers/        # Auth, Academic, Assignment, Quiz, Resource, etc.
│   │   ├── middleware/         # Auth, RBAC guards, Validation, Error handler
│   │   ├── routes/             # REST endpoints (/api/*)
│   │   ├── services/           # Audit logging, AI integration
│   │   └── utils/              # JWT, Logger, Prisma singleton
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Layouts, Sidebar, Header, Breadcrumbs, Badges
│   │   ├── hooks/              # useAuth context with automatic profile hydrate
│   │   ├── layouts/            # AuthenticatedLayout with dynamic sidebar
│   │   ├── pages/
│   │   │   ├── app/            # Dashboard, Subjects, Detail, Assignments, Quizzes, Notice Board, Resources, Users, Profile
│   │   │   └── public/         # Landing, Login, Forgot Password, Reset Password, 404, 403
│   │   ├── services/           # Axios client with JWT interceptors
│   │   └── types/              # Full TypeScript contracts matching backend models
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
```

### Key Technical Highlights
- **Backend:** Express + TypeScript, Prisma ORM with PostgreSQL.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, TanStack Query.
- **Security:** Argon2/bcrypt password hashing, stateless JWT with Bearer tokens, RBAC route guards preventing privilege escalation.
- **Clean Academic Flow:** Modules → Course Materials → Assignments & Submissions → Grading → Timed MCQs with instant scoring.

---

## 💻 Manual Setup & Run Instructions

### 1. Database
Ensure PostgreSQL is running on port `5433` (or update `DATABASE_URL` in `backend/.env`).
```bash
# In backend/
npx prisma db push
npm run seed
```

### 2. Backend Server
```bash
cd backend
npm install
npm run build
node dist/index.js
# API running at http://localhost:4000
```

### 3. Frontend Client
```bash
cd frontend
npm install
npm run build     # Verify zero TypeScript / bundling errors
npm run dev       # Start Vite dev server on http://localhost:5173
```
