import type { Verdict } from "@/lib/verdict/types";

const VERDICT_META: Record<Verdict, { label: string; colorClass: string; bgClass: string }> = {
  launch: {
    label: "Launch",
    colorClass: "text-verdict-launch",
    bgClass: "bg-verdict-launch/10",
  },
  test: {
    label: "Test",
    colorClass: "text-verdict-test",
    bgClass: "bg-verdict-test/10",
  },
  dont_launch: {
    label: "Don't Launch",
    colorClass: "text-verdict-dont-launch",
    bgClass: "bg-verdict-dont-launch/10",
  },
};

// The product's one intentional "reveal" moment — see UI_SPEC.md's
// "Verdict badge" bullet. Reuses the fade-slide treatment already used
// for the analyzing-state status lines, so the motion vocabulary stays
// consistent across the product rather than introducing a new one here.
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = VERDICT_META[verdict];

  return (
    <div className="animate-verdict-fade-slide flex flex-col gap-2">
      <span
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase ${meta.bgClass} ${meta.colorClass}`}
      >
        Verdict
      </span>
      <h1 className={`text-4xl font-semibold tracking-tight sm:text-5xl ${meta.colorClass}`}>
        {meta.label}
      </h1>
    </div>
  );
}
