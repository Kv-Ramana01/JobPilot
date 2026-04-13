// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TopJobs } from "@/components/dashboard/top-jobs";
import { ApplicationStatus } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(clerkId: string) {
  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      applications: {
        include: { job: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      savedJobs: { select: { id: true } },
    },
  });

  if (!user) return null;

  const apps = user.applications;

  // Stats
  const totalApplied = apps.filter((a) => a.status !== ApplicationStatus.SAVED).length;
  const totalInterviews = apps.filter((a) => a.status === ApplicationStatus.INTERVIEW).length;
  const totalOffers = apps.filter((a) => a.status === ApplicationStatus.OFFER).length;
  const totalRejections = apps.filter((a) => a.status === ApplicationStatus.REJECTED).length;
  const responseRate =
    totalApplied > 0
      ? Math.round(((totalInterviews + totalOffers) / totalApplied) * 100)
      : 0;

  // Weekly applications (last 7 days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 6 - i));
    const nextDay = startOfDay(subDays(new Date(), 5 - i));
    return apps.filter(
      (a) =>
        a.appliedAt &&
        a.appliedAt >= day &&
        a.appliedAt < nextDay
    ).length;
  });

  return {
    user,
    stats: {
      totalApplied,
      totalSaved: user.savedJobs.length,
      totalInterviews,
      totalOffers,
      totalRejections,
      responseRate,
    },
    weeklyData,
    recentApps: apps.slice(0, 8),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const data = await getDashboardData(userId);
  if (!data) redirect("/onboarding");

  const { user, stats, weeklyData, recentApps } = data;
  const firstName = user.profile?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Good morning, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s your job search snapshot for today.
        </p>
      </div>

      {/* Stats grid */}
      <DashboardStats stats={stats} />

      {/* Quick actions */}
      <QuickActions />

      {/* Chart + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyChart data={weeklyData} />
        <RecentActivity applications={recentApps} />
      </div>

      {/* Top recommended jobs */}
      <TopJobs userId={user.id} skills={user.profile?.skills ?? []} />
    </div>
  );
}
