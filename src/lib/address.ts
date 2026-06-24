// Address parsing helpers. Manually-entered addresses are the source of truth,
// so this is deliberately forgiving and never throws — it only annotates.

export type ParsedAddress = {
  streetAddress: string;
  suburb: string;
  city: string;
  postcode: string | null;
  /** false when there is no leading street number, e.g. "Tui St" */
  addressComplete: boolean;
};

const DEFAULT_SUBURB = "Cliffhaven";
const DEFAULT_CITY = "Rivermouth";
const DEFAULT_POSTCODE = "9012";

// A complete street address begins with a number, optionally with a unit letter
// (e.g. "112A", "65A", "1/23"). "Tui St" has no number → incomplete.
const HAS_STREET_NUMBER = /^\s*\d+\s*[a-zA-Z]?\b|^\s*\d+\s*\/\s*\d+/;

export function hasStreetNumber(raw: string): boolean {
  return HAS_STREET_NUMBER.test(raw.trim());
}

/**
 * Split a raw address into street / suburb / city. If the raw value contains
 * comma-separated parts we use them; otherwise we fall back to the local
 * defaults (this tool is Cliffhaven, Rivermouth specific).
 */
export function parseAddress(raw: string): ParsedAddress {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  let parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Pull out an NZ postcode (4 digits): either a standalone part ("9012") or
  // trailing on a part ("Rivermouth 9012").
  let postcode: string | null = null;
  parts = parts
    .filter((p) => {
      if (/^\d{4}$/.test(p)) {
        postcode = postcode ?? p;
        return false;
      }
      return true;
    })
    .map((p) => {
      const m = p.match(/^(.*?)[\s]+(\d{4})$/);
      if (m) {
        postcode = postcode ?? m[2];
        return m[1].trim();
      }
      return p;
    })
    .filter(Boolean);

  const streetAddress = parts[0] ?? cleaned;
  const suburb = parts[1] ?? DEFAULT_SUBURB;
  const city = parts[2] ?? DEFAULT_CITY;

  return {
    streetAddress,
    suburb,
    city,
    postcode: postcode ?? (suburb.toLowerCase() === "cliffhaven" ? DEFAULT_POSTCODE : null),
    addressComplete: hasStreetNumber(streetAddress),
  };
}

/** Full, geocodable address string (best effort). */
export function fullAddress(parts: {
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  postcode?: string | null;
}): string {
  return [parts.streetAddress, parts.suburb, parts.city, parts.postcode, "New Zealand"]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}
