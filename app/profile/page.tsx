// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Plus, User, Briefcase, Globe, Link2 } from "lucide-react";
import { ExperienceLevel } from "@prisma/client";
import { expLabel } from "@/lib/utils";
import type { Metadata } from "next";

const schema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional(),
  country: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  bio: z.string().max(500).optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  githubUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  experienceLevel: z.nativeEnum(ExperienceLevel),
  yearsOfExp: z.coerce.number().min(0).max(50).optional(),
  openToRelocation: z.boolean(),
  openToSponsorship: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      experienceLevel: ExperienceLevel.FRESHER,
      openToRelocation: false,
      openToSponsorship: false,
    },
  });

  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.profile) {
          const p = json.data.profile;
          reset({
            fullName: p.fullName ?? "",
            phone: p.phone ?? "",
            country: p.country ?? "",
            city: p.city ?? "",
            bio: p.bio ?? "",
            linkedinUrl: p.linkedinUrl ?? "",
            githubUrl: p.githubUrl ?? "",
            portfolioUrl: p.portfolioUrl ?? "",
            experienceLevel: p.experienceLevel ?? ExperienceLevel.FRESHER,
            yearsOfExp: p.yearsOfExp ?? 0,
            openToRelocation: p.openToRelocation ?? false,
            openToSponsorship: p.openToSponsorship ?? false,
          });
          setSkills(p.skills ?? []);
          setPreferredRoles(p.preferredRoles ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, skills, preferredRoles }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: "Profile saved!" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 50) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  }

  function addRole() {
    const r = roleInput.trim();
    if (r && !preferredRoles.includes(r)) {
      setPreferredRoles([...preferredRoles, r]);
      setRoleInput("");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your profile is used by AI to personalize cover letters and resume optimization.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal info */}
        <Section icon={User} title="Personal information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName?.message}>
              <Input {...register("fullName")} placeholder="Priya Sharma" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+91 98765 43210" />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register("city")} placeholder="Bengaluru" />
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <Input {...register("country")} placeholder="India" />
            </Field>
          </div>
          <Field label="Bio / headline" error={errors.bio?.message}>
            <Textarea
              {...register("bio")}
              rows={3}
              placeholder="Full-stack developer passionate about React and developer tools. Open to remote roles globally."
              className="resize-none"
            />
          </Field>
        </Section>

        {/* Experience */}
        <Section icon={Briefcase} title="Experience">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Experience level">
              <Select
                value={watch("experienceLevel")}
                onValueChange={(v) => setValue("experienceLevel", v as ExperienceLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ExperienceLevel).map((l) => (
                    <SelectItem key={l} value={l}>{expLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Years of experience">
              <Input
                {...register("yearsOfExp")}
                type="number"
                min={0}
                max={50}
                step={0.5}
                placeholder="0"
              />
            </Field>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label className="text-sm">Skills</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="e.g. React, TypeScript, PostgreSQL"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preferred roles */}
          <div className="space-y-2">
            <Label className="text-sm">Preferred roles</Label>
            <div className="flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                placeholder="e.g. Frontend Developer, SDE-1"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addRole}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {preferredRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preferredRoles.map((r) => (
                  <span
                    key={r}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => setPreferredRoles(preferredRoles.filter((x) => x !== r))}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("openToRelocation")}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Open to relocation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("openToSponsorship")}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Need visa sponsorship</span>
            </label>
          </div>
        </Section>

        {/* Links */}
        <Section icon={Link2} title="Links">
          <div className="space-y-3">
            <Field label="LinkedIn URL" error={errors.linkedinUrl?.message}>
              <Input {...register("linkedinUrl")} placeholder="https://linkedin.com/in/username" />
            </Field>
            <Field label="GitHub URL" error={errors.githubUrl?.message}>
              <Input {...register("githubUrl")} placeholder="https://github.com/username" />
            </Field>
            <Field label="Portfolio / website" error={errors.portfolioUrl?.message}>
              <Input {...register("portfolioUrl")} placeholder="https://yourportfolio.dev" />
            </Field>
          </div>
        </Section>

        <Button
          type="submit"
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-800 text-white gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save profile"}
        </Button>
      </form>
    </div>
  );
}

// ─── Local helpers ────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b dark:border-gray-800">
        <Icon className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
