// app/resume-ai/page.tsx
"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Zap, Copy, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ResumeAnalysis, CoverLetterResult } from "@/types";
import { cn } from "@/lib/utils";

export default function ResumeAIPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "cover" ? "cover" : "resume";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Resume AI</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Optimize your resume and generate cover letters powered by Gemini AI.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="resume">Resume score</TabsTrigger>
          <TabsTrigger value="cover">Cover letter</TabsTrigger>
          <TabsTrigger value="prep">Interview prep</TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="mt-6">
          <ResumeOptimizer />
        </TabsContent>
        <TabsContent value="cover" className="mt-6">
          <CoverLetterGenerator />
        </TabsContent>
        <TabsContent value="prep" className="mt-6">
          <InterviewPrep />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Resume Optimizer ─────────────────────────────────────────────

function ResumeOptimizer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // For text-based resume files, read as text
    const text = await file.text();
    setResumeText(text);
    toast({ title: "Resume loaded", description: `${file.name} — paste or edit below.` });
  }

  async function analyze() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError("Please provide your resume text and the job description.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "RESUME_SCORE",
          resumeText,
          jobDescription,
          jobTitle: jobTitle || "Software Engineer",
          company: company || "Company",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input panel */}
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h2 className="font-medium text-gray-900 dark:text-white">Your resume</h2>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 mb-3"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload resume (.txt / .md)
            </Button>
            <Textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here…"
              rows={10}
              className="resize-none font-mono text-xs"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800 space-y-4">
          <h2 className="font-medium text-gray-900 dark:text-white">Job details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Job title</Label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Job description</Label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              className="resize-none text-xs"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={analyze}
          disabled={loading}
          className="w-full gap-2 bg-brand-600 hover:bg-brand-800 text-white"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing with Gemini…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Analyze resume
            </>
          )}
        </Button>
      </div>

      {/* Results panel */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
            <div className="text-center">
              <Zap className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">
                Analysis results will appear here
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex h-64 items-center justify-center rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600 mb-3" />
              <p className="text-sm text-gray-500">Gemini is reading your resume…</p>
            </div>
          </div>
        )}

        {result && (
          <>
            {/* Score cards */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreCard label="ATS score" score={result.atsScore} />
              <ScoreCard label="Match score" score={result.matchScore} />
            </div>

            {/* Keywords */}
            <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
              <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Keywords</h3>
              <div className="mb-3">
                <p className="mb-2 text-xs text-red-600 dark:text-red-400 font-medium">Missing ({result.missingKeywords.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((k) => (
                    <span key={k} className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-green-600 dark:text-green-400 font-medium">Present ({result.presentKeywords.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.presentKeywords.map((k) => (
                    <span key={k} className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Improved summary */}
            <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Improved summary</h3>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copyToClipboard(result.improvedSummary)}>
                  <Copy className="h-3 w-3" />Copy
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{result.improvedSummary}</p>
            </div>

            {/* Suggestions */}
            <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
              <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Suggestions</h3>
              <div className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className={cn("rounded-lg border-l-2 p-3", s.priority === "high" ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" : s.priority === "medium" ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-l-gray-300 bg-gray-50 dark:bg-gray-800")}>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{s.suggestion}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Improved bullets */}
            {result.improvedBullets.length > 0 && (
              <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Rewritten bullet points</h3>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
                    onClick={() => copyToClipboard(result.improvedBullets.map(b => `• ${b.improved}`).join("\n"))}>
                    <Copy className="h-3 w-3" />Copy all
                  </Button>
                </div>
                <div className="space-y-4">
                  {result.improvedBullets.map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-xs text-gray-400 line-through">{b.original}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">→ {b.improved}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{b.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const bg = score >= 80 ? "bg-green-50 dark:bg-green-950/30" : score >= 60 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
  return (
    <div className={cn("rounded-xl border p-4 text-center", bg)}>
      <p className={cn("text-4xl font-bold", color)}>{score}%</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ─── Cover Letter Generator ───────────────────────────────────────

function CoverLetterGenerator() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [tone, setTone] = useState<"confident" | "formal" | "friendly" | "concise" | "detailed">("confident");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);

  async function generate() {
    if (!jobTitle || !company || !jobDesc) {
      toast({ title: "Missing fields", description: "Fill in job title, company, and description.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "COVER_LETTER", jobTitle, company, jobDescription: jobDesc, tone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to generate.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="font-medium text-gray-900 dark:text-white">Cover letter details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Job title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Stripe" className="h-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confident">Confident</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Job description</Label>
          <Textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Paste job description…" rows={10} className="resize-none text-xs" />
        </div>
        <Button onClick={generate} disabled={loading} className="w-full gap-2 bg-brand-600 hover:bg-brand-800 text-white">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Zap className="h-4 w-4" /> Generate cover letter</>}
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
        {result ? (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Subject: {result.subject}</h3>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigator.clipboard.writeText(result.body) && toast({ title: "Copied!" })}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans leading-relaxed">{result.body}</pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center">
            <div className="text-center">
              <Zap className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Your cover letter will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Interview Prep ───────────────────────────────────────────────

function InterviewPrep() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<{question: string; category: string; difficulty: string; suggestedAnswer: string; tips: string[]}[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "INTERVIEW_PREP", jobTitle, jobDescription: jobDesc, skills: skills.split(",").map(s => s.trim()).filter(Boolean) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setQuestions(json.data);
    } catch {
      toast({ title: "Error", description: "Failed to generate questions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const DIFF_COLOR: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", hard: "bg-red-100 text-red-700" };
  const CAT_COLOR: Record<string, string> = { technical: "bg-blue-100 text-blue-700", behavioral: "bg-purple-100 text-purple-700", situational: "bg-teal-100 text-teal-700", culture: "bg-pink-100 text-pink-700" };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="mb-4 font-medium text-gray-900 dark:text-white">Generate interview questions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Job title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Frontend Developer" className="h-9" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Key skills (comma-separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Node.js" className="h-9" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs">Job description (optional)</Label>
          <Textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Paste JD for role-specific questions…" rows={4} className="resize-none text-xs" />
        </div>
        <Button onClick={generate} disabled={loading} className="mt-4 gap-2 bg-brand-600 hover:bg-brand-800 text-white">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Zap className="h-4 w-4" /> Generate 8 questions</>}
        </Button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                <span className="flex-shrink-0 text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</p>
                  <div className="mt-1.5 flex gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", DIFF_COLOR[q.difficulty])}>{q.difficulty}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CAT_COLOR[q.category])}>{q.category}</span>
                  </div>
                </div>
              </button>
              {openIndex === i && (
                <div className="border-t px-4 pb-4 pt-3 dark:border-gray-800">
                  <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Suggested answer</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{q.suggestedAnswer}</p>
                  {q.tips.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tips</p>
                      {q.tips.map((t, j) => (
                        <p key={j} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500 mt-0.5" />
                          {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
