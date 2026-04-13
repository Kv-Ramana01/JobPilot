// app/api/saved-jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  jobId: z.string(),
  collection: z.string().default("general"),
  notes: z.string().optional(),
});

// GET /api/saved-jobs
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collection = req.nextUrl.searchParams.get("collection");

  const saved = await db.savedJob.findMany({
    where: {
      userId: user.id,
      ...(collection ? { collection } : {}),
    },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: saved });
}

// POST /api/saved-jobs
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const saved = await db.savedJob.upsert({
    where: { userId_jobId: { userId: user.id, jobId: parsed.data.jobId } },
    create: {
      userId: user.id,
      jobId: parsed.data.jobId,
      collection: parsed.data.collection,
      notes: parsed.data.notes,
    },
    update: {
      collection: parsed.data.collection,
      notes: parsed.data.notes,
    },
    include: { job: true },
  });

  return NextResponse.json({ success: true, data: saved }, { status: 201 });
}

// DELETE /api/saved-jobs
export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const { jobId } = z.object({ jobId: z.string() }).parse(body);

  await db.savedJob.deleteMany({
    where: { userId: user.id, jobId },
  });

  return NextResponse.json({ success: true });
}
