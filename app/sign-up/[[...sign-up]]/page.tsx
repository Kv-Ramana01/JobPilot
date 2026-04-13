// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, CheckCircle2 } from "lucide-react";

const BENEFITS = [
  "50k+ software jobs globally",
  "AI resume optimizer with ATS scoring",
  "Auto-apply with Playwright",
  "Application kanban tracker",
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-center bg-brand-600 text-white px-12 py-16 w-[420px] flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 mb-12">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold">JobPilot</span>
        </Link>

        <h2 className="text-3xl font-bold mb-3 leading-snug">
          Your job search,<br />supercharged.
        </h2>
        <p className="text-brand-100 mb-10 text-sm leading-relaxed">
          Join thousands of freshers and developers who found their first role faster with JobPilot.
        </p>

        <ul className="space-y-4">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-brand-200 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">JobPilot</span>
        </Link>

        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "shadow-none border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900",
              headerTitle: "text-gray-900 dark:text-white font-semibold",
              headerSubtitle: "text-gray-500 dark:text-gray-400",
              socialButtonsBlockButton:
                "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
              formFieldInput:
                "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg",
              formButtonPrimary:
                "bg-brand-600 hover:bg-brand-800 text-white rounded-lg normal-case font-medium",
              footerActionLink: "text-brand-600 hover:text-brand-800",
            },
          }}
        />

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-brand-600 hover:text-brand-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
