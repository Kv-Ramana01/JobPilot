// app/settings/page.tsx
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Moon, Sun, Monitor, Trash2, LogOut,
  Shield, Palette, BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (!confirm("Are you sure? This will permanently delete all your data.")) return;
    setDeleting(true);
    try {
      await fetch("/api/users/profile", { method: "DELETE" });
      await user?.delete();
      // In Clerk v7, signOut accepts options object with redirectUrl
      await signOut({ redirectUrl: "/" });
    } catch {
      toast({ title: "Error", description: "Could not delete account.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    // In Clerk v7, signOut accepts options object with redirectUrl
    await signOut({ redirectUrl: "/" });
  }

  const THEMES = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="space-y-6 max-w-xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your preferences and account.
        </p>
      </div>

      {/* Appearance */}
      <SettingsSection icon={Palette} title="Appearance">
        <div>
          <Label className="text-sm mb-3 block">Theme</Label>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                  theme === t.id
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                )}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection icon={BellRing} title="Notifications">
        <div className="space-y-4">
          <Toggle
            label="Email notifications"
            description="Receive job alerts and updates by email"
            checked={emailNotifs}
            onChange={setEmailNotifs}
          />
          <Toggle
            label="In-app notifications"
            description="Show notifications inside JobPilot"
            checked={inAppNotifs}
            onChange={setInAppNotifs}
          />
        </div>
      </SettingsSection>

      {/* Account */}
      <SettingsSection icon={Shield} title="Account">
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>

          <div className="pt-2 border-t dark:border-gray-700">
            <p className="text-xs text-red-500 mb-2">Danger zone</p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete account and all data"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
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

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2",
          checked ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}