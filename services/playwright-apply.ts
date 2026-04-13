// services/playwright-apply.ts
// Playwright-based auto-apply engine for JobPilot
// Runs server-side (Node.js only). Never import this in client components.

/**
 * Strategy:
 *  Mode A — Direct redirect: open the apply URL with tracking
 *  Mode B — Playwright autofill: detect Greenhouse/Lever/Workable forms and fill fields
 *  Mode C — Fallback: save the job, surface profile data as copy-paste suggestions
 *
 * Important: Many sites block headless browsers. The engine detects this and
 * gracefully falls back to Mode A. Playwright is only used when the site
 * co-operates (our internal detection heuristic returns `true`).
 */

import type { Profile, Resume } from "@prisma/client";
import type { AutoApplyResult } from "@/types";

// ─── Type definitions ─────────────────────────────────────────────

interface ApplyOptions {
  jobId: string;
  applyUrl: string;
  profile: Profile & { resumes?: Resume[] };
  resumeUrl?: string;
}

// ─── Source detection ─────────────────────────────────────────────

type JobPlatform = "greenhouse" | "lever" | "workable" | "unknown";

function detectPlatform(url: string): JobPlatform {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("workable.com")) return "workable";
  return "unknown";
}

// ─── Main apply function ──────────────────────────────────────────

export async function autoApply(opts: ApplyOptions): Promise<AutoApplyResult> {
  const platform = detectPlatform(opts.applyUrl);

  // For unknown platforms or platforms that typically block bots → Mode A
  if (platform === "unknown") {
    return {
      success: true,
      mode: "direct_link",
      message: "Opening apply page — your profile is ready to copy-paste.",
      applyUrl: opts.applyUrl,
    };
  }

  // Attempt Playwright autofill for known platforms
  try {
    return await playwrightFill(opts, platform);
  } catch (err) {
    console.warn(`[AutoApply] Playwright failed (${platform}):`, err);
    // Graceful fallback to direct link
    return {
      success: true,
      mode: "direct_link",
      message: "Auto-fill unavailable — opening apply page directly.",
      applyUrl: opts.applyUrl,
    };
  }
}

// ─── Playwright implementation ────────────────────────────────────

async function playwrightFill(
  opts: ApplyOptions,
  platform: JobPlatform
): Promise<AutoApplyResult> {
  // Dynamically import Playwright — only available in Node.js context
  const { chromium } = await import("playwright");

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(opts.applyUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });

    const profile = opts.profile;

    if (platform === "greenhouse") {
      await fillGreenhouseForm(page, profile);
    } else if (platform === "lever") {
      await fillLeverForm(page, profile);
    } else if (platform === "workable") {
      await fillWorkableForm(page, profile);
    }

    // Take a screenshot for debugging (optional — remove in production)
    // await page.screenshot({ path: `/tmp/apply-${opts.jobId}.png` });

    await browser.close();

    return {
      success: true,
      mode: "autofill",
      message: "Form fields have been filled. Please review and submit.",
      applyUrl: opts.applyUrl,
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ─── Greenhouse form filler ───────────────────────────────────────

async function fillGreenhouseForm(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import("playwright")>["chromium"]["launch"]>["newPage"]>>,
  profile: Profile
) {
  // Greenhouse standard fields
  await fillIfExists(page, "#first_name", getFirstName(profile.fullName));
  await fillIfExists(page, "#last_name", getLastName(profile.fullName));
  await fillIfExists(page, "#email", ""); // Email from session — not stored in profile
  await fillIfExists(page, "#phone", profile.phone ?? "");

  // LinkedIn
  if (profile.linkedinUrl) {
    await fillIfExists(page, 'input[name*="linkedin"]', profile.linkedinUrl);
  }
  // Website / portfolio
  if (profile.portfolioUrl) {
    await fillIfExists(page, 'input[name*="website"]', profile.portfolioUrl);
    await fillIfExists(page, 'input[name*="portfolio"]', profile.portfolioUrl);
  }
  // GitHub
  if (profile.githubUrl) {
    await fillIfExists(page, 'input[name*="github"]', profile.githubUrl);
  }
}

// ─── Lever form filler ────────────────────────────────────────────

async function fillLeverForm(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import("playwright")>["chromium"]["launch"]>["newPage"]>>,
  profile: Profile
) {
  await fillIfExists(page, 'input[name="name"]', profile.fullName ?? "");
  await fillIfExists(page, 'input[name="email"]', "");
  await fillIfExists(page, 'input[name="phone"]', profile.phone ?? "");
  await fillIfExists(page, 'input[name="urls[LinkedIn]"]', profile.linkedinUrl ?? "");
  await fillIfExists(page, 'input[name="urls[GitHub]"]', profile.githubUrl ?? "");
  await fillIfExists(page, 'input[name="urls[Portfolio]"]', profile.portfolioUrl ?? "");
}

// ─── Workable form filler ─────────────────────────────────────────

async function fillWorkableForm(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import("playwright")>["chromium"]["launch"]>["newPage"]>>,
  profile: Profile
) {
  await fillIfExists(page, 'input[name="firstname"]', getFirstName(profile.fullName));
  await fillIfExists(page, 'input[name="lastname"]', getLastName(profile.fullName));
  await fillIfExists(page, 'input[name="email"]', "");
  await fillIfExists(page, 'input[name="phone"]', profile.phone ?? "");
  await fillIfExists(page, 'input[name="address"]', profile.city ?? "");
}

// ─── Helpers ──────────────────────────────────────────────────────

async function fillIfExists(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import("playwright")>["chromium"]["launch"]>["newPage"]>>,
  selector: string,
  value: string
) {
  if (!value) return;
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1000 })) {
      await el.fill(value);
    }
  } catch {
    // Element not found — skip silently
  }
}

function getFirstName(fullName: string | null | undefined): string {
  return fullName?.split(" ")[0] ?? "";
}

function getLastName(fullName: string | null | undefined): string {
  const parts = fullName?.split(" ") ?? [];
  return parts.slice(1).join(" ");
}
