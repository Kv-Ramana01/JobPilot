// hooks/use-resumes.ts
"use client";

import { useEffect, useState } from "react";
import type { Resume } from "@prisma/client";

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0];

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/resumes");
      const json = await res.json();
      if (json.success) setResumes(json.data);
    } catch {
      setError("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { resumes, defaultResume, loading, error, refresh };
}
