// app/api/webhooks/clerk/route.ts
// Syncs Clerk user events → our PostgreSQL database

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
export const dynamic = 'force-dynamic';
interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (type === "user.created") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address;

      if (!primaryEmail) {
        return NextResponse.json({ error: "No primary email" }, { status: 400 });
      }

      const fullName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

      await db.user.create({
        data: {
          clerkId: data.id,
          email: primaryEmail,
          profile: {
            create: {
              fullName,
              avatarUrl: data.image_url,
            },
          },
        },
      });
    }

    if (type === "user.updated") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address;

      await db.user.update({
        where: { clerkId: data.id },
        data: {
          ...(primaryEmail && { email: primaryEmail }),
          updatedAt: new Date(),
        },
      });
    }

    if (type === "user.deleted") {
      // Cascade deletes handle related records via Prisma schema
      await db.user.delete({ where: { clerkId: data.id } }).catch(() => {
        // User may not exist — ignore
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Clerk webhook]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
