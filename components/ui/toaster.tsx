// components/ui/toaster.tsx
"use client";

import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border shadow-lg p-4 text-sm animate-slide-in",
            toast.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          )}
        >
          {toast.variant === "destructive" ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-500" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs opacity-75">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
