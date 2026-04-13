// app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, ArrowRight, Loader2, X } from "lucide-react";
import { ExperienceLevel } from "@prisma/client";
import { expLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const POPULAR_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Python", "Go", "Java", "PostgreSQL", "MongoDB",
  "AWS", "Docker", "Kubernetes", "GraphQL", "REST",
  "React Native", "Flutter", "Swift", "Kotlin", "Vue.js",
];

const POPULAR_ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Software Engineer", "SDE-1", "Intern", "DevOps Engineer",
  "Mobile Developer", "Data Engineer", "ML Engineer",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [expLevel, setExpLevel] = useState<ExperienceLevel>(ExperienceLevel.FRESHER);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  function toggleSkill(s: string) {
    setSelectedSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function addCustomSkill() {
    const s = customSkill.trim();
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills([...selectedSkills, s]);
      setCustomSkill("");
    }
  }

  function toggleRole(r: string) {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: user?.fullName,
          country,
          city,
          experienceLevel: expLevel,
          skills: selectedSkills,
          preferredRoles: selectedRoles,
          linkedinUrl,
          githubUrl,
        }),
      });
      if (!res.ok) throw new Error("Profile save failed");
      router.push("/dashboard");
    } catch {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const STEPS = [
    { num: 1, label: "Location & level" },
    { num: 2, label: "Your skills" },
    { num: 3, label: "Preferred roles" },
    { num: 4, label: "Links" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-gray-900 dark:text-white">JobPilot</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step === s.num
                  ? "bg-brand-600 text-white"
                  : step > s.num
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {step > s.num ? "✓" : s.num}
              </div>
              <span className="hidden sm:block text-[10px] text-gray-400 whitespace-nowrap">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-16 transition-colors ${step > s.num ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 dark:bg-gray-900 dark:border-gray-800">

        {/* Step 1: Location & level */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Where are you based?</h2>
              <p className="mt-1 text-sm text-gray-500">This helps us show relevant jobs and salary ranges.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Experience level</Label>
              <Select value={expLevel} onValueChange={(v) => setExpLevel(v as ExperienceLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ExperienceLevel).map((l) => (
                    <SelectItem key={l} value={l}>{expLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">What are your skills?</h2>
              <p className="mt-1 text-sm text-gray-500">Pick the ones you're comfortable with.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                    selectedSkills.includes(s)
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                placeholder="Add another skill…"
                className="flex-1"
              />
              <Button variant="outline" onClick={addCustomSkill} type="button">Add</Button>
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.filter((s) => !POPULAR_SKILLS.includes(s)).map((s) => (
                  <span key={s} className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {s}
                    <button onClick={() => toggleSkill(s)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">{selectedSkills.length} selected</p>
          </div>
        )}

        {/* Step 3: Preferred roles */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">What roles are you targeting?</h2>
              <p className="mt-1 text-sm text-gray-500">Select everything that fits.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                    selectedRoles.includes(r)
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Links */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add your links</h2>
              <p className="mt-1 text-sm text-gray-500">AI will use these to personalize your applications. Optional but recommended.</p>
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
            </div>
            <div className="space-y-1.5">
              <Label>GitHub URL</Label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
            </div>
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
              You can always update these in your profile settings.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="gap-2 bg-brand-600 hover:bg-brand-800 text-white"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="gap-2 bg-brand-600 hover:bg-brand-800 text-white"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Start exploring <ArrowRight className="h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Skip for now
      </button>
    </div>
  );
}
