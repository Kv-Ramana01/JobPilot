// hooks/use-applications.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import type { ApplicationWithJob } from "@/types";
import type { ApplicationStatus } from "@prisma/client";

export function useApplications(statusFilter?: ApplicationStatus) {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/applications?status=${statusFilter}`
        : "/api/applications";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setApplications(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    }
    return res.ok;
  }

  async function deleteApplication(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
    return res.ok;
  }

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "APPLIED").length,
    interview: applications.filter((a) => a.status === "INTERVIEW").length,
    offer: applications.filter((a) => a.status === "OFFER").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
    oa: applications.filter((a) => a.status === "OA").length,
  };

  return {
    applications,
    loading,
    error,
    stats,
    refresh: fetch_,
    updateStatus,
    deleteApplication,
  };
}
