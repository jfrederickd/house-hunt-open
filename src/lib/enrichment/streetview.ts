// Street View Static API enrichment — an OPTIONAL exterior-image fallback.
//
// Disabled by default. Requires STREETVIEW_ENABLED="true" AND a
// GOOGLE_MAPS_API_KEY (obtaining one may require a Google Cloud billing
// account — see README). The key is only ever used server-side; the browser
// gets images via our proxy route, never the keyed Google URL.

const STATIC_URL = "https://maps.googleapis.com/maps/api/streetview";
const META_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";

export function isStreetViewEnabled(): boolean {
  return process.env.STREETVIEW_ENABLED === "true" && !!process.env.GOOGLE_MAPS_API_KEY?.trim();
}

/** Server-side keyed image URL — for use only inside the proxy route. */
export function streetViewImageUrl(
  lat: number,
  lng: number,
  opts: { size?: string; fov?: number } = {},
): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;
  const params = new URLSearchParams({
    size: opts.size ?? "640x400",
    location: `${lat},${lng}`,
    fov: String(opts.fov ?? 80),
    return_error_code: "true",
    key,
  });
  return `${STATIC_URL}?${params.toString()}`;
}

export type StreetViewStatus = "OK" | "ZERO_RESULTS" | "DISABLED" | "ERROR";

/**
 * Check the (free) metadata endpoint so we don't store a "no imagery here"
 * grey placeholder. Returns the imagery status.
 */
export async function checkStreetViewAvailable(lat: number, lng: number): Promise<StreetViewStatus> {
  if (!isStreetViewEnabled()) return "DISABLED";
  const key = process.env.GOOGLE_MAPS_API_KEY!.trim();
  const params = new URLSearchParams({ location: `${lat},${lng}`, key });
  try {
    const res = await fetch(`${META_URL}?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return "ERROR";
    const data = (await res.json()) as { status?: string };
    if (data.status === "OK") return "OK";
    if (data.status === "ZERO_RESULTS") return "ZERO_RESULTS";
    return "ERROR";
  } catch {
    return "ERROR";
  }
}
