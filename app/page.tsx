// app/page.tsx
import Link from "next/link";
import { ArrowRight, Zap, Globe, Brain, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { value: "50k+", label: "Jobs aggregated" },
  { value: "120+", label: "Countries" },
  { value: "94%", label: "Resume score lift" },
  { value: "3×", label: "Faster applications" },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Global job aggregator",
    desc: "Software jobs from Greenhouse, Lever, Remotive, and 20+ sources in one place.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Brain,
    title: "AI resume optimizer",
    desc: "Gemini scores your resume against each JD, rewrites bullet points, and fills skill gaps.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Zap,
    title: "Smart apply system",
    desc: "One-click apply with autofill, direct links, and Playwright automation where possible.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Target,
    title: "Application tracker",
    desc: "Kanban board to track every application from applied → interview → offer.",
    color: "text-green-600 bg-green-50",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya S.",
    role: "Now SDE-1 at Razorpay",
    avatar: "PS",
    quote:
      "JobPilot's resume AI bumped my ATS score from 61% to 89%. Got a call within 3 days of reapplying.",
  },
  {
    name: "Arjun M.",
    role: "Frontend Intern at Vercel",
    avatar: "AM",
    quote:
      "I used to spend 2 hours per application. Now I apply to 10 jobs in 30 minutes with the autofill.",
  },
  {
    name: "Fatima K.",
    role: "React Dev at Startup",
    avatar: "FK",
    quote:
      "The global job feed is incredible. Found a remote role in Germany I never would have seen otherwise.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm dark:bg-gray-950/90 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">
              JobPilot
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-brand-600 hover:bg-brand-800 text-white">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm text-brand-600 mb-6">
          <Zap className="w-3.5 h-3.5" />
          AI-powered job search for developers
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
          Find your first dev job
          <br />
          <span className="text-brand-600">10× faster</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          JobPilot aggregates software jobs globally, optimizes your resume with
          AI, and helps you apply faster — built for freshers, interns, and
          entry-level developers.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="bg-brand-600 hover:bg-brand-800 text-white px-8 gap-2">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/jobs">
            <Button size="lg" variant="outline" className="px-8">
              Browse jobs
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-brand-600 mb-1">{s.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Everything you need to land the job
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-xl mx-auto">
          Stop juggling five tabs. JobPilot is the single platform that handles
          your entire job search end-to-end.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-6 hover:shadow-sm transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's included */}
      <section className="bg-brand-50 dark:bg-gray-900 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Free to start. Serious features included.
          </h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              "Global job feed with 50k+ listings",
              "AI resume scoring & rewriting",
              "AI cover letter generator",
              "Application kanban tracker",
              "Job alerts via email & in-app",
              "Multi-resume support",
              "Remote & visa filter",
              "One-click apply autofill",
              "Interview preparation AI",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Freshers who made it
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-6"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-600">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t dark:border-gray-800 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to pilot your career?
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Create your free account and start applying smarter today.
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="bg-brand-600 hover:bg-brand-800 text-white px-10 gap-2">
            Get started — it&apos;s free <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t dark:border-gray-800 py-8">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
              <ArrowRight className="w-3 h-3 text-white" />
            </div>
            <span>JobPilot</span>
          </div>
          <div>Built for developers, by developers.</div>
        </div>
      </footer>
    </div>
  );
}
