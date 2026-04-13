// app/sitemap.ts
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://jobpilot.dev";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/jobs`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/sign-in`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/sign-up`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic job pages (last 500 active jobs)
  let jobPages: MetadataRoute.Sitemap = [];
  try {
    const jobs = await db.job.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { postedAt: "desc" },
      take: 500,
    });

    jobPages = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: job.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB not available during build — skip
  }

  return [...staticPages, ...jobPages];
}
