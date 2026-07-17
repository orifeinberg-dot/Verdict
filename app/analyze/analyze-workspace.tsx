"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateImageFile } from "@/lib/validation";
import { submitCreative } from "@/app/actions/submit-creative";
import { reportStore } from "@/lib/report-store";
import type { CreativeContext, CreativeImage } from "@/lib/verdict/types";

const CAMPAIGN_OBJECTIVES = [
  { value: "awareness", label: "Awareness" },
  { value: "traffic", label: "Traffic" },
  { value: "conversions", label: "Conversions" },
  { value: "app_installs", label: "App installs" },
];

const CAMPAIGN_TYPES = [
  { value: "evergreen", label: "Evergreen" },
  { value: "promotion", label: "Promotion" },
  { value: "product_launch", label: "Product Launch" },
  { value: "retargeting", label: "Retargeting" },
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "other", label: "Other" },
];

// Only these Campaign Types plausibly tie to a specific date/event — see
// PRODUCT_SPEC.md's "Occasion".
const OCCASION_CAMPAIGN_TYPES = new Set(["promotion", "other"]);

const OCCASIONS = [
  { value: "none", label: "None" },
  { value: "black_friday", label: "Black Friday" },
  { value: "cyber_monday", label: "Cyber Monday" },
  { value: "christmas", label: "Christmas" },
  { value: "valentines_day", label: "Valentine's Day" },
  { value: "mothers_day", label: "Mother's Day" },
  { value: "fathers_day", label: "Father's Day" },
  { value: "back_to_school", label: "Back to School" },
  { value: "new_year", label: "New Year" },
  { value: "summer_sale", label: "Summer Sale" },
  { value: "spring_sale", label: "Spring Sale" },
  { value: "other", label: "Other" },
];

const ANALYSIS_MESSAGES = [
  "Reading creative...",
  "Evaluating hierarchy...",
  "Reviewing CTA...",
  "Assessing clarity...",
  "Preparing Verdict...",
];

const MESSAGE_INTERVAL_MS = 900;
const FINAL_MESSAGE_HOLD_MS = 1100;

const fieldInputClass =
  "h-14 md:h-11 w-full rounded-lg border border-foreground/15 bg-transparent px-3.5 text-base text-foreground placeholder:text-foreground/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function AnalyzeWorkspace() {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Tracked purely to decide whether Occasion should render — the rest of
  // the form stays uncontrolled and is read via FormData on submit.
  const [campaignType, setCampaignType] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const imageDimensionsRef = useRef<{ width: number; height: number } | null>(
    null,
  );
  const pendingSubmissionRef = useRef<{
    promise: ReturnType<typeof submitCreative>;
    image: CreativeImage;
    context: CreativeContext;
  } | null>(null);

  useEffect(() => {
    if (!isAnalyzing) return;

    const isLastMessage = messageIndex === ANALYSIS_MESSAGES.length - 1;
    const timeout = setTimeout(
      async () => {
        if (!isLastMessage) {
          setMessageIndex((index) => index + 1);
          return;
        }

        const pending = pendingSubmissionRef.current;
        if (!pending) return;

        const result = await pending.promise;

        if (result.status === "error") {
          setIsAnalyzing(false);
          setSubmitError(result.message);
          return;
        }

        try {
          const id = reportStore.save({
            report: result.report,
            image: pending.image,
            context: pending.context,
          });
          router.push(`/verdict/${id}`);
        } catch {
          setIsAnalyzing(false);
          setSubmitError(
            "We couldn't save this report — your browser storage might be full. Try again, or use a smaller image.",
          );
        }
      },
      isLastMessage ? FINAL_MESSAGE_HOLD_MS : MESSAGE_INTERVAL_MS,
    );

    return () => clearTimeout(timeout);
  }, [isAnalyzing, messageIndex, router]);

  async function selectFile(file: File | undefined) {
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    setWarnings([]);
    setSubmitError(null);
    selectedFileRef.current = null;
    imageDimensionsRef.current = null;
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
    selectedFileRef.current = file;
    imageDimensionsRef.current = { width: result.width, height: result.height };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = selectedFileRef.current;
    const dimensions = imageDimensionsRef.current;
    if (!file || !dimensions) return;

    const formData = new FormData(event.currentTarget);
    const context: CreativeContext = {
      brandName: String(formData.get("brandName") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      industry: String(formData.get("industry") ?? "").trim(),
      campaignObjective: String(
        formData.get("campaignObjective") ?? "",
      ) as CreativeContext["campaignObjective"],
      campaignType: String(
        formData.get("campaignType") ?? "",
      ) as CreativeContext["campaignType"],
      // Absent from FormData entirely when the field is hidden (not
      // rendered) — same default as when it's visibly left at "None".
      occasion: String(
        formData.get("occasion") ?? "none",
      ) as CreativeContext["occasion"],
      targetAudience:
        String(formData.get("targetAudience") ?? "").trim() || undefined,
    };

    setSubmitError(null);

    let dataUrl: string;
    try {
      // Store a downscaled, recompressed copy rather than the original —
      // a full-resolution PNG can exceed sessionStorage's per-origin quota
      // on its own once base64-encoded. See ARCHITECTURE.md's "Image
      // handling" section.
      dataUrl = await resizeImageForStorage(file);
    } catch {
      setSubmitError(
        "We couldn't process that image for upload. Try a different file.",
      );
      return;
    }

    setMessageIndex(0);
    setIsAnalyzing(true);

    const image: CreativeImage = {
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
    };

    pendingSubmissionRef.current = {
      promise: submitCreative(image, context),
      image,
      context,
    };
  }

  if (isAnalyzing) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-16 sm:px-12">
        <AnalysisLoadingState
          previewUrl={previewUrl}
          messageIndex={messageIndex}
        />
      </main>
    );
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
            className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {submitError && (
              <StatusBanner variant="error" messages={[submitError]} />
            )}
            <Field label="Brand">
              <input
                type="text"
                name="brandName"
                required
                placeholder="e.g. Acme Running Co."
                className={fieldInputClass}
              />
            </Field>
            <Field label="Website" hint="optional">
              <input
                type="url"
                name="website"
                placeholder="https://..."
                className={fieldInputClass}
              />
            </Field>
            <Field label="Industry">
              <input
                type="text"
                name="industry"
                required
                placeholder="e.g. Apparel"
                className={fieldInputClass}
              />
            </Field>
            <div className="flex flex-col gap-5">
              <span className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
                Campaign context
              </span>
              <Field label="Campaign objective" helperText="What you're optimizing for.">
                <div className="relative">
                  <select
                    name="campaignObjective"
                    required
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
              <Field label="Campaign type" helperText="The kind of campaign this is.">
                <div className="relative">
                  <select
                    name="campaignType"
                    required
                    defaultValue=""
                    onChange={(event) => setCampaignType(event.target.value)}
                    className={`${fieldInputClass} appearance-none pr-9`}
                  >
                    <option value="" disabled>
                      Select a campaign type
                    </option>
                    {CAMPAIGN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                </div>
              </Field>
              {OCCASION_CAMPAIGN_TYPES.has(campaignType) && (
                <Field label="Occasion" hint="optional">
                  <div className="relative">
                    <select
                      name="occasion"
                      defaultValue="none"
                      className={`${fieldInputClass} appearance-none pr-9`}
                    >
                      {OCCASIONS.map((occasion) => (
                        <option key={occasion.value} value={occasion.value}>
                          {occasion.label}
                        </option>
                      ))}
                    </select>
                    <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                  </div>
                </Field>
              )}
            </div>
            <Field label="Target audience" hint="optional">
              <input
                type="text"
                name="targetAudience"
                placeholder="e.g. Runners aged 25-40"
                className={fieldInputClass}
              />
            </Field>

            <button
              type="submit"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-base font-medium text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Analyze
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function AnalysisLoadingState({
  previewUrl,
  messageIndex,
}: {
  previewUrl: string | null;
  messageIndex: number;
}) {
  return (
    <div className="flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-10 py-16 text-center">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-0 rounded-3xl bg-accent/20 blur-2xl animate-verdict-glow" />
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.03] shadow-sm">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover opacity-80"
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent animate-verdict-scan" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p
          key={messageIndex}
          className="text-lg font-medium text-foreground animate-verdict-fade-slide"
        >
          {ANALYSIS_MESSAGES[messageIndex]}
        </p>
        <div className="flex gap-1.5">
          {ANALYSIS_MESSAGES.map((message, index) => (
            <span
              key={message}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                index <= messageIndex ? "bg-accent" : "bg-foreground/15"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  helperText,
  children,
}: {
  label: string;
  hint?: string;
  helperText?: string;
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
      {helperText && (
        <span className="text-xs text-foreground/50">{helperText}</span>
      )}
    </label>
  );
}

const STORED_IMAGE_MAX_DIMENSION = 1600;
const STORED_IMAGE_QUALITY = 0.85;

// Downscales and recompresses to JPEG before the image ever reaches
// sessionStorage or the Server Action — a full-resolution upload (up to
// 10MB, ~13.3MB as base64) can exceed sessionStorage's per-origin quota
// on its own. Marker positions are percentage-based (UI_SPEC.md), so
// re-encoding doesn't affect annotation accuracy.
function resizeImageForStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        1,
        STORED_IMAGE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      URL.revokeObjectURL(objectUrl);

      if (!context) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", STORED_IMAGE_QUALITY));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image for resizing"));
    };
    image.src = objectUrl;
  });
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
