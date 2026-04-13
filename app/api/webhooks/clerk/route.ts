import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };
}

function getEmail(data: ClerkUserEvent["data"]) {
  return (
    data.email_addresses?.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address ||
    data.email_addresses?.[0]?.email_address ||
    ""
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

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
      const email = getEmail(data);
      const fullName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

      await db.user.upsert({
        where: { clerkId: data.id },
        update: {
          email,
          updatedAt: new Date(),
        },
        create: {
          clerkId: data.id,
          email,
          profile: {
            create: {
              fullName,
              avatarUrl: data.image_url ?? null,
            },
          },
        },
      });
    }

    if (type === "user.updated") {
      await db.user.upsert({
        where: { clerkId: data.id },
        update: {
          email: getEmail(data),
          updatedAt: new Date(),
        },
        create: {
          clerkId: data.id,
          email: getEmail(data),
        },
      });
    }

    if (type === "user.deleted") {
      await db.user.delete({
        where: { clerkId: data.id },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLERK_WEBHOOK]", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}