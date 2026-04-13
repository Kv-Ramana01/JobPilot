// hooks/use-toast.ts
// Minimal toast hook — compatible with ShadCN Toaster component

import { useState, useEffect, useCallback } from "react";

type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastInput = Omit<Toast, "id">;

// Module-level state so toast() can be called from anywhere
let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function dispatch(toast: Toast) {
  toasts = [...toasts, toast];
  listeners.forEach((l) => l(toasts));
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l(toasts));
}

let counter = 0;

export function toast(input: ToastInput) {
  const id = String(++counter);
  const duration = input.duration ?? 4000;

  dispatch({ ...input, id });

  setTimeout(() => dismiss(id), duration);
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.push(setCurrentToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  return {
    toasts: currentToasts,
    toast,
    dismiss,
  };
}
