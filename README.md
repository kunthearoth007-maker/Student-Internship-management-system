# Students Internship Management System (SIMS)

Full-stack internship management platform for the **Royal University of Phnom Penh (RUPP)**, connecting students, companies, supervisors, and administrators through the complete internship lifecycle.

## Features

- **Roles**: Admin, Student, Company, Supervisor (Laravel Sanctum token auth + role middleware)
- **Student**: profile with CV/skills upload, browse/search/filter internships, apply & track applications, submit weekly/monthly/final reports, view evaluations
- **Company**: company profile, create/publish internships (admin-moderated), review applicants, accept/reject, evaluate interns
- **Supervisor**: monitor assigned students, review reports, approve or request revisions, leave feedback, evaluate students
- **Admin**: dashboards with charts (Recharts), user management, internship moderation, application monitoring, student-company-internship-supervisor assignments
- **Workflow**: find → apply → review → accept → assign → report → feedback → evaluate → final result

## Technology

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Axios, Zustand |
| Backend | Laravel 13 (API), Sanctum, Eloquent ORM |
| Database | MySQL 8 (SQLite also supported for quick local dev) |
| Files | Laravel Storage (CVs, logos, report files) |

## System Architecture

```
students-internship-management/
├── backend/    Laravel API  (http://localhost:8000/api)
├── frontend/   Next.js app  (http://localhost:3000)
└── README.md
```

Next.js authenticates against the Laravel API with a Sanctum bearer token kept in a cookie; `middleware.ts` guards routes and redirects by role, and every API route is protected again server-side (`auth:sanctum` + `role:*`).

## ERD

```
users (1) ── (1) students / companies / supervisors
company (1) ── (N) internships
student (1) ── (N) applications (N) ── (1) internship   [unique student+internship]
internship_assignments: student + company + internship + supervisor
assignment (1) ── (N) reports (1) ── (N) report_feedback
assignment (1) ── (N) evaluations (company | supervisor, 1-5 scores, overall = avg)
```

## Installation

### Prerequisites
PHP 8.3+, Composer, Node 20+, MySQL 8

### Backend

```bash
cd backend
composer install
cp .env.example .env            # set DB_CONNECTION=mysql, DB_DATABASE=sims, DB_USERNAME, DB_PASSWORD
php artisan key:generate
php artisan install:api
php artisan migrate --seed
php artisan storage:link
php artisan serve               # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev                        # http://localhost:3000
```

### Seeded demo accounts (password: `password`)

| Role | Email |
|---|---|
| Admin | admin@rupp.edu.kh |
| Student | student@rupp.edu.kh |
| Company | abc@tech.kh |
| Supervisor | lim@rupp.edu.kh |

## API Documentation

All endpoints under `/api`, responses use `{ success, message, data, meta? }`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/password` |
| Internships | `GET /internships?search=&category=&location=&page`, `GET /internships/{id}` |
| Student | `GET /student/dashboard`, `PUT /student/profile`, `GET/POST /student/applications`, `PUT /student/applications/{id}/cancel`, `GET/POST /student/reports`, `PUT /student/reports/{id}`, `GET /student/assignments` |
| Company | `GET /company/dashboard`, `PUT /company/profile`, `GET/POST/PUT/DELETE /company/internships[/{id}]`, `PUT /company/internships/{id}/publish|unpublish`, `GET /company/applications`, `PUT /company/applications/{id}/review|accept|reject`, `POST /company/evaluations` |
| Supervisor | `GET /supervisor/dashboard`, `PUT /supervisor/profile`, `GET /supervisor/students`, `GET /supervisor/reports[/{id}]`, `POST /supervisor/reports/{id}/feedback`, `PUT /supervisor/reports/{id}/approve|revision`, `POST /supervisor/evaluations` |
| Admin | `GET /admin/dashboard`, `GET /admin/students|companies|supervisors`, `POST/PUT/DELETE /admin/users[/{id}]`, `GET /admin/internships`, `PUT /admin/internships/{id}/approve|reject|publish|unpublish`, `GET /admin/applications`, `GET /admin/reports`, `GET/POST /admin/assignments`, `GET/PUT /admin/assignments/{id}` |

## Team Members

- [Your name] — full-stack implementation
