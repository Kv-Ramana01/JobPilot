// app/api/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  analyzeResume,
  generateCoverLetter,
  generateInterviewQuestions,
  analyzeSkillsGap,
} from "@/services/gemini";
import { z } from "zod";
import { AiTaskType, Prisma } from "@prisma/client";

// ─── Schemas ──────────────────────────────────────────────────────

const resumeAnalysisSchema = z.object({
  task: z.literal("RESUME_SCORE"),
  resumeText: z.string().min(50, "Resume text is too short (min 50 chars)"),
  jobDescription: z.string().min(30, "Job description is too short (min 30 chars)"),
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  resumeId: z.string().optional(),
  jobId: z.string().optional(),
});

const coverLetterSchema = z.object({
  task: z.literal("COVER_LETTER"),
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  jobDescription: z.string().min(20, "Job description is required"),
  requirements: z.string().optional(),
  tone: z
    .enum(["formal", "confident", "friendly", "concise", "detailed"])
    .default("confident"),
});

const interviewPrepSchema = z.object({
  task: z.literal("INTERVIEW_PREP"),
  jobTitle: z.string().min(1),
  jobDescription: z.string().default(""),
  skills: z.array(z.string()).default([]),
});

const skillsGapSchema = z.object({
  task: z.literal("SKILLS_GAP"),
  userSkills: z.array(z.string()),
  jobDescription: z.string().min(20),
  jobTitle: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("task", [
  resumeAnalysisSchema,
  coverLetterSchema,
  interviewPrepSchema,
  skillsGapSchema,
]);

// ─── POST /api/ai ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check Gemini key is configured
  if (!process.env.GEMINI_API_KEY) {
    console.error("[AI] GEMINI_API_KEY is not set");
    return NextResponse.json(
      { error: "AI service is not configured. Please set GEMINI_API_KEY in your environment variables." },
      { status: 503 }
    );
  }

  // Rate limit: 20 AI requests per minute per user
  const { success: rateLimitOk, remaining, reset } = await rateLimit(`ai:${clerkId}`, 20, 60_000);
  if (!rateLimitOk) {
    return NextResponse.json(rateLimitResponse(reset), { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  // Get DB user
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found. Please complete onboarding." }, { status: 404 });
  }

  const data = parsed.data;

  try {
    let result: unknown;
    let taskType: AiTaskType;

    console.log(`[AI] Processing ${data.task} for user ${clerkId}`);

    switch (data.task) {
      case "RESUME_SCORE": {
        result = await analyzeResume(
          data.resumeText,
          data.jobDescription,
          data.jobTitle,
          data.company
        );
        taskType = AiTaskType.RESUME_SCORE;
        break;
      }

      case "COVER_LETTER": {
        const profile = user.profile;
        result = await generateCoverLetter(
          {
            fullName: profile?.fullName ?? user.email.split("@")[0],
            skills: profile?.skills ?? [],
            experienceLevel: profile?.experienceLevel ?? "FRESHER",
            bio: profile?.bio,
          },
          {
            title: data.jobTitle,
            company: data.company,
            description: data.jobDescription,
            requirements: data.requirements,
          },
          data.tone
        );
        taskType = AiTaskType.COVER_LETTER;
        break;
      }

      case "INTERVIEW_PREP": {
        result = await generateInterviewQuestions(
          data.jobTitle,
          data.jobDescription,
          data.skills
        );
        taskType = AiTaskType.INTERVIEW_PREP;
        break;
      }

      case "SKILLS_GAP": {
        result = await analyzeSkillsGap(
          data.userSkills,
          data.jobDescription,
          data.jobTitle
        );
        taskType = AiTaskType.SKILLS_GAP;
        break;
      }
    }

    console.log(`[AI] ${data.task} completed successfully`);

    // Persist to AI history (non-blocking — don't fail the request if this errors)
    db.aiHistory
      .create({
        data: {
          userId: user.id,
          type: taskType!,
          jobTitle: "jobTitle" in data ? data.jobTitle : undefined,
          company: "company" in data ? data.company : undefined,
          jobDesc: "jobDescription" in data ? (data as { jobDescription: string }).jobDescription : undefined,
          resumeId: "resumeId" in data ? data.resumeId : undefined,
          result: result as Prisma.InputJsonValue,
        },
      })
      .catch((err) => {
        console.error("[AI] Failed to save AI history:", err.message);
      });

    return NextResponse.json({ success: true, data: result, remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[AI/${data.task}] Error:`, message);

    // Return user-friendly error messages
    if (message.includes("rate limit") || message.includes("429") || message.includes("quota")) {
      return NextResponse.json(
        { success: false, error: "AI service rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { success: false, error: "AI service is not configured correctly." },
        { status: 503 }
      );
    }

    if (message.includes("invalid JSON") || message.includes("JSON")) {
      return NextResponse.json(
        { success: false, error: "AI returned an unexpected response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: `AI ${data.task} failed: ${message}` },
      { status: 500 }
    );
  }
}

// ─── GET /api/ai — AI history ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") as AiTaskType | null;
  const limit = Math.min(parseInt(sp.get("limit") ?? "20"), 100);

  try {
    const history = await db.aiHistory.findMany({
      where: { userId: user.id, ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        jobTitle: true,
        company: true,
        createdAt: true,
        result: true,
      },
    });

    return NextResponse.json({ success: true, data: history });
  } catch (err) {
    console.error("[AI GET] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "Failed to fetch AI history" }, { status: 500 });
  }
}