// components/dashboard/dashboard-stats.tsx
import { Briefcase, BookmarkCheck, CalendarCheck, TrendingUp, XCircle, Gift } from "lucide-react";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";

interface Stats {
  totalApplied: number;
  totalSaved: number;
  totalInterviews: number;
  totalOffers: number;
  totalRejections: number;
  responseRate: number;
}

export function DashboardStats({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: "Applied",
      value: stats.totalApplied,
      displayValue: null as string | null,
      icon: Briefcase,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Saved",
      value: stats.totalSaved,
      displayValue: null as string | null,
      icon: BookmarkCheck,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
    },
    {
      label: "Interviews",
      value: stats.totalInterviews,
      displayValue: null as string | null,
      icon: CalendarCheck,
      color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    },
    {
      label: "Offers",
      value: stats.totalOffers,
      displayValue: null as string | null,
      icon: Gift,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      label: "Rejections",
      value: stats.totalRejections,
      displayValue: null as string | null,
      icon: XCircle,
      color: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
    },
    {
      label: "Response rate",
      value: stats.responseRate,
      displayValue: null as string | null,
      icon: TrendingUp,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950 dark:text-teal-400",
      suffix: "%",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800"
        >
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
            <c.icon className="h-4 w-4" />
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {"suffix" in c && c.suffix ? (
              <><AnimatedCounter value={c.value} />{c.suffix}</>
            ) : (
              <AnimatedCounter value={c.value} />
            )}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
        </div>
      ))}
    </div>
  );
}