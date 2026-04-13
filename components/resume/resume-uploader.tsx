// components/resume/resume-uploader.tsx
"use client";

import { useEffect, useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Trash2, Star, StarOff, ExternalLink, Upload,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Resume } from "@prisma/client";

interface Props {
  onSelect?: (resume: Resume) => void;
  selectedId?: string;
}

export function ResumeUploader({ onSelect, selectedId }: Props) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then((json) => { if (json.success) setResumes(json.data); })
      .finally(() => setLoading(false));
  }, []);

  async function setDefault(id: string) {
    const res = await fetch(`/api/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setResumes(resumes.map((r) => ({ ...r, isDefault: r.id === id })));
      toast({ title: "Default resume updated" });
    }
  }

  async function deleteResume(id: string) {
    if (!confirm("Delete this resume?")) return;
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setResumes(resumes.filter((r) => r.id !== id));
      toast({ title: "Resume deleted" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Resume list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelect?.(r)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all ${
                selectedId === r.id
                  ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
                  : onSelect
                  ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                  : ""
              } ${r.isDefault ? "bg-white dark:bg-gray-900" : "bg-white dark:bg-gray-900"} dark:border-gray-800`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
                <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {r.name}
                  </p>
                  {r.isDefault && (
                    <span className="flex-shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Uploaded {formatDate(r.createdAt)}
                  {r.sizeBytes && ` · ${(r.sizeBytes / 1024).toFixed(0)} KB`}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  title="View resume"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {!r.isDefault && (
                  <button
                    onClick={() => setDefault(r.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-800"
                    title="Set as default"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteResume(r.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {resumes.length === 0 && !showUpload && (
            <div className="rounded-xl border border-dashed py-10 text-center dark:border-gray-700">
              <FileText className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">No resumes yet</p>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {showUpload ? (
        <div className="rounded-xl border dark:border-gray-700 overflow-hidden">
          <UploadDropzone
            endpoint="resumeUploader"
            onClientUploadComplete={(files) => {
              toast({ title: "Resume uploaded!", description: files[0]?.name });
              // Refresh list
              fetch("/api/resumes")
                .then((r) => r.json())
                .then((json) => { if (json.success) setResumes(json.data); });
              setShowUpload(false);
            }}
            onUploadError={(err) => {
              toast({ title: "Upload failed", description: err.message, variant: "destructive" });
            }}
            appearance={{
              container: "border-0 bg-gray-50 dark:bg-gray-800/50 py-8",
              uploadIcon: "text-brand-500",
              label: "text-gray-700 dark:text-gray-300",
              allowedContent: "text-gray-400",
              button: "bg-brand-600 hover:bg-brand-800 text-white ut-ready:bg-brand-600",
            }}
          />
          <div className="px-4 pb-3 text-center">
            <button onClick={() => setShowUpload(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="h-4 w-4" />
          Upload new resume
        </Button>
      )}
    </div>
  );
}
