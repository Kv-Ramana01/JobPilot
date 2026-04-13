// services/playwright-apply.ts
// Playwright-based auto-apply engine for JobPilot
// Runs server-side (Node.js only). Never import this in client components.

import type { Profile } from "@prisma/client";
import type { Page } from "playwright";
import type { AutoApplyResult } from "@/types";

interface ApplyOptions {
  jobId: string;
  applyUrl: string;
  profile: Profile;
  resumeUrl?: string;
}

type JobPlatform = "greenhouse" | "lever" | "workable" | "unknown";

function detectPlatform(url: string): JobPlatform {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("workable.com")) return "workable";
  return "unknown";
}

export async function autoApply(opts: ApplyOptions): Promise<AutoApplyResult> {
  const platform = detectPlatform(opts.applyUrl);

  if (platform === "unknown") {
    return {
      success: true,
      mode: "direct_link",
      message: "Opening apply page — your profile is ready to copy-paste.",
      applyUrl: opts.applyUrl,
    };
  }

  try {
    return await playwrightFill(opts, platform);
  } catch (err) {
    console.warn(`[AutoApply] Playwright failed (${platform}):`, err);

    return {
      success: true,
      mode: "direct_link",
      message: "Auto-fill unavailable — opening apply page directly.",
      applyUrl: opts.applyUrl,
    };
  }
}

async function playwrightFill(
  opts: ApplyOptions,
  platform: JobPlatform
): Promise<AutoApplyResult> {
  const { chromium } = await import("playwright");

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";

  const browser = await chromium.launch({ headless });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto(opts.applyUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const profile = opts.profile;

    if (platform === "greenhouse") {
      await fillGreenhouseForm(page, profile);
    } else if (platform === "lever") {
      await fillLeverForm(page, profile);
    } else if (platform === "workable") {
      await fillWorkableForm(page, profile);
    }

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

async function fillGreenhouseForm(page: Page, profile: Profile) {
  await fillIfExists(page, "#first_name", getFirstName(profile.fullName));
  await fillIfExists(page, "#last_name", getLastName(profile.fullName));
  await fillIfExists(page, "#email", "");
  await fillIfExists(page, "#phone", profile.phone ?? "");

  if (profile.linkedinUrl) {
    await fillIfExists(page, 'input[name*="linkedin"]', profile.linkedinUrl);
  }

  if (profile.portfolioUrl) {
    await fillIfExists(page, 'input[name*="website"]', profile.portfolioUrl);
    await fillIfExists(page, 'input[name*="portfolio"]', profile.portfolioUrl);
  }

  if (profile.githubUrl) {
    await fillIfExists(page, 'input[name*="github"]', profile.githubUrl);
  }
}

async function fillLeverForm(page: Page, profile: Profile) {
  await fillIfExists(page, 'input[name="name"]', profile.fullName ?? "");
  await fillIfExists(page, 'input[name="email"]', "");
  await fillIfExists(page, 'input[name="phone"]', profile.phone ?? "");
  await fillIfExists(page, 'input[name="urls[LinkedIn]"]', profile.linkedinUrl ?? "");
  await fillIfExists(page, 'input[name="urls[GitHub]"]', profile.githubUrl ?? "");
  await fillIfExists(page, 'input[name="urls[Portfolio]"]', profile.portfolioUrl ?? "");
}

async function fillWorkableForm(page: Page, profile: Profile) {
  await fillIfExists(page, 'input[name="firstname"]', getFirstName(profile.fullName));
  await fillIfExists(page, 'input[name="lastname"]', getLastName(profile.fullName));
  await fillIfExists(page, 'input[name="email"]', "");
  await fillIfExists(page, 'input[name="phone"]', profile.phone ?? "");
  await fillIfExists(page, 'input[name="address"]', profile.city ?? "");
}

async function fillIfExists(page: Page, selector: string, value: string) {
  if (!value) return;

  try {
    const el = page.locator(selector).first();

    if (await el.isVisible({ timeout: 1000 })) {
      await el.fill(value);
    }
  } catch {
    // ignore missing elements
  }
}

function getFirstName(fullName: string | null | undefined): string {
  return fullName?.split(" ")[0] ?? "";
}

function getLastName(fullName: string | null | undefined): string {
  const parts = fullName?.split(" ") ?? [];
  return parts.slice(1).join(" ");
}