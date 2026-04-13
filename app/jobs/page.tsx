// app/jobs/page.tsx
import { Suspense } from "react";
import { JobsPageClient } from "@/components/jobs/jobs-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Find Jobs" };

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <JobsPageClient />
    </Suspense>
  );
}

function JobsPageSkeleton() {
  return (
    <div className="flex h-full gap-6">
      <div className="flex w-full flex-col gap-4 lg:w-[440px] xl:w-[480px] flex-shrink-0">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      </div>
      <div className="hidden flex-1 lg:block">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
