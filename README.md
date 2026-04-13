# JobPilot ⚡

**Smart AI-powered job search platform for freshers, interns, and entry-level developers.**

JobPilot aggregates software jobs globally, optimizes resumes with Gemini AI, auto-fills applications with Playwright, and tracks every application in a beautiful kanban board.

---

## Features

| Feature | Description |
|---|---|
| 🌍 Global job feed | Greenhouse, Lever, Remotive, Adzuna — 50k+ jobs |
| 🤖 AI resume optimizer | Gemini scores ATS match, rewrites bullets, fills keyword gaps |
| ✉️ AI cover letter | 5 tones, personalized to your profile + the JD |
| 🎤 Interview prep | 8 role-specific questions with STAR answers |
| ⚡ Auto-apply | Playwright autofills Greenhouse/Lever/Workable forms |
| 📊 Application tracker | Kanban board: Applied → OA → Interview → Offer |
| 🔔 Job alerts | Email + in-app, instant/daily/weekly frequency |
| 🔖 Saved jobs | Collections: Dream, Remote, Internships, Apply later |
| 🌙 Dark mode | Full light/dark theme with system detection |

---

## Tech Stack

```
Frontend:   Next.js 15 (App Router) · React · TypeScript · Tailwind CSS
UI:         ShadCN primitives · Framer Motion · Recharts · Lucide icons
Auth:       Clerk (webhook sync to PostgreSQL)
Database:   PostgreSQL · Prisma ORM
AI:         Google Gemini 1.5 Flash (free tier)
Automation: Playwright (server-side auto-apply)
Email:      Resend
Files:      UploadThing
State:      Zustand (client) · React Server Components (server)
Validation: Zod
Deployment: Vercel (frontend + crons) · Railway (PostgreSQL)
```

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourname/jobpilot.git
cd jobpilot
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in every variable in `.env.local` — see the [Environment Variables](#environment-variables) section below.

### 3. Set up the database

```bash
# Push schema to your PostgreSQL instance
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed with 50 sample jobs for local dev
npm run db:seed
```

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Railway / Supabase / local Postgres |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [clerk.com](https://clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → add endpoint `/api/webhooks/clerk` |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `UPLOADTHING_SECRET` | [uploadthing.com](https://uploadthing.com) |
| `UPLOADTHING_APP_ID` | UploadThing dashboard |
| `RESEND_API_KEY` | [resend.com](https://resend.com) |
| `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | [adzuna.com/api](https://developer.adzuna.com) (free) |
| `UPSTASH_REDIS_REST_URL` + token | [upstash.com](https://upstash.com) (free tier) |
| `CRON_SECRET` | Any random string — used to protect `/api/cron` |

---

## Project Structure

```
jobpilot/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/                  # Main dashboard
│   ├── jobs/                       # Job listing + detail
│   │   └── [id]/                   # Individual job page
│   ├── applications/               # Kanban tracker
│   ├── resume-ai/                  # AI resume + cover letter
│   ├── saved/                      # Saved jobs
│   ├── alerts/                     # Job alerts
│   ├── profile/                    # User profile
│   ├── settings/                   # App settings
│   └── api/
│       ├── jobs/                   # Job CRUD + sync
│       ├── applications/           # Application CRUD
│       ├── saved-jobs/             # Bookmarks
│       ├── ai/                     # Gemini endpoints
│       ├── alerts/                 # Alert CRUD
│       ├── users/profile/          # Profile API
│       ├── cron/                   # Scheduled tasks
│       └── webhooks/clerk/         # Clerk user sync
│
├── components/
│   ├── ui/                         # Button, Input, Select, etc.
│   ├── layout/                     # Sidebar, TopBar, ThemeProvider
│   ├── jobs/                       # JobCard, JobDetailPanel, Filters
│   ├── dashboard/                  # Stats, Chart, Activity, QuickActions
│   └── resume/                     # (extend for upload UI)
│
├── services/
│   ├── gemini.ts                   # Gemini AI integration
│   ├── job-aggregator.ts           # Multi-source job fetcher
│   ├── playwright-apply.ts         # Auto-fill engine
│   └── email.ts                    # Resend email templates
│
├── lib/
│   ├── db.ts                       # Prisma singleton
│   ├── utils.ts                    # Formatting helpers
│   └── store.ts                    # Zustand global state
│
├── hooks/
│   └── use-toast.ts                # Toast notification hook
│
├── types/
│   └── index.ts                    # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma               # Full database schema
│   └── seed.ts                     # 50 seed jobs
│
├── middleware.ts                   # Clerk auth middleware
├── .env.example                    # Environment variable template
└── vercel.json                     # Cron schedule config
```

---

## Database Schema

```
User ─── Profile
     ├── Resume[]
     ├── SavedJob[] ──► Job
     ├── Application[] ──► Job
     ├── Alert[]
     ├── Notification[]
     └── AiHistory[]
```

Key design choices:
- `Job` has a unique `(externalId, source)` composite key for safe upserts
- `Application` has a unique `(userId, jobId)` key — one application per user per job
- `AiHistory` stores every Gemini call result as JSON for caching/display
- All delete operations cascade via Prisma `onDelete: Cascade`

---

## API Reference

### Jobs
| Method | Route | Description |
|---|---|---|
| GET | `/api/jobs` | Search jobs with filters + pagination |
| POST | `/api/jobs` | Sync jobs from all sources (admin/cron) |

**GET /api/jobs query params:**
`search`, `jobType`, `workType`, `experienceLevel`, `countries`, `remote`, `visaSponsorship`, `minSalary`, `maxSalary`, `postedWithin`, `sortBy`, `page`, `pageSize`

### Applications
| Method | Route | Description |
|---|---|---|
| GET | `/api/applications` | Get user's applications |
| POST | `/api/applications` | Track a new application |
| PATCH | `/api/applications/[id]` | Update status, notes, dates |
| DELETE | `/api/applications/[id]` | Remove application |

### AI
| Method | Route | Body `task` | Description |
|---|---|---|---|
| POST | `/api/ai` | `RESUME_SCORE` | Analyze resume vs JD |
| POST | `/api/ai` | `COVER_LETTER` | Generate cover letter |
| POST | `/api/ai` | `INTERVIEW_PREP` | Generate interview questions |
| POST | `/api/ai` | `SKILLS_GAP` | Analyze skills gap |

---

## Deployment

### Deploy to Vercel + Railway

#### 1. PostgreSQL on Railway
```bash
# Create a new Railway project and add a PostgreSQL service
# Copy the DATABASE_URL from Railway
```

#### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel
# Follow prompts — add all env vars from .env.example
```

#### 3. Set up Clerk webhooks
In Clerk dashboard → Webhooks → Add endpoint:
- URL: `https://yourapp.vercel.app/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy the Signing Secret → set as `CLERK_WEBHOOK_SECRET`

#### 4. Run migrations on Railway
```bash
DATABASE_URL=<railway-url> npx prisma migrate deploy
DATABASE_URL=<railway-url> npx prisma db seed
```

#### 5. Cron jobs
Vercel Pro automatically runs crons from `vercel.json`.
For free tier, use Railway's built-in cron or set up an external cron service to hit:
```
POST https://yourapp.vercel.app/api/cron?task=sync
Authorization: Bearer <CRON_SECRET>
```

---

## Extending JobPilot

### Add a new job source
1. Add a new case to `JobSource` enum in `prisma/schema.prisma`
2. Write a fetch function in `services/job-aggregator.ts` returning `RawJobListing[]`
3. Add the function to `aggregateJobs()` in the same file

### Add a new AI task
1. Add the task type to `AiTaskType` enum in schema
2. Write a function in `services/gemini.ts`
3. Add a case to the `switch` in `app/api/ai/route.ts`
4. Build the UI in `app/resume-ai/page.tsx`

### Add Playwright for a new site
1. Add the domain to the `detectPlatform` function in `services/playwright-apply.ts`
2. Write a `fill{SiteName}Form` function following the Greenhouse/Lever pattern

---

## Roadmap

- [ ] Chrome extension for one-click apply on any site
- [ ] Resume PDF parsing (extract text automatically)
- [ ] Referral finder (LinkedIn scraper for mutual connections)
- [ ] Salary insights by role + location
- [ ] Company reviews integration
- [ ] Mobile app (React Native)
- [ ] Browser autofill extension

---

## License

MIT — build on it, ship it, get that job. ⚡
