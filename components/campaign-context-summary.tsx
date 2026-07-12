import type {
  CampaignObjective,
  CampaignType,
  CreativeContext,
  Occasion,
} from "@/lib/verdict/types";

const CAMPAIGN_OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  awareness: "Awareness",
  traffic: "Traffic",
  conversions: "Conversions",
  app_installs: "App installs",
};

const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  evergreen: "Evergreen",
  promotion: "Promotion",
  sale: "Sale",
  product_launch: "Product Launch",
  holiday: "Holiday",
  seasonal: "Seasonal",
  retargeting: "Retargeting",
  brand_awareness: "Brand Awareness",
  other: "Other",
};

const OCCASION_LABELS: Record<Occasion, string> = {
  none: "None",
  black_friday: "Black Friday",
  cyber_monday: "Cyber Monday",
  christmas: "Christmas",
  valentines_day: "Valentine's Day",
  mothers_day: "Mother's Day",
  fathers_day: "Father's Day",
  back_to_school: "Back to School",
  new_year: "New Year",
  summer_sale: "Summer Sale",
  spring_sale: "Spring Sale",
  other: "Other",
};

// The submitted inputs an analysis used, surfaced as a quiet confirmation
// strip — not a new report section. See UI_SPEC.md's "Campaign context
// summary". Website is deliberately excluded (per PRODUCT_SPEC.md, it's
// not yet meaningfully used by the engine).
export function CampaignContextSummary({ context }: { context: CreativeContext }) {
  const items = buildContextItems(context);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, value }) => (
        <span
          key={label}
          className="rounded-full border border-foreground/15 px-2.5 py-1 text-xs text-foreground/60"
        >
          {label}: <span className="text-foreground/80">{value}</span>
        </span>
      ))}
    </div>
  );
}

export function buildContextItems(
  context: CreativeContext,
): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];

  if (context.brandName) items.push({ label: "Brand", value: context.brandName });
  items.push({ label: "Objective", value: CAMPAIGN_OBJECTIVE_LABELS[context.campaignObjective] });
  items.push({ label: "Type", value: CAMPAIGN_TYPE_LABELS[context.campaignType] });
  if (context.occasion && context.occasion !== "none") {
    items.push({ label: "Occasion", value: OCCASION_LABELS[context.occasion] });
  }
  if (context.targetAudience) {
    items.push({ label: "Audience", value: context.targetAudience });
  }

  return items;
}
