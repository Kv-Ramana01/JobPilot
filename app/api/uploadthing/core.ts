// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    "text/plain": { maxFileSize: "2MB", maxFileCount: 1 },
    "application/msword": { maxFileSize: "8MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId: clerkId } = await auth();
      if (!clerkId) throw new Error("Unauthorized");

      const user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      if (!user) throw new Error("User not found");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save resume record to DB
      const resume = await db.resume.create({
        data: {
          userId: metadata.userId,
          name: file.name.replace(/\.[^.]+$/, ""), // strip extension
          fileUrl: file.url,
          fileKey: file.key,
          mimeType: file.type,
          sizeBytes: file.size,
          isDefault: false,
        },
      });

      // If this is the user's first resume, make it default
      const count = await db.resume.count({ where: { userId: metadata.userId } });
      if (count === 1) {
        await db.resume.update({ where: { id: resume.id }, data: { isDefault: true } });
        await db.profile.update({
          where: { userId: metadata.userId },
          data: { defaultResumeId: resume.id },
        });
      }

      return { resumeId: resume.id, name: resume.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
