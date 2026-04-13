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
    const url = new URL(
      process.env.REMOTIVE_API_URL ?? "https://remotive.com/api/remote-jobs"
    );
    url.searchParams.set("search", keywords);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) throw new Error(`Remotive error: ${res.status}`);

    const data = await res.json() as { jobs: RemotiveJob[] };

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
      description: j.description,
      skills: [...j.tags, ...extractSkills(j.description)],
      postedAt: new Date(j.publication_date),
    }));
  } catch (err) {
    console.error("[Remotive] fetch failed:", err);
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
const GREENHOUSE_COMPANIES = [
  "stripe", "notion", "linear", "vercel", "supabase", "planetscale",
  "loom", "coda", "retool", "airtable", "figma", "postman",
];

async function fetchGreenhouseCompany(
  company: string
): Promise<RawJobListing[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
      { next: { revalidate: 7200 } }
    );
    if (!res.ok) return [];

    const data = await res.json() as { jobs: GreenhouseJob[] };

    return data.jobs
      .filter((j) => {
        const lower = j.title.toLowerCase();
        return (
          lower.includes("engineer") ||
          lower.includes("developer") ||
          lower.includes("intern") ||
          lower.includes("sde") ||
          lower.includes("frontend") ||
          lower.includes("backend") ||
          lower.includes("fullstack") ||
          lower.includes("devops")
        );
      })
      .map((j): RawJobListing => ({
        externalId: String(j.id),
        source: JobSource.GREENHOUSE,
        sourceUrl: j.absolute_url,
        title: j.title,
        company: company.charAt(0).toUpperCase() + company.slice(1),
        location: j.location.name,
        country: "USA", // default; Greenhouse usually US
        isRemote: j.location.name.toLowerCase().includes("remote"),
        workType: detectWorkType(j.location.name),
        jobType: detectJobType(j.title),
        description: j.content,
        skills: extractSkills(j.content),
        postedAt: new Date(j.updated_at),
      }));
  } catch {
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
    await sleep(300); // polite rate limit
  }
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
    console.warn("[Adzuna] credentials not set, skipping");
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

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Adzuna error: ${res.status}`);

    const data = await res.json() as { results: AdzunaJob[] };

    return data.results.map((j): RawJobListing => ({
      externalId: j.id,
      source: JobSource.ADZUNA,
      sourceUrl: j.redirect_url,
      title: j.title,
      company: j.company.display_name,
      location: j.location.display_name,
      country: where.toUpperCase(),
      isRemote: j.location.display_name.toLowerCase().includes("remote"),
      workType: detectWorkType(j.description + j.location.display_name),
      jobType: detectJobType(j.contract_time ?? j.contract_type ?? ""),
      description: j.description,
      skills: extractSkills(j.description),
      salaryMin: j.salary_min,
      salaryMax: j.salary_max,
      currency: where === "gb" ? "GBP" : "USD",
      postedAt: new Date(j.created),
    }));
  } catch (err) {
    console.error("[Adzuna] fetch failed:", err);
    return [];
  }
}

// ─── Main aggregator ──────────────────────────────────────────────

export interface AggregatorOptions {
  sources?: ("remotive" | "greenhouse" | "adzuna")[];
  keywords?: string;
}

export async function aggregateJobs(
  opts: AggregatorOptions = {}
): Promise<RawJobListing[]> {
  const sources = opts.sources ?? ["remotive", "greenhouse", "adzuna"];
  const kw = opts.keywords ?? "software engineer developer frontend backend";

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

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    }
  });

  // Deduplicate by (externalId + source)
  const seen = new Set<string>();
  return all.filter((j) => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
