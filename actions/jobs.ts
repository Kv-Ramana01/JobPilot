// actions/jobs.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ApplicationStatus, ApplyMode } from "@prisma/client";

// ─── Save a job ───────────────────────────────────────────────────

export async function saveJobAction(jobId: string, collection = "general") {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await db.savedJob.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: { userId: user.id, jobId, collection },
    update: { collection },
  });

  revalidatePath("/saved");
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ─── Unsave a job ─────────────────────────────────────────────────

export async function unsaveJobAction(jobId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  await db.savedJob.deleteMany({ where: { userId: user.id, jobId } });

  revalidatePath("/saved");
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ─── Track a manual application ───────────────────────────────────

export async function trackApplicationAction(
  jobId: string,
  opts: { resumeId?: string; coverLetter?: string; notes?: string } = {}
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const application = await db.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: {
      userId: user.id,
      jobId,
      status: ApplicationStatus.APPLIED,
      applyMode: ApplyMode.DIRECT_LINK,
      resumeId: opts.resumeId,
      coverLetter: opts.coverLetter,
      notes: opts.notes,
      appliedAt: new Date(),
      timeline: [{ event: "Applied", at: new Date().toISOString() }] as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
    update: {
      status: ApplicationStatus.APPLIED,
      appliedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await db.job.update({
    where: { id: jobId },
    data: { applyCount: { increment: 1 } },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { success: true, applicationId: application.id };
}

// ─── Update application status ────────────────────────────────────

export async function updateApplicationStatusAction(
  applicationId: string,
  status: ApplicationStatus
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const app = await db.application.findFirst({
    where: { id: applicationId, userId: user.id },
  });
  if (!app) throw new Error("Application not found");

  const currentTimeline = Array.isArray(app.timeline) ? app.timeline as Record<string, unknown>[] : [];
  const newTimeline = [...currentTimeline, { event: status, at: new Date().toISOString() }] as unknown as import("@prisma/client").Prisma.InputJsonValue;

  await db.application.update({
    where: { id: applicationId },
    data: {
      status,
      timeline: newTimeline,
      ...(status === ApplicationStatus.OFFER && { offerReceivedAt: new Date() }),
      ...(status === ApplicationStatus.REJECTED && { rejectedAt: new Date() }),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { success: true };
}
