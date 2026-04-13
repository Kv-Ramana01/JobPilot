// types/index.ts
// Shared types used across the JobPilot codebase

import type {
  Job,
  Application,
  SavedJob,
  Profile,
  Resume,
  Alert,
  Notification,
  AiHistory,
  ApplicationStatus,
  JobType,
  WorkType,
  ExperienceLevel,
  JobSource,
} from "@prisma/client";

// ─── Re-export Prisma types ────────────────────────────────────────
export type {
  Job,
  Application,
  SavedJob,
  Profile,
  Resume,
  Alert,
  Notification,
  AiHistory,
  ApplicationStatus,
  JobType,
  WorkType,
  ExperienceLevel,
  JobSource,
};

// ─── Extended / computed types ────────────────────────────────────

export type JobWithMeta = Job & {
  isSaved?: boolean;
  application?: Application | null;
  matchScore?: number; // AI computed match %
};

export type ApplicationWithJob = Application & {
  job: Job;
};

export type SavedJobWithJob = SavedJob & {
  job: Job;
};

export type ProfileWithUser = Profile & {
  resumes: Resume[];
};

// ─── API response types ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Job search filters ───────────────────────────────────────────

export interface JobFilters {
  search?: string;
  roles?: string[];
  jobType?: JobType[];
  workType?: WorkType[];
  experienceLevel?: ExperienceLevel[];
  countries?: string[];
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  remote?: boolean;
  visaSponsorship?: boolean;
  postedWithin?: number; // days
  source?: JobSource[];
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "salary" | "match" | "remote";
}

// ─── Gemini AI result types ───────────────────────────────────────

export interface ResumeAnalysis {
  atsScore: number;           // 0-100
  matchScore: number;         // 0-100 against the JD
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: ResumeSuggestion[];
  improvedBullets: BulletImprovement[];
  skillsGap: string[];
  summary: string;
  improvedSummary: string;
}

export interface ResumeSuggestion {
  type: "keyword" | "structure" | "quantify" | "format" | "tone";
  priority: "high" | "medium" | "low";
  original?: string;
  suggestion: string;
  reason: string;
}

export interface BulletImprovement {
  original: string;
  improved: string;
  explanation: string;
}

export interface CoverLetterResult {
  subject: string;
  body: string;
  tone: CoverLetterTone;
}

export type CoverLetterTone =
  | "formal"
  | "confident"
  | "friendly"
  | "concise"
  | "detailed";

// ─── Dashboard stats ──────────────────────────────────────────────

export interface DashboardStats {
  totalApplied: number;
  totalSaved: number;
  totalInterviews: number;
  totalOffers: number;
  totalRejections: number;
  responseRate: number;
  thisWeekApplications: number[];  // 7 days
  applicationsByStatus: StatusCount[];
  topCompanies: { company: string; count: number }[];
}

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

// ─── Notification helpers ─────────────────────────────────────────

export interface NotificationPayload {
  userId: string;
  type: import("@prisma/client").NotificationType;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}

// ─── Auto-apply ───────────────────────────────────────────────────

export interface AutoApplyResult {
  success: boolean;
  mode: "direct_link" | "autofill" | "manual";
  message: string;
  applyUrl?: string;
}

// ─── Job sources / aggregator ─────────────────────────────────────

export interface RawJobListing {
  externalId: string;
  source: JobSource;
  sourceUrl: string;
  title: string;
  company: string;
  companyLogo?: string;
  location?: string;
  country?: string;
  isRemote: boolean;
  workType: WorkType;
  jobType: JobType;
  description: string;
  requirements?: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  postedAt?: Date;
  deadline?: Date;
  visaSponsorship?: boolean;
  experienceLevel?: ExperienceLevel;
}
