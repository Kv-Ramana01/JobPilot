// app/api/resumes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// PATCH /api/resumes/[id] — set as default or rename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const body = await req.json() as { isDefault?: boolean; name?: string };

  if (body.isDefault) {
    // Unset all other defaults first
    await db.resume.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
    await db.resume.update({ where: { id }, data: { isDefault: true } });
    await db.profile.update({
      where: { userId: user.id },
      data: { defaultResumeId: id },
    });
  }

  if (body.name) {
    await db.resume.update({ where: { id }, data: { name: body.name } });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/resumes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from UploadThing storage
  try {
    await utapi.deleteFiles(resume.fileKey);
  } catch {
    // Non-fatal — DB record still deleted
  }

  await db.resume.delete({ where: { id } });

  // If this was default, set another resume as default
  if (resume.isDefault) {
    const next = await db.resume.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) {
      await db.resume.update({ where: { id: next.id }, data: { isDefault: true } });
      await db.profile.update({ where: { userId: user.id }, data: { defaultResumeId: next.id } });
    }
  }

  return NextResponse.json({ success: true });
}
