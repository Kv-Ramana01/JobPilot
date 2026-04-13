// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-gray-900 dark:text-white">JobPilot</span>
      </Link>

      <SignIn
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
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-brand-600 hover:text-brand-800 font-medium">
          Sign up free
        </Link>
      </p>
    </div>
  );
}