// app/api/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { AlertFrequency, WorkType, JobType } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  keywords: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  countries: z.array(z.string()).default([]),
  workTypes: z.array(z.nativeEnum(WorkType)).default([]),
  jobTypes: z.array(z.nativeEnum(JobType)).default([]),
  minSalary: z.number().optional(),
  remote: z.boolean().default(false),
  frequency: z.nativeEnum(AlertFrequency).default(AlertFrequency.DAILY),
  emailEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
});

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alerts = await db.alert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: alerts });
}

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

  // Limit: 10 alerts per user
  const count = await db.alert.count({ where: { userId: user.id } });
  if (count >= 10) {
    return NextResponse.json({ error: "Maximum 10 alerts allowed" }, { status: 400 });
  }

  const alert = await db.alert.create({
    data: { userId: user.id, ...parsed.data },
  });

  return NextResponse.json({ success: true, data: alert }, { status: 201 });
}
