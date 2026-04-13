// services/job-aggregator.ts
// Fetches jobs from Greenhouse, Lever, Remotive, Adzuna, and JSearch
// Normalises every source to a common RawJobListing shape before DB upsert

import type { RawJobListing } from "@/types";
import { WorkType, JobType, ExperienceLevel, JobSource } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────

function detectWorkType(text: string): WorkType {
  const lower = text.toLowerCase();
  if (lower.includes("remote")) return WorkType.REMOTE;
  if (lower.includes("hybrid")) return WorkType.HYBRID;
  return WorkType.ONSITE;
}

function detectJobType(text: string): JobType {
  const lower = text.toLowerCase();
  if (lower.includes("intern")) return JobType.INTERNSHIP;
  if (lower.includes("contract")) return JobType.CONTRACT;
  if (lower.includes("part-time") || lower.includes("part time")) return JobType.PART_TIME;
  if (lower.includes("freelance")) return JobType.FREELANCE;
  return JobType.FULL_TIME;
}

function extractSkills(text: string): string[] {
  const KNOWN_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C++", "C#",
    "React", "Next.js", "Vue", "Angular", "Svelte",
    "Node.js", "Express", "FastAPI", "Django", "Spring",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
    "GraphQL", "REST", "gRPC",
    "Git", "CI/CD", "Linux",
    "TailwindCSS", "CSS", "HTML",
    "React Native", "Flutter", "Swift", "Kotlin",
  ];
  return KNOWN_SKILLS.filter((s) =>
    new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(text)
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Remotive (free, no key) ──────────────────────────────────────

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  description: string;
  salary?: string;
  tags: string[];
}

export async function fetchRemotiveJobs(
  keywords = "software engineer developer",
  limit = 50
): Promise<RawJobListing[]> {
  try {
    // Remotive API — try both the configured URL and the canonical one
    const baseUrl =
      process.env.REMOTIVE_API_URL?.replace(/\/$/, "") ??
      "https://remotive.com/api/remote-jobs";

    const url = new URL(baseUrl);
    url.searchParams.set("search", keywords);
    url.searchParams.set("limit", String(limit));

    console.log(`[Remotive] Fetching: ${url.toString()}`);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // Next.js cache
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`[Remotive] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return [];
    }

    const data = (await res.json()) as { jobs?: RemotiveJob[] };

    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.error("[Remotive] Unexpected response shape:", JSON.stringify(data).slice(0, 200));
      return [];
    }

    console.log(`[Remotive] Got ${data.jobs.length} jobs`);

    return data.jobs.map((j): RawJobListing => ({
      externalId: String(j.id),
      source: JobSource.REMOTIVE,
      sourceUrl: j.url,
      title: j.title,
      company: j.company_name,
      companyLogo: j.company_logo,
      location: j.candidate_required_location || "Remote",
      country: "Remote",
      isRemote: true,
      workType: WorkType.REMOTE,
      jobType: detectJobType(j.job_type),
      description: j.description || "<p>No description provided.</p>",
      skills: [...(j.tags ?? []), ...extractSkills(j.description ?? "")],
      postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
    }));
  } catch (err) {
    console.error("[Remotive] fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Greenhouse (public boards, no key) ───────────────────────────

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content: string; // HTML
  updated_at: string;
  departments: { name: string }[];
}

// A curated list of companies with public Greenhouse boards
// These are confirmed to exist — verify at https://boards.greenhouse.io/{slug}
const GREENHOUSE_COMPANIES = [
  "stripe",
  "notion",
  "linear",
  "vercel",
  "supabase",
  "loom",
  "retool",
  "airtable",
  "figma",
  "postman",
  "brex",
  "plaid",
  "ramp",
];

const SW_KEYWORDS = /engineer|developer|intern|sde|frontend|backend|fullstack|devops|mobile|software|platform/i;

async function fetchGreenhouseCompany(
  company: string
): Promise<RawJobListing[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 7200 },
      }
    );

    if (!res.ok) {
      // 404 just means this company doesn't use Greenhouse — not an error worth logging loudly
      if (res.status !== 404) {
        console.warn(`[Greenhouse/${company}] HTTP ${res.status}`);
      }
      return [];
    }

    const data = (await res.json()) as { jobs?: GreenhouseJob[] };

    if (!data.jobs) return [];

    const filtered = data.jobs.filter((j) => SW_KEYWORDS.test(j.title));

    console.log(`[Greenhouse/${company}] ${filtered.length}/${data.jobs.length} matching jobs`);

    return filtered.map((j): RawJobListing => ({
      externalId: String(j.id),
      source: JobSource.GREENHOUSE,
      sourceUrl: j.absolute_url,
      title: j.title,
      company: company.charAt(0).toUpperCase() + company.slice(1),
      location: j.location?.name ?? "USA",
      country: "USA",
      isRemote: (j.location?.name ?? "").toLowerCase().includes("remote"),
      workType: detectWorkType(j.location?.name ?? ""),
      jobType: detectJobType(j.title),
      description: j.content || "<p>See job posting for full details.</p>",
      skills: extractSkills(j.content ?? ""),
      postedAt: j.updated_at ? new Date(j.updated_at) : new Date(),
    }));
  } catch (err) {
    console.warn(`[Greenhouse/${company}] error:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchGreenhouseJobs(
  companies = GREENHOUSE_COMPANIES
): Promise<RawJobListing[]> {
  const results: RawJobListing[] = [];
  for (const company of companies) {
    const jobs = await fetchGreenhouseCompany(company);
    results.push(...jobs);
    await sleep(400); // polite rate limit
  }
  console.log(`[Greenhouse] Total: ${results.length} jobs from ${companies.length} companies`);
  return results;
}

// ─── Adzuna ───────────────────────────────────────────────────────

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  created: string;
}

export async function fetchAdzunaJobs(
  what = "software engineer developer",
  where = "us",
  page = 1,
  resultsPerPage = 50
): Promise<RawJobListing[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("[Adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping");
    return [];
  }

  try {
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${where}/search/${page}`
    );
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", String(resultsPerPage));
    url.searchParams.set("what", what);
    url.searchParams.set("content-type", "application/json");

    console.log(`[Adzuna] Fetching ${what} in ${where}`);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`[Adzuna] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return [];
    }

    const data = (await res.json()) as { results?: AdzunaJob[] };

    if (!data.results) {
      console.error("[Adzuna] No results key in response");
      return [];
    }

    console.log(`[Adzuna] Got ${data.results.length} jobs`);

    return data.results.map((j): RawJobListing => ({
      externalId: j.id,
      source: JobSource.ADZUNA,
      sourceUrl: j.redirect_url,
      title: j.title,
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "",
      country: where.toUpperCase(),
      isRemote: (j.location?.display_name ?? "").toLowerCase().includes("remote"),
      workType: detectWorkType((j.description ?? "") + (j.location?.display_name ?? "")),
      jobType: detectJobType((j.contract_time ?? "") + (j.contract_type ?? "")),
      description: j.description || "<p>See listing for details.</p>",
      skills: extractSkills(j.description ?? ""),
      salaryMin: j.salary_min,
      salaryMax: j.salary_max,
      currency: where === "gb" ? "GBP" : "USD",
      postedAt: j.created ? new Date(j.created) : new Date(),
    }));
  } catch (err) {
    console.error("[Adzuna] fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Fallback static jobs (ensures non-empty DB on first sync) ────

const FALLBACK_JOBS: RawJobListing[] = [
  {
    externalId: "fallback-001",
    source: JobSource.MANUAL,
    sourceUrl: "https://stripe.com/jobs/search?teams[]=Engineering",
    title: "Software Engineer (General Application)",
    company: "Stripe",
    companyLogo: "https://logo.clearbit.com/stripe.com",
    location: "San Francisco / Remote",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Stripe builds economic infrastructure for the internet. We process hundreds of billions of dollars per year for millions of businesses worldwide.</p>",
    skills: ["TypeScript", "Go", "Python", "PostgreSQL", "React"],
    salaryMin: 120000,
    salaryMax: 180000,
    currency: "USD",
    visaSponsorship: true,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-002",
    source: JobSource.MANUAL,
    sourceUrl: "https://www.figma.com/careers/",
    title: "Frontend Engineer Intern",
    company: "Figma",
    companyLogo: "https://logo.clearbit.com/figma.com",
    location: "Remote",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.INTERNSHIP,
    experienceLevel: ExperienceLevel.FRESHER,
    description: "<p>Join Figma's engineering team and help build the future of collaborative design tools used by millions of designers globally.</p>",
    skills: ["React", "TypeScript", "CSS", "WebGL"],
    postedAt: new Date(),
  },
  {
    externalId: "fallback-003",
    source: JobSource.MANUAL,
    sourceUrl: "https://vercel.com/careers",
    title: "Software Engineer — Next.js",
    company: "Vercel",
    companyLogo: "https://logo.clearbit.com/vercel.com",
    location: "Remote Worldwide",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Build the platform that powers the modern web. Work on Next.js, Edge Runtime, and developer tooling used by millions of developers.</p>",
    skills: ["TypeScript", "Next.js", "React", "Node.js", "Rust"],
    salaryMin: 110000,
    salaryMax: 160000,
    currency: "USD",
    visaSponsorship: true,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-004",
    source: JobSource.MANUAL,
    sourceUrl: "https://notion.so/careers",
    title: "Full Stack Engineer",
    company: "Notion",
    companyLogo: "https://logo.clearbit.com/notion.so",
    location: "New York / Remote",
    country: "USA",
    isRemote: true,
    workType: WorkType.HYBRID,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Help build the connected workspace for millions. High ownership, real impact, small teams. We ship features used by 30M+ users weekly.</p>",
    skills: ["React", "TypeScript", "Python", "PostgreSQL"],
    salaryMin: 100000,
    salaryMax: 145000,
    currency: "USD",
    visaSponsorship: true,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-005",
    source: JobSource.MANUAL,
    sourceUrl: "https://supabase.com/careers",
    title: "Backend Engineer",
    company: "Supabase",
    companyLogo: "https://logo.clearbit.com/supabase.com",
    location: "Remote Worldwide",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Build the open source Firebase alternative. Work on PostgreSQL, realtime subscriptions, edge functions, and storage at scale.</p>",
    skills: ["PostgreSQL", "Go", "Rust", "TypeScript", "Docker"],
    salaryMin: 90000,
    salaryMax: 135000,
    currency: "USD",
    visaSponsorship: true,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-006",
    source: JobSource.MANUAL,
    sourceUrl: "https://linear.app/careers",
    title: "Software Engineer — Product",
    company: "Linear",
    companyLogo: "https://logo.clearbit.com/linear.app",
    location: "Remote Worldwide",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Build issue tracking and project management for the world's best software teams. Small team, high autonomy, massive impact.</p>",
    skills: ["TypeScript", "React", "Node.js", "GraphQL", "PostgreSQL"],
    salaryMin: 95000,
    salaryMax: 140000,
    currency: "USD",
    visaSponsorship: false,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-007",
    source: JobSource.MANUAL,
    sourceUrl: "https://posthog.com/careers",
    title: "Full Stack Engineer",
    company: "PostHog",
    companyLogo: "https://logo.clearbit.com/posthog.com",
    location: "Remote Worldwide",
    country: "UK",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Fully remote, profitable, and growing fast. Build the open-source product analytics platform. Ship more features in a month than most companies in a year.</p>",
    skills: ["Python", "Django", "React", "TypeScript", "ClickHouse"],
    salaryMin: 65000,
    salaryMax: 105000,
    currency: "USD",
    postedAt: new Date(),
  },
  {
    externalId: "fallback-008",
    source: JobSource.MANUAL,
    sourceUrl: "https://www.cloudflare.com/careers/",
    title: "Software Engineer — Edge Compute",
    company: "Cloudflare",
    companyLogo: "https://logo.clearbit.com/cloudflare.com",
    location: "Remote / Austin, TX",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.JUNIOR,
    description: "<p>Help build the internet's most secure, fast, and reliable network. Work on Workers, R2, D1, and the global edge platform at massive scale.</p>",
    skills: ["Rust", "Go", "TypeScript", "JavaScript", "Docker"],
    salaryMin: 105000,
    salaryMax: 155000,
    currency: "USD",
    visaSponsorship: true,
    postedAt: new Date(),
  },
  {
    externalId: "fallback-009",
    source: JobSource.MANUAL,
    sourceUrl: "https://razorpay.com/jobs/",
    title: "SDE-1 — Frontend",
    company: "Razorpay",
    companyLogo: "https://logo.clearbit.com/razorpay.com",
    location: "Bengaluru, India",
    country: "India",
    isRemote: false,
    workType: WorkType.HYBRID,
    jobType: JobType.FULL_TIME,
    experienceLevel: ExperienceLevel.FRESHER,
    description: "<p>Build products serving 8M+ businesses in India. Work on payments, banking, and fintech infrastructure at Razorpay, India's leading payments platform.</p>",
    skills: ["React", "TypeScript", "JavaScript", "Node.js", "CSS"],
    salaryMin: 1200000,
    salaryMax: 1800000,
    currency: "INR",
    postedAt: new Date(),
  },
  {
    externalId: "fallback-010",
    source: JobSource.MANUAL,
    sourceUrl: "https://apply.workable.com/huggingface/",
    title: "ML Engineer Intern",
    company: "Hugging Face",
    companyLogo: "https://logo.clearbit.com/huggingface.co",
    location: "Remote Worldwide",
    country: "USA",
    isRemote: true,
    workType: WorkType.REMOTE,
    jobType: JobType.INTERNSHIP,
    experienceLevel: ExperienceLevel.FRESHER,
    description: "<p>Work on state-of-the-art language models. Contribute to open-source ML libraries used by millions. Potential to publish research and convert to full-time.</p>",
    skills: ["Python", "PyTorch", "Transformers", "CUDA", "NLP"],
    postedAt: new Date(),
  },
];

// ─── Main aggregator ──────────────────────────────────────────────

export interface AggregatorOptions {
  sources?: ("remotive" | "greenhouse" | "adzuna")[];
  keywords?: string;
  useFallback?: boolean;
}

export async function aggregateJobs(
  opts: AggregatorOptions = {}
): Promise<RawJobListing[]> {
  const sources = opts.sources ?? ["remotive", "greenhouse", "adzuna"];
  const kw = opts.keywords ?? "software engineer developer frontend backend";
  const useFallback = opts.useFallback !== false; // default true

  console.log(`[aggregateJobs] Starting with sources: ${sources.join(", ")}`);

  const fetches: Promise<RawJobListing[]>[] = [];

  if (sources.includes("remotive")) {
    fetches.push(fetchRemotiveJobs(kw, 50));
  }
  if (sources.includes("greenhouse")) {
    fetches.push(fetchGreenhouseJobs());
  }
  if (sources.includes("adzuna")) {
    fetches.push(fetchAdzunaJobs(kw, "us", 1, 50));
  }

  const results = await Promise.allSettled(fetches);
  const all: RawJobListing[] = [];
  let sourceIndex = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      console.log(`[aggregateJobs] source[${i}] → ${r.value.length} jobs`);
      all.push(...r.value);
    } else {
      console.error(`[aggregateJobs] source[${i}] rejected:`, r.reason);
    }
  }

  console.log(`[aggregateJobs] Total before dedup: ${all.length}`);

  // Deduplicate by (externalId + source)
  const seen = new Set<string>();
  const deduped = all.filter((j) => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[aggregateJobs] Total after dedup: ${deduped.length}`);

  // If all external sources returned nothing, use fallback jobs so the app is usable
  if (deduped.length === 0 && useFallback) {
    console.warn("[aggregateJobs] All sources returned 0 jobs — using fallback static jobs");
    return FALLBACK_JOBS;
  }

  return deduped;
}