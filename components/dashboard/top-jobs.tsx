// components/dashboard/top-jobs.tsx
import { db } from "@/lib/db";
import Link from "next/link";
import { JobCard } from "@/components/jobs/job-card";

interface Props {
  userId: string;
  skills: string[];
}

export async function TopJobs({ userId, skills }: Props) {
  // Simple skill-match: find jobs that share at least one skill with the user
  const jobs = await db.job.findMany({
    where: {
      isActive: true,
      ...(skills.length > 0
        ? { skills: { hasSome: skills } }
        : {}),
    },
    orderBy: { postedAt: "desc" },
    take: 4,
  });

  if (jobs.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Recommended for you
        </h3>
        <Link
          href="/jobs"
          className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} compact />
        ))}
      </div>
    </div>
  );
}
