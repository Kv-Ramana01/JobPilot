// app/dashboard/ai-history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, FileText, MessageSquare, BookOpen, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiRecord {
  id: string;
  type: string;
  jobTitle: string | null;
  company: string | null;
  createdAt: string;
  result: {
    atsScore?: number;
    matchScore?: number;
    tone?: string;
  };
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RESUME_SCORE: { label: "Resume analysis", icon: FileText, color: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" },
  COVER_LETTER: { label: "Cover letter", icon: MessageSquare, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  INTERVIEW_PREP: { label: "Interview prep", icon: BookOpen, color: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" },
  SKILLS_GAP: { label: "Skills gap", icon: Target, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
};

export default function AiHistoryPage() {
  const [history, setHistory] = useState<AiRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((json) => { if (json.success) setHistory(json.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">AI history</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All your Gemini AI sessions — resume analyses, cover letters, interview prep.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 dark:border-gray-700">
          <Zap className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No AI sessions yet.</p>
          <p className="text-xs text-gray-400 mt-1">Go to Resume AI to get started.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((h) => {
            const meta = TYPE_META[h.type] ?? { label: h.type, icon: Zap, color: "bg-gray-100 text-gray-600" };
            const Icon = meta.icon;

            return (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800"
              >
                <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", meta.color)}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                  {(h.jobTitle || h.company) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[h.jobTitle, h.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  {h.type === "RESUME_SCORE" && h.result.atsScore !== undefined && (
                    <div className={cn(
                      "text-sm font-semibold mb-0.5",
                      h.result.atsScore >= 80 ? "text-green-600" : h.result.atsScore >= 60 ? "text-amber-600" : "text-red-600"
                    )}>
                      {h.result.atsScore}% ATS
                    </div>
                  )}
                  {h.type === "COVER_LETTER" && h.result.tone && (
                    <div className="text-xs text-gray-500 capitalize mb-0.5">{h.result.tone} tone</div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
