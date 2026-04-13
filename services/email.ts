// services/email.ts
// Email delivery via Resend — job alerts, notifications, welcome emails

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "JobPilot <noreply@jobpilot.dev>";

// ─── Types ────────────────────────────────────────────────────────

interface JobAlertEmail {
  to: string;
  userName: string;
  alertName: string;
  jobs: {
    title: string;
    company: string;
    location: string;
    url: string;
    salary?: string;
    isRemote: boolean;
  }[];
}

interface WelcomeEmail {
  to: string;
  userName: string;
}

// ─── Welcome email ────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, userName }: WelcomeEmail) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to JobPilot 🚀",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <div style="background: #534AB7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to JobPilot ⚡</h1>
    <p style="color: #CECBF6; margin: 8px 0 0;">Smart job search for developers</p>
  </div>

  <p>Hi ${userName},</p>
  <p>Your account is ready. Here's how to get started:</p>

  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
    <p style="margin: 0 0 12px; font-weight: 600;">1. Complete your profile</p>
    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Add your skills, experience, and links — AI uses this to write personalized cover letters.</p>

    <p style="margin: 0 0 12px; font-weight: 600;">2. Browse 50k+ jobs</p>
    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Filter by remote, internship, location, tech stack, and more.</p>

    <p style="margin: 0 0 12px; font-weight: 600;">3. Optimize your resume with AI</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Get an ATS score, missing keywords, and rewritten bullet points — powered by Gemini.</p>
  </div>

  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
     style="display: inline-block; background: #534AB7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
    Go to dashboard →
  </a>

  <p style="margin-top: 32px; color: #9ca3af; font-size: 12px;">
    JobPilot · Built for developers, by developers
  </p>
</body>
</html>`,
  });
}

// ─── Job alert email ──────────────────────────────────────────────

export async function sendJobAlertEmail({
  to,
  userName,
  alertName,
  jobs,
}: JobAlertEmail) {
  if (jobs.length === 0) return;

  const jobsHtml = jobs
    .slice(0, 10) // max 10 jobs per email
    .map(
      (j) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${j.title}</p>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${j.company} · ${j.location}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${j.isRemote ? '<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 99px; font-size: 12px;">Remote</span>' : ""}
            ${j.salary ? `<span style="color: #6b7280; font-size: 12px;">${j.salary}</span>` : ""}
          </div>
        </div>
      </div>
      <a href="${j.url}" style="display: inline-block; margin-top: 12px; background: #f3f4f6; color: #374151; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 13px;">View & apply →</a>
    </div>
  `
    )
    .join("");

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${jobs.length} new jobs matching "${alertName}"`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <h2 style="margin: 0 0 8px;">New jobs for you, ${userName} 👋</h2>
  <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">
    ${jobs.length} new job${jobs.length !== 1 ? "s" : ""} matching your alert <strong>"${alertName}"</strong>
  </p>

  ${jobsHtml}

  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs" style="color: #534AB7; text-decoration: none; font-size: 14px;">
      View all jobs on JobPilot →
    </a>
  </div>

  <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
    To stop receiving these alerts, visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="color: #9ca3af;">alerts settings</a>.
  </p>
</body>
</html>`,
  });
}

// ─── Application status update email ─────────────────────────────

export async function sendStatusUpdateEmail({
  to,
  userName,
  jobTitle,
  company,
  newStatus,
}: {
  to: string;
  userName: string;
  jobTitle: string;
  company: string;
  newStatus: string;
}) {
  const STATUS_MESSAGES: Record<string, { subject: string; body: string; emoji: string }> = {
    INTERVIEW: {
      emoji: "🎉",
      subject: `Interview scheduled — ${company}`,
      body: "Great news! You've been selected for an interview. Make sure to prepare using JobPilot's Interview Prep AI.",
    },
    OFFER: {
      emoji: "🎊",
      subject: `Offer received from ${company}!`,
      body: "Congratulations! You've received a job offer. Take your time reviewing and feel free to negotiate.",
    },
    REJECTED: {
      emoji: "💪",
      subject: `Application update — ${company}`,
      body: "This one didn't work out, but don't give up. Use JobPilot's Resume AI to strengthen your next application.",
    },
  };

  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return;

  return resend.emails.send({
    from: FROM,
    to,
    subject: msg.subject,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <p style="font-size: 32px;">${msg.emoji}</p>
  <h2 style="margin: 0 0 16px;">${msg.subject}</h2>
  <p style="color: #374151;">Hi ${userName},</p>
  <p style="color: #374151;">Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated.</p>
  <p style="color: #374151;">${msg.body}</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/applications" 
     style="display: inline-block; background: #534AB7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
    View applications →
  </a>
</body>
</html>`,
  });
}
