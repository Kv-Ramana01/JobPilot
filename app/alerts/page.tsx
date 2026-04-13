// app/alerts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import type { Alert } from "@prisma/client";

const alertSchema = z.object({
  name: z.string().min(1).max(80),
  keywords: z.string().optional(),
  remote: z.boolean().default(false),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).default("DAILY"),
  emailEnabled: z.boolean().default(true),
});

type AlertForm = z.infer<typeof alertSchema>;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AlertForm>({ resolver: zodResolver(alertSchema) });

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((json) => { if (json.success) setAlerts(json.data); })
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(data: AlertForm) {
    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          keywords: data.keywords?.split(",").map((k) => k.trim()).filter(Boolean) ?? [],
          remote: data.remote,
          frequency: data.frequency,
          emailEnabled: data.emailEnabled,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAlerts([json.data, ...alerts]);
      reset();
      setShowForm(false);
      toast({ title: "Alert created!", description: "We'll notify you when matching jobs appear." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not create alert.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function toggleAlert(id: string, isActive: boolean) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a)));
    }
  }

  async function deleteAlert(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts(alerts.filter((a) => a.id !== id));
      toast({ title: "Alert deleted" });
    }
  }

  const FREQ_LABEL: Record<string, string> = { INSTANT: "Instant", DAILY: "Daily digest", WEEKLY: "Weekly digest" };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Job alerts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get notified when matching jobs appear.
          </p>
        </div>
        <Button
          className="gap-2 bg-brand-600 hover:bg-brand-800 text-white"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
          New alert
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800 animate-fade-in">
          <h2 className="mb-4 font-medium text-gray-900 dark:text-white">Create alert</h2>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Alert name</Label>
              <Input {...register("name")} placeholder='e.g. "Remote React jobs"' />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Keywords (comma-separated)</Label>
              <Input {...register("keywords")} placeholder="React, TypeScript, frontend" />
              <p className="text-xs text-gray-400">Leave empty to match all software jobs.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select
                  value={watch("frequency") ?? "DAILY"}
                  onValueChange={(v) => setValue("frequency", v as "INSTANT" | "DAILY" | "WEEKLY")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTANT">Instant</SelectItem>
                    <SelectItem value="DAILY">Daily digest</SelectItem>
                    <SelectItem value="WEEKLY">Weekly digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Options</Label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("remote")} className="h-4 w-4 rounded" />
                    <span className="text-sm">Remote only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("emailEnabled")} defaultChecked className="h-4 w-4 rounded" />
                    <span className="text-sm">Email notifications</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={creating} className="bg-brand-600 hover:bg-brand-800 text-white gap-2">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create alert"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 dark:border-gray-700">
          <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No alerts yet. Create one to get notified.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-4 rounded-xl border bg-white p-4 transition-opacity dark:bg-gray-900 dark:border-gray-800 ${
                !alert.isActive ? "opacity-50" : ""
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                alert.isActive ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800"
              }`}>
                <Bell className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{alert.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {alert.keywords.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {alert.keywords.join(", ")}
                    </p>
                  )}
                  <span className="text-xs text-gray-400">·</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {FREQ_LABEL[alert.frequency]}
                    {alert.emailEnabled && " · email"}
                  </p>
                  {alert.lastSentAt && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last sent {new Date(alert.lastSentAt).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  title={alert.isActive ? "Pause alert" : "Resume alert"}
                >
                  {alert.isActive ? (
                    <ToggleRight className="h-5 w-5 text-brand-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  title="Delete alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
