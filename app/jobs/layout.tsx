// app/jobs/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

// Jobs page is public but still shows the app shell when logged in
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // If not logged in, render without sidebar
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
