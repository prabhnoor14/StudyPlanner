# AI Study Plan Generator

Full-stack Next.js + Prisma + OpenAI (stub) application that lets students register, add courses and upcoming exams/assignments, and generates a personalized study schedule with day-by-day tasks and topic summaries.

## Stack
- Next.js (App Router) + React + TypeScript
- TailwindCSS for styling
- PostgreSQL via Prisma ORM
- OpenAI API integration (JSON responses)
- JWT auth (httpOnly cookie) + bcrypt for password hashing

## Features
- User registration & login
- Add courses (name, instructor, meeting days)
- Add tasks (exam / assignment) with due dates
- AI-generated (stub) study plan: daily breakdown + summaries
- Dashboard: today/week tasks, progress bars, upcoming deadlines
- Mark tasks complete, instant progress update
- Regenerate plan from Settings

## Getting Started

### 1. Install dependencies
```powershell
npm install
```

### 2. Configure environment
Create `.env` from `.env.example` and set values.

### 3. Setup database
Ensure PostgreSQL is running and accessible.
```powershell
npx prisma migrate dev --name init
```

### 4. Run dev server
```powershell
npm run dev
```

### 5. Open
Visit http://localhost:3000

## Environment Variables (.env.example)
See `.env.example` for required values.

## OpenAI Integration
Currently stubbed for local development. Replace stub with real API call after setting `OPENAI_API_KEY`.

## Scripts
- `dev` - Start Next.js dev server
- `build` - Production build
- `start` - Start production server
- `prisma:migrate` - Run migrations
- `prisma:generate` - Regenerate Prisma client

## Deployment
Deploy on AWS/Azure container or serverless (e.g., Vercel + RDS/Aurora). Set environment variables in platform secrets manager.

## License
Internal use only (no license header added by default).
