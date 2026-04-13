// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  BookmarkCheck,
  FileText,
  Bell,
  Settings,
  User,
  ListChecks,
  ChevronRight,
  Zap,
} from "lucide-react";

const NAV = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/jobs", icon: Briefcase, label: "Find jobs" },
      { href: "/applications", icon: ListChecks, label: "Applications" },
      { href: "/resume-ai", icon: FileText, label: "Resume AI" },
    ],
  },
  {
    label: "Organize",
    items: [
      { href: "/saved", icon: BookmarkCheck, label: "Saved jobs" },
      { href: "/alerts", icon: Bell, label: "Job alerts" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", icon: User, label: "Profile" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-white dark:bg-gray-950 dark:border-gray-800">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4 dark:border-gray-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">JobPilot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {NAV.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1 px-4 text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-900/30 dark:text-brand-300"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active ? "text-brand-600 dark:text-brand-400" : ""
                    )}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <ChevronRight className="ml-auto h-3 w-3 text-brand-400" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* In Clerk v7, afterSignOutUrl is configured via clerkMiddleware or
              the NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL env var, not as a prop */}
          <UserButton />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
              My Account
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Manage profile
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}