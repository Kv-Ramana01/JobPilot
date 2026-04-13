// app/not-found.tsx
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 mb-6">
        <Zap className="h-8 w-8 text-white" />
      </div>

      <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Page not found
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist. It may have been moved or deleted.
      </p>

      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go home
          </Button>
        </Link>
        <Link href="/jobs">
          <Button className="bg-brand-600 hover:bg-brand-800 text-white">
            Browse jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}
