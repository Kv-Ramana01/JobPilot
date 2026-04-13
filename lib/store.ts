// lib/store.ts
// Zustand global store — client-side state only

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Job } from "@prisma/client";

type JobWithMeta = Job & { isSaved?: boolean; isApplied?: boolean };

interface JobStore {
  // Recently viewed jobs
  recentJobs: JobWithMeta[];
  addRecentJob: (job: JobWithMeta) => void;
  clearRecentJobs: () => void;

  // Search state
  lastSearch: string;
  setLastSearch: (q: string) => void;
}

export const useJobStore = create<JobStore>()(
  persist(
    (set) => ({
      recentJobs: [],
      addRecentJob: (job) =>
        set((state) => ({
          recentJobs: [
            job,
            ...state.recentJobs.filter((j) => j.id !== job.id),
          ].slice(0, 10),
        })),
      clearRecentJobs: () => set({ recentJobs: [] }),

      lastSearch: "",
      setLastSearch: (q) => set({ lastSearch: q }),
    }),
    {
      name: "jobpilot-jobs",
      partialize: (state) => ({
        recentJobs: state.recentJobs,
        lastSearch: state.lastSearch,
      }),
    }
  )
);

// ─── UI store (non-persisted) ─────────────────────────────────────

interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
}));
