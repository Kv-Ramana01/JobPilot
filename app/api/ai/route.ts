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
  resumeText: z.string().min(100, "Resume text is too short"),
  jobDescription: z.string().min(50, "Job description is too short"),
  jobTitle: z.string(),
  company: z.string(),
  resumeId: z.string().optional(),
  jobId: z.string().optional(),
});

const coverLetterSchema = z.object({
  task: z.literal("COVER_LETTER"),
  jobTitle: z.string(),
  company: z.string(),
  jobDescription: z.string(),
  requirements: z.string().optional(),
  tone: z
    .enum(["formal", "confident", "friendly", "concise", "detailed"])
    .default("confident"),
});

const interviewPrepSchema = z.object({
  task: z.literal("INTERVIEW_PREP"),
  jobTitle: z.string(),
  jobDescription: z.string(),
  skills: z.array(z.string()),
});

const skillsGapSchema = z.object({
  task: z.literal("SKILLS_GAP"),
  userSkills: z.array(z.string()),
  jobDescription: z.string(),
  jobTitle: z.string(),
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

  // Rate limit: 20 AI requests per minute per user
  const { success, remaining, reset } = await rateLimit(`ai:${clerkId}`, 20, 60_000);
  if (!success) {
    return NextResponse.json(rateLimitResponse(reset), { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get DB user
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data = parsed.data;

  try {
    let result: unknown;
    let taskType: AiTaskType;

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
            fullName: profile?.fullName ?? user.email,
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

    // Persist to AI history
    await db.aiHistory.create({
      data: {
        userId: user.id,
        type: taskType,
        jobTitle: "jobTitle" in data ? data.jobTitle : undefined,
        company: "company" in data ? data.company : undefined,
        jobDesc: "jobDescription" in data ? data.jobDescription : undefined,
        resumeId: "resumeId" in data ? data.resumeId : undefined,
        result: result as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, data: result, remaining });
  } catch (err) {
    console.error(`[AI/${data.task}]`, err);
    return NextResponse.json(
      { success: false, error: `AI ${data.task} failed. Please try again.` },
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
}
