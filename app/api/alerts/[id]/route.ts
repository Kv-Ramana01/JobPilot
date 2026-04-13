// app/api/alerts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(80).optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alert = await db.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const updated = await db.alert.update({
    where: { id },
    data: { ...parsed.data, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alert = await db.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alert.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
