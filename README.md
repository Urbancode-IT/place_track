# PlaceTrack – Placement Tracking System

**Kattraan Technologies** – Production-level placement tracking with students, interviews, trainers, and realtime updates.

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, React Query, Zustand
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (pgAdmin), **pg** (node-postgres)
- **Auth:** JWT (Access + Refresh), bcrypt
- **Realtime:** Socket.io
- **Notifications:** Nodemailer (Email), Twilio (SMS)
- **Uploads:** Multer, Cloudinary
- **Validation:** Zod (backend), React Hook Form + Zod (frontend)
- **Testing:** Jest + Supertest (backend), Vitest (frontend)

## Quick Start (no Docker)

Use your existing **PostgreSQL** (e.g. pgAdmin). No Docker required.

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (e.g. via pgAdmin), with database **Placement_Tracking** created

### 1. Backend

1. In **pgAdmin**, create database **Placement_Tracking** (if needed). Then open Query Tool and run the schema:
   - Open `backend/scripts/schema.sql` and execute it on `Placement_Tracking`.
2. In the backend folder:

```bash
cd placetrack/backend
copy .env.example .env
# Set DATABASE_URL in .env (e.g. postgresql://postgres:admin%40123@localhost:5432/Placement_Tracking)
npm install
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:5000**.

### 2. Frontend

```bash
cd placetrack/frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

### 3. Login (after seed)

- **Admin:** admin@kattraan.com / admin123  
- **Trainer:** trainer1@kattraan.com / trainer123  

## API Overview

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh-token`, `GET /api/auth/me`
- **Students:** CRUD at `/api/students`, `GET /api/students/:id/interviews`, `GET /api/students/:id/qa`, `PUT /api/students/:id/self-intro`, `POST /api/students/:id/resume`
- **Interviews:** CRUD at `/api/interviews`, `PATCH /api/interviews/:id/status`, `POST /api/interviews/:id/trainers`
- **Trainers:** `GET /api/trainers`, `GET /api/trainers/:id/interviews`, `POST /api/trainers/:id/notify`
- **QA:** `GET/POST /api/students/:id/qa`, `PUT/DELETE /api/qa/:id`
- **Notifications:** `GET /api/notifications`, `PATCH /api/notifications/read-all`, `GET/PUT /api/notifications/settings`
- **Dashboard:** `GET /api/dashboard/stats`, `GET /api/dashboard/today`, `GET /api/dashboard/activity`, `GET /api/dashboard/analytics`
- **Upload:** `POST /api/upload/resume`, `POST /api/upload/photo`
- **Export:** `GET /api/export/schedule/csv`, `GET /api/export/students/csv` (query params: course, status, dateFrom, dateTo for schedule; course, status for students)

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for required variables (DB, JWT, Cloudinary, SMTP, Twilio, CORS, etc.).

## Tests

**Backend:**

```bash
cd backend
npm test
```

**Frontend:**

```bash
cd frontend
npm test
```

## License

Proprietary – Kattraan Technologies.
