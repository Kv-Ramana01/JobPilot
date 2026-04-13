// app/onboarding/layout.tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clean layout — no sidebar or topbar during onboarding
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {children}
    </div>
  );
}
