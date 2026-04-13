// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { NotificationPayload } from "@/types";
import { Prisma } from "@prisma/client";

// GET /api/notifications
export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await db.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return NextResponse.json({
    success: true,
    data: notifications,
    unreadCount,
  });
}

// POST /api/notifications — internal only (called from server services)
export async function POST(req: NextRequest) {
  // Only callable internally (no Clerk auth — uses internal secret)
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json() as NotificationPayload;

  const metaValue: Prisma.InputJsonValue = (payload.meta ?? {}) as Prisma.InputJsonValue;

  const notification = await db.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      meta: metaValue,
    },
  });

  return NextResponse.json({ success: true, data: notification }, { status: 201 });
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { id?: string };

  if (body.id) {
    // Mark single notification as read
    await db.notification.update({
      where: { id: body.id },
      data: { isRead: true },
    });
  } else {
    // Mark all as read
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
