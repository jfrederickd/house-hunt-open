// Enum-like value sets. SQLite has no native enums, so these are the single
// source of truth for allowed values + their human labels and display colours.

export const PIPELINE_STATUSES = [
  "new",
  "contacted",
  "viewing_scheduled",
  "viewed",
  "offer_made",
  "negotiating",
  "under_contract",
  "purchased",
  "passed",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_STATUS_META: Record<
  PipelineStatus,
  { label: string; /** hex colour for map pins */ color: string }
> = {
  new: { label: "New", color: "#64748b" }, // slate
  contacted: { label: "Contacted", color: "#0ea5e9" }, // sky
  viewing_scheduled: { label: "Viewing scheduled", color: "#6366f1" }, // indigo
  viewed: { label: "Viewed", color: "#8b5cf6" }, // violet
  offer_made: { label: "Offer made", color: "#f59e0b" }, // amber
  negotiating: { label: "Negotiating", color: "#f97316" }, // orange
  under_contract: { label: "Under contract", color: "#14b8a6" }, // teal
  purchased: { label: "Purchased", color: "#22c55e" }, // green
  passed: { label: "Passed", color: "#9ca3af" }, // gray
};

export const ORGANISED_THROUGH = ["phone", "messenger", "other"] as const;
export type OrganisedThrough = (typeof ORGANISED_THROUGH)[number];

export const ORGANISED_THROUGH_LABELS: Record<OrganisedThrough, string> = {
  phone: "Phone",
  messenger: "Messenger",
  other: "Other",
};

export const GEOCODE_STATUSES = ["ok", "ambiguous", "failed", "manual"] as const;
export type GeocodeStatus = (typeof GEOCODE_STATUSES)[number];

export const VIEWING_STATUSES = ["planned", "completed", "cancelled"] as const;
export type ViewingStatus = (typeof VIEWING_STATUSES)[number];

export const PHOTO_SOURCES = ["listing", "streetview", "upload", "other"] as const;
export type PhotoSource = (typeof PHOTO_SOURCES)[number];

// Provenance for individual property fields.
export const FIELD_SOURCES = ["manual", "api", "estimated"] as const;
export type FieldSource = (typeof FIELD_SOURCES)[number];

export const FIELD_SOURCE_LABELS: Record<FieldSource, string> = {
  manual: "Manual",
  api: "API",
  estimated: "Estimated",
};

// Default due-diligence checklist seeded for every property (section 4).
export const DEFAULT_DUE_DILIGENCE = [
  "LIM report",
  "Builder's report",
  "Lawyer engaged",
  "Finance pre-approval confirmed",
  "Registered valuation",
  "S&P agreement reviewed",
] as const;

export function isPipelineStatus(v: string): v is PipelineStatus {
  return (PIPELINE_STATUSES as readonly string[]).includes(v);
}

// ---- Criteria assessment feature -------------------------------------------

export const CRITERION_TYPES = ["verdict", "rating", "choice", "boolean", "text"] as const;
export type CriterionType = (typeof CRITERION_TYPES)[number];

export const CRITERION_TYPE_LABELS: Record<CriterionType, string> = {
  verdict: "Verdict (yes / maybe / no)",
  rating: "Rating (1–5)",
  choice: "Choice (pick one)",
  boolean: "Yes / no toggle",
  text: "Free text",
};

// The 3-point verdict scale used by `verdict` criteria.
export const VERDICT_OPTIONS = [
  { key: "yes", label: "Yes", color: "#22c55e" },
  { key: "maybe", label: "Maybe", color: "#f59e0b" },
  { key: "no", label: "No", color: "#ef4444" },
] as const;
export type VerdictKey = (typeof VERDICT_OPTIONS)[number]["key"];

// Per-assessment flag.
export const ASSESSMENT_FLAGS = [
  { key: "love", label: "Love it", color: "#ec4899" },
  { key: "concern", label: "Concern", color: "#f59e0b" },
  { key: "deal_breaker", label: "Deal-breaker", color: "#ef4444" },
] as const;
export type AssessmentFlag = (typeof ASSESSMENT_FLAGS)[number]["key"];

// Seeded only when no people exist yet; names are editable in settings.
export const DEFAULT_PEOPLE = ["Alex", "Sam"] as const;

// Seeded only when no criteria exist yet; fully editable in settings.
export type SeedCriterion = {
  label: string;
  type: CriterionType;
  options?: string[];
  mustHave?: boolean;
  weight?: number;
};

// ---- Flood risk (from the Christchurch City Council flood viewer) ----------

export const FLOOD_RISK_LEVELS = [
  {
    key: "high",
    label: "High",
    detail: "Within the 1-in-10-year flood extent (≈10% chance per year).",
    badgeClass: "bg-red-100 text-red-800",
    dotClass: "bg-red-500",
  },
  {
    key: "moderate",
    label: "Moderate",
    detail: "Within the 1-in-50-year flood extent (≈2% chance per year).",
    badgeClass: "bg-orange-100 text-orange-800",
    dotClass: "bg-orange-500",
  },
  {
    key: "low",
    label: "Low",
    detail: "Within the 1-in-200-year flood extent (≈0.5% chance per year).",
    badgeClass: "bg-yellow-100 text-yellow-800",
    dotClass: "bg-yellow-500",
  },
  {
    key: "none",
    label: "None",
    detail: "Outside the modelled flood extents.",
    badgeClass: "bg-green-100 text-green-800",
    dotClass: "bg-green-500",
  },
  {
    key: "unmodelled",
    label: "Unmodelled",
    detail: "This area hasn't been modelled by the council.",
    badgeClass: "bg-slate-100 text-slate-700",
    dotClass: "bg-slate-400",
  },
] as const;

export type FloodRisk = (typeof FLOOD_RISK_LEVELS)[number]["key"];

export function floodRiskMeta(key: string | null | undefined) {
  return FLOOD_RISK_LEVELS.find((l) => l.key === key) ?? null;
}

export const DEFAULT_CRITERIA: SeedCriterion[] = [
  { label: "First impression", type: "verdict", weight: 1 },
  { label: "All-day sun / natural light", type: "rating", weight: 1.5 },
  { label: "Indoor–outdoor flow", type: "rating", weight: 1 },
  { label: "Kitchen", type: "rating", weight: 1 },
  { label: "Bathrooms", type: "rating", weight: 1 },
  { label: "Bedroom sizes", type: "rating", weight: 1 },
  { label: "View", type: "choice", options: ["None", "Partial", "Full"], weight: 1 },
  { label: "Sun aspect", type: "choice", options: ["North", "East", "South", "West"], weight: 1 },
  { label: "Garage / off-street parking", type: "boolean", weight: 1 },
  { label: "Outdoor space", type: "rating", weight: 1 },
  { label: "Natural-hazard exposure (rockfall / tsunami / flood)", type: "verdict", mustHave: true, weight: 2 },
  { label: "Warmth (heating + insulation)", type: "rating", weight: 1 },
  { label: "Work needed", type: "choice", options: ["Move-in ready", "Cosmetic", "Major reno"], weight: 1 },
];
