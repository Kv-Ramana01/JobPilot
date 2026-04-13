# JobPilot Deployment Guide

## Option A: Vercel + Railway (recommended, cheapest)

### Step 1 — Database on Railway

1. Go to [railway.app](https://railway.app) → New Project → PostgreSQL
2. Copy the `DATABASE_URL` from the Variables tab
3. In your terminal:
   ```bash
   DATABASE_URL="your-railway-url" npx prisma migrate deploy
   DATABASE_URL="your-railway-url" npx prisma db seed
   ```

### Step 2 — Set up Clerk

1. Go to [clerk.com](https://clerk.com) → Create application
2. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
3. In Clerk Dashboard → Webhooks → Add Endpoint:
   - URL: `https://yourapp.vercel.app/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the Signing Secret → set as `CLERK_WEBHOOK_SECRET`

### Step 3 — Get Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click "Get API Key" → Create API key
3. The free tier gives 15 requests/minute, 1500/day — plenty for an MVP

### Step 4 — Set up UploadThing

1. Go to [uploadthing.com](https://uploadthing.com) → Create app
2. Copy `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`

### Step 5 — Set up Resend (email)

1. Go to [resend.com](https://resend.com) → Create account
2. Add and verify your sending domain (or use the free `@resend.dev` domain)
3. Copy `RESEND_API_KEY`
4. Set `EMAIL_FROM="JobPilot <noreply@yourdomain.com>"`

### Step 6 — Optional: Upstash Redis (rate limiting)

1. Go to [upstash.com](https://upstash.com) → Create Redis database
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Without this, rate limiting falls back to in-memory (fine for single-instance)

### Step 7 — Optional: Adzuna jobs API

1. Go to [developer.adzuna.com](https://developer.adzuna.com) → Register
2. Free tier: 250 requests/month
3. Copy `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`

### Step 8 — Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# When prompted, set all environment variables from .env.example
# Or paste them in the Vercel dashboard → Settings → Environment Variables
```

### Step 9 — Set up cron jobs

In `vercel.json`, the crons are already configured:
```json
{
  "crons": [
    { "path": "/api/cron?task=sync", "schedule": "0 */2 * * *" },
    { "path": "/api/cron?task=alerts", "schedule": "0 8 * * *" }
  ]
}
```

These require Vercel Pro ($20/month). For free tier, set up an external cron:

**Option: GitHub Actions cron**
```yaml
# .github/workflows/cron.yml
name: Job sync
on:
  schedule:
    - cron: '0 */2 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://yourapp.vercel.app/api/cron?task=sync
```

---

## Option B: Self-hosted with Docker

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/jobpilot
      - NODE_ENV=production
    env_file:
      - .env.local
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: jobpilot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Environment checklist

Before going live, verify all these are set:

- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key
- [ ] `CLERK_SECRET_KEY` — Clerk secret key
- [ ] `CLERK_WEBHOOK_SECRET` — for user sync webhook
- [ ] `GEMINI_API_KEY` — Google AI Studio key
- [ ] `UPLOADTHING_SECRET` — for resume uploads
- [ ] `UPLOADTHING_APP_ID`
- [ ] `RESEND_API_KEY` — for email alerts
- [ ] `EMAIL_FROM` — sender email address
- [ ] `NEXT_PUBLIC_APP_URL` — your production URL (no trailing slash)
- [ ] `CRON_SECRET` — random secret to protect cron endpoint

Optional but recommended:
- [ ] `UPSTASH_REDIS_REST_URL` — rate limiting
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `ADZUNA_APP_ID` — additional job source
- [ ] `ADZUNA_APP_KEY`

---

## Post-deployment checklist

1. **Test auth flow**: Sign up → onboarding → dashboard
2. **Test job sync**: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron?task=sync`
3. **Test AI features**: Go to Resume AI → paste text → analyze
4. **Test alerts**: Create an alert → trigger cron → check email
5. **Test file upload**: Profile → upload a resume PDF
6. **Verify webhook**: Check Clerk dashboard → Webhooks → Recent deliveries

---

## Scaling considerations

| Traffic level | Recommended setup |
|---|---|
| 0–1k users | Vercel Hobby + Railway Starter ($5/mo total) |
| 1k–10k users | Vercel Pro + Railway Developer ($25/mo) |
| 10k+ users | Add Redis caching, CDN for images, read replicas |

### Performance tips

- Job listing page is cached via `next: { revalidate: 300 }` on fetch calls
- Use `React.Suspense` on heavy components (already done on jobs page)
- Enable Prisma connection pooling with `?pgbouncer=true` in DATABASE_URL for Railway
- Add `ANALYZE` to slow Prisma queries and add DB indexes as needed
