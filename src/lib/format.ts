// Display formatters. Everything returns an em-dash placeholder for missing
// values so the UI never shows "null"/"NaN".

const DASH = "—";

export function formatNZD(
  value: number | null | undefined,
  opts: { maximumFractionDigits?: number } = {},
): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  }).format(value);
}

/** Compact currency for tight spaces, e.g. "$1.18m", "$845k". */
export function formatNZDCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return new Intl.NumberFormat("en-NZ").format(value);
}

export function formatArea(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return `${formatNumber(value)} m²`;
}

/** A range like "$845,000 – $910,000", or a single value, or dash. */
export function formatRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (low == null && high == null) return DASH;
  if (low != null && high != null) return `${formatNZD(low)} – ${formatNZD(high)}`;
  return formatNZD(low ?? high);
}
