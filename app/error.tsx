// app/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service in production
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 mb-5">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>

      {error.digest && (
        <p className="text-xs text-gray-400 mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      <Button onClick={reset} className="gap-2 bg-brand-600 hover:bg-brand-800 text-white">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
