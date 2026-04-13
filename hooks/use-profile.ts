// hooks/use-profile.ts
"use client";

import { useState, useEffect } from "react";
import type { Profile, Resume } from "@prisma/client";

interface UserData {
  id: string;
  email: string;
  profile: Profile | null;
  resumes: Resume[];
}

export function useProfile() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile");
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function updateProfile(updates: Partial<Profile>) {
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) {
      setData((prev) => prev ? { ...prev, profile: json.data } : prev);
    }
    return json.success;
  }

  const defaultResume = data?.resumes.find((r) => r.isDefault) ?? data?.resumes[0];

  return {
    user: data,
    profile: data?.profile,
    resumes: data?.resumes ?? [],
    defaultResume,
    loading,
    error,
    refresh,
    updateProfile,
  };
}
