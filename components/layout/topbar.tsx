// components/layout/topbar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/layout/notification-bell";

export function TopBar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-6 dark:bg-gray-950 dark:border-gray-800">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, companies, skills..."
            className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <NotificationBell />
      </div>
    </header>
  );
}
