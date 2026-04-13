// app/applications/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: col < 2 ? 3 : 1 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
