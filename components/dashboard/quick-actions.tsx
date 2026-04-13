// components/dashboard/quick-actions.tsx
"use client";

import Link from "next/link";
import { Zap, FileText, Bell, Search } from "lucide-react";

const ACTIONS = [
  {
    href: "/jobs",
    icon: Search,
    label: "Find jobs",
    desc: "Browse 50k+ listings",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    href: "/resume-ai",
    icon: FileText,
    label: "Optimize resume",
    desc: "Boost your ATS score",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  },
  {
    href: "/resume-ai?tab=cover",
    icon: Zap,
    label: "Write cover letter",
    desc: "AI-generated in seconds",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    href: "/alerts",
    icon: Bell,
    label: "Set job alert",
    desc: "Get notified instantly",
    color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-sm hover:-translate-y-0.5 dark:bg-gray-900 dark:border-gray-800"
        >
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${a.color}`}>
            <a.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
