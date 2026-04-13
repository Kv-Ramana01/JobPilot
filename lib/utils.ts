// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string | null | undefined, fmt = "MMM d, yyyy"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency = "USD"
): string {
  if (!min && !max) return "Not disclosed";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
  });
  if (min && max) return `${fmt.format(min)} – ${fmt.format(max)}`;
  if (min) return `From ${fmt.format(min)}`;
  return `Up to ${fmt.format(max!)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function workTypeLabel(wt: string): string {
  return { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" }[wt] ?? wt;
}

export function jobTypeLabel(jt: string): string {
  return (
    {
      FULL_TIME: "Full-time",
      PART_TIME: "Part-time",
      INTERNSHIP: "Internship",
      CONTRACT: "Contract",
      FREELANCE: "Freelance",
    }[jt] ?? jt
  );
}

export function expLabel(el: string): string {
  return (
    {
      FRESHER: "Fresher / 0 yrs",
      JUNIOR: "Junior (1–2 yrs)",
      MID: "Mid-level (3–5 yrs)",
      SENIOR: "Senior (5+ yrs)",
      LEAD: "Lead / Staff",
      PRINCIPAL: "Principal / Director",
    }[el] ?? el
  );
}

export function statusColor(status: string): string {
  return (
    {
      SAVED: "bg-gray-100 text-gray-700",
      APPLIED: "bg-blue-50 text-blue-700",
      OA: "bg-amber-50 text-amber-700",
      INTERVIEW: "bg-green-50 text-green-700",
      OFFER: "bg-purple-50 text-purple-700",
      REJECTED: "bg-red-50 text-red-700",
      WITHDRAWN: "bg-gray-100 text-gray-500",
    }[status] ?? "bg-gray-100 text-gray-600"
  );
}

export function statusLabel(status: string): string {
  return (
    {
      SAVED: "Saved",
      APPLIED: "Applied",
      OA: "Online Assessment",
      INTERVIEW: "Interview",
      OFFER: "Offer",
      REJECTED: "Rejected",
      WITHDRAWN: "Withdrawn",
    }[status] ?? status
  );
}

/** Extract plain text from a resume PDF (basic heuristic) */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Returns initials from a full name */
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
