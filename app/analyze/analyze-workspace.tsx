"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { validateImageFile } from "@/lib/validation";

const CAMPAIGN_OBJECTIVES = [
  { value: "awareness", label: "Awareness" },
  { value: "traffic", label: "Traffic" },
  { value: "conversions", label: "Conversions" },
  { value: "app_installs", label: "App installs" },
];

const fieldInputClass =
  "h-11 w-full rounded-lg border border-foreground/15 bg-transparent px-3.5 text-base text-foreground placeholder:text-foreground/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function AnalyzeWorkspace() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function selectFile(file: File | undefined) {
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    setWarnings([]);
    setIsValidating(true);

    const result = await validateImageFile(file);
    setIsValidating(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    setPreviewUrl(result.previewUrl);
    setFileName(file.name);
    setWarnings(result.warnings);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 sm:px-12">
      <div className="flex w-full max-w-xl flex-col gap-10">
        <Link
          href="/"
          className="text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          ← Back to Verdict
        </Link>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Analyze a creative
          </h1>
          <p className="text-foreground/70">
            Upload your ad and tell us a bit about the campaign.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingOver(false);
              selectFile(event.dataTransfer.files?.[0]);
            }}
            className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              error
                ? "border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20"
                : isDraggingOver
                  ? "border-accent bg-accent/5"
                  : "border-foreground/15 bg-foreground/[0.03] hover:border-accent/50 hover:bg-accent/[0.03]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            {isValidating ? (
              <div className="flex flex-col items-center gap-3 text-foreground/50">
                <UploadIcon className="h-9 w-9 animate-pulse" />
                <span className="font-medium">Checking image…</span>
              </div>
            ) : previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected creative preview"
                  className="max-h-56 rounded-lg object-contain shadow-sm"
                />
                <div className="flex items-center gap-1.5 text-sm text-foreground/60">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  <span>{fileName}</span>
                  <span className="text-foreground/40">· click to replace</span>
                </div>
              </>
            ) : (
              <>
                <UploadIcon
                  className={`h-9 w-9 ${error ? "text-red-400 dark:text-red-500/70" : "text-foreground/40"}`}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    Drop your creative here, or click to browse
                  </span>
                  <span className="text-sm text-foreground/50">
                    JPG, PNG, or WEBP, up to 10MB
                  </span>
                </div>
              </>
            )}
          </div>

          {error && <StatusBanner variant="error" messages={[error]} />}
          {!error && warnings.length > 0 && (
            <StatusBanner variant="warning" messages={warnings} />
          )}
        </div>

        {previewUrl && (
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-col gap-5"
          >
            <Field label="Brand">
              <input
                type="text"
                placeholder="e.g. Acme Running Co."
                className={fieldInputClass}
              />
            </Field>
            <Field label="Website">
              <input
                type="url"
                placeholder="https://..."
                className={fieldInputClass}
              />
            </Field>
            <Field label="Industry">
              <input
                type="text"
                placeholder="e.g. Apparel"
                className={fieldInputClass}
              />
            </Field>
            <Field label="Campaign objective">
              <div className="relative">
                <select
                  defaultValue=""
                  className={`${fieldInputClass} appearance-none pr-9`}
                >
                  <option value="" disabled>
                    Select an objective
                  </option>
                  {CAMPAIGN_OBJECTIVES.map((objective) => (
                    <option key={objective.value} value={objective.value}>
                      {objective.label}
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              </div>
            </Field>
            <Field label="Target audience" hint="optional">
              <input
                type="text"
                placeholder="e.g. Runners aged 25-40"
                className={fieldInputClass}
              />
            </Field>

            <button
              type="submit"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-base font-medium text-white transition-opacity hover:opacity-90"
            >
              Analyze
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-foreground/80">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-foreground/40">
            ({hint})
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 16V4M12 4L7 9M12 4l5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

const STATUS_BANNER_STYLES = {
  error: {
    container:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
    icon: "text-red-500 dark:text-red-400",
    Icon: AlertCircleIcon,
    role: "alert" as const,
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    icon: "text-amber-500 dark:text-amber-400",
    Icon: AlertTriangleIcon,
    role: "status" as const,
  },
};

function StatusBanner({
  variant,
  messages,
}: {
  variant: "error" | "warning";
  messages: string[];
}) {
  const { container, icon, Icon, role } = STATUS_BANNER_STYLES[variant];
  return (
    <div
      role={role}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${container}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${icon}`} />
      <div className="flex flex-col gap-1 text-left">
        {messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}
