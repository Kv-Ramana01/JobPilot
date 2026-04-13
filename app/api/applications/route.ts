// app/api/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ApplicationStatus, ApplyMode } from "@prisma/client";

const createSchema = z.object({
  jobId: z.string(),
  applyMode: z.nativeEnum(ApplyMode).default(ApplyMode.MANUAL),
  resumeId: z.string().optional(),
  coverLetter: z.string().optional(),
  notes: z.string().optional(),
});

// ─── GET /api/applications ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as ApplicationStatus | null;

  const applications = await db.application.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
    },
    include: { job: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: applications });
}

// ─── POST /api/applications ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { jobId, applyMode, resumeId, coverLetter, notes } = parsed.data;

  // Verify job exists
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Upsert — avoid duplicates
  const application = await db.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: {
      userId: user.id,
      jobId,
      status: ApplicationStatus.APPLIED,
      applyMode,
      resumeId,
      coverLetter,
      notes,
      appliedAt: new Date(),
      timeline: [{ event: "Applied", at: new Date().toISOString() }],
    },
    update: {
      status: ApplicationStatus.APPLIED,
      applyMode,
      appliedAt: new Date(),
      updatedAt: new Date(),
    },
    include: { job: true },
  });

  // Increment job apply count
  await db.job.update({
    where: { id: jobId },
    data: { applyCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true, data: application }, { status: 201 });
}
