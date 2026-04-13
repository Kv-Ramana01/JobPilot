// app/api/users/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ExperienceLevel, WorkType } from "@prisma/client";

const updateSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  country: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  bio: z.string().max(500).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  skills: z.array(z.string()).max(50).optional(),
  experienceLevel: z.nativeEnum(ExperienceLevel).optional(),
  yearsOfExp: z.number().min(0).max(50).optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredCountries: z.array(z.string()).optional(),
  preferredWorkType: z.array(z.nativeEnum(WorkType)).optional(),
  openToRelocation: z.boolean().optional(),
  openToSponsorship: z.boolean().optional(),
});

// GET /api/users/profile
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      resumes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: user });
}

// PATCH /api/users/profile
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: { ...parsed.data, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true, data: profile });
}
