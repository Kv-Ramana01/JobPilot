// app/jobs/[id]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { JobDetailFull } from "@/components/jobs/job-detail-full";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id },
    select: { title: true, company: true },
  });
  if (!job) return { title: "Job not found" };
  return { title: `${job.title} at ${job.company}` };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId: clerkId } = await auth();

  const job = await db.job.findUnique({ where: { id } });
  if (!job) notFound();

  // Increment view count (fire and forget)
  db.job.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  // Check if user has saved / applied
  let isSaved = false;
  let isApplied = false;

  if (clerkId) {
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (user) {
      const [savedJob, application] = await Promise.all([
        db.savedJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } }),
        db.application.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } }),
      ]);
      isSaved = !!savedJob;
      isApplied = !!application;
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <JobDetailFull job={{ ...job, isSaved, isApplied }} />
    </div>
  );
}
