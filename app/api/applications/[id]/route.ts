// app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";

const patchSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  notes: z.string().optional(),
  coverLetter: z.string().optional(),
  interviewDate: z.string().datetime().optional(),
  oaDeadline: z.string().datetime().optional(),
});

// ─── PATCH /api/applications/[id] ────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const app = await db.application.findFirst({
    where: { id, userId: user.id },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const data = parsed.data;

  // Build timeline entry
  const currentTimeline = Array.isArray(app.timeline) ? app.timeline : [];
  const timelineEntry = data.status
    ? { event: data.status, at: new Date().toISOString() }
    : null;

  // Date fields
  const dateUpdate: Record<string, Date | undefined> = {};
  if (data.status === ApplicationStatus.INTERVIEW) {
    dateUpdate.interviewDate = data.interviewDate ? new Date(data.interviewDate) : undefined;
  }
  if (data.status === ApplicationStatus.OFFER) {
    dateUpdate.offerReceivedAt = new Date();
  }
  if (data.status === ApplicationStatus.REJECTED) {
    dateUpdate.rejectedAt = new Date();
  }

  const updated = await db.application.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.coverLetter !== undefined && { coverLetter: data.coverLetter }),
      ...(data.interviewDate && { interviewDate: new Date(data.interviewDate) }),
      ...(data.oaDeadline && { oaDeadline: new Date(data.oaDeadline) }),
      ...(data.status === ApplicationStatus.OFFER && { offerReceivedAt: new Date() }),
      ...(data.status === ApplicationStatus.REJECTED && { rejectedAt: new Date() }),
      ...(timelineEntry && {
        timeline: [...currentTimeline, timelineEntry],
      }),
      updatedAt: new Date(),
    },
    include: { job: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ─── DELETE /api/applications/[id] ───────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const app = await db.application.findFirst({ where: { id, userId: user.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.application.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
