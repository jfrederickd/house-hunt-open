// Geocoding enrichment — address → lat/lng via Nominatim (OpenStreetMap).
//
// Free, no API key. We:
//   - cache every lookup in the DB (GeocodeCache) so we never re-geocode the
//     same address, even across restarts;
//   - serialise requests and enforce Nominatim's 1 request/second usage policy;
//   - send a descriptive User-Agent (and optional contact email) as the policy
//     requires.
//
// This is the only enrichment provider wired in; the interface is deliberately
// small so another geocoder could be dropped in later.

import { prisma } from "@/lib/prisma";

export type GeocodeStatus = "ok" | "ambiguous" | "failed";

export type GeocodeResult = {
  lat: number | null;
  lng: number | null;
  displayName: string | null;
  status: GeocodeStatus;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100; // > 1 req/sec, with headroom

// Module-level gate so concurrent calls queue behind each other.
let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function normaliseQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

// Common NZ street-type abbreviations Nominatim matches better when expanded.
const STREET_ABBREV: Record<string, string> = {
  rd: "Road",
  st: "Street",
  tce: "Terrace",
  ave: "Avenue",
  av: "Avenue",
  cres: "Crescent",
  dr: "Drive",
  pl: "Place",
  ln: "Lane",
  cl: "Close",
  gr: "Grove",
  hwy: "Highway",
  qy: "Quay",
};

function expandAbbreviations(q: string): string {
  return q.replace(/\b([A-Za-z]+)\b/g, (word) => {
    const exp = STREET_ABBREV[word.toLowerCase()];
    return exp ?? word;
  });
}

/**
 * Build progressively looser query variants to try when the exact address
 * fails: (1) as given, (2) abbreviations expanded, (3) unit letter stripped
 * (e.g. "10A Example Rd" → "10 Example Road").
 */
function queryCandidates(query: string): string[] {
  const out = new Set<string>();
  out.add(query);
  const expanded = expandAbbreviations(query);
  out.add(expanded);
  // Strip a unit letter directly after the leading street number.
  const noUnit = expanded.replace(/^(\s*\d+)[A-Za-z]\b/, "$1");
  out.add(noUnit);

  // Drop the suburb + postcode parts. Our addresses are
  // "street, suburb, city, postcode, New Zealand"; a wrong default suburb
  // (e.g. a hill street tagged with the wrong suburb) otherwise defeats the lookup.
  const parts = noUnit.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const kept = [parts[0], ...parts.slice(2).filter((p) => !/^\d{3,5}$/.test(p))];
    out.add(kept.join(", "));
  }
  return [...out];
}

async function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  // Keep the chain alive even if this call rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function callNominatim(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "2",
    countrycodes: "nz",
    addressdetails: "0",
  });
  const email = process.env.NOMINATIM_CONTACT_EMAIL?.trim();
  if (email) params.set("email", email);

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": `house-hunt-dashboard/1.0${email ? ` (${email})` : ""}`,
      "Accept-Language": "en-NZ,en",
    },
    // Never cache at the fetch layer — our DB cache is the source of truth.
    cache: "no-store",
  });

  if (!res.ok) {
    return { lat: null, lng: null, displayName: null, status: "failed" };
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!data || data.length === 0) {
    return { lat: null, lng: null, displayName: null, status: "failed" };
  }

  const top = data[0];
  return {
    lat: Number(top.lat),
    lng: Number(top.lon),
    displayName: top.display_name,
    // More than one hit → the address was ambiguous; we still take the first.
    status: data.length > 1 ? "ambiguous" : "ok",
  };
}

/**
 * Geocode an address, using the DB cache first. Returns a failed result for
 * blank input. Never throws — network errors degrade to status "failed".
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const norm = normaliseQuery(query);
  if (!norm) return { lat: null, lng: null, displayName: null, status: "failed" };

  const cached = await prisma.geocodeCache.findUnique({ where: { query: norm } });
  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName,
      status: cached.status as GeocodeStatus,
    };
  }

  // Try the address, then looser variants, until one resolves.
  let result: GeocodeResult = { lat: null, lng: null, displayName: null, status: "failed" };
  for (const candidate of queryCandidates(query)) {
    try {
      const r = await throttle(() => callNominatim(candidate));
      if (r.lat != null && r.lng != null) {
        result = r;
        break;
      }
    } catch {
      // try the next candidate
    }
  }

  // Cache everything, including failures, so we don't hammer Nominatim retrying.
  try {
    await prisma.geocodeCache.create({
      data: {
        query: norm,
        lat: result.lat,
        lng: result.lng,
        displayName: result.displayName,
        status: result.status,
      },
    });
  } catch {
    // A concurrent insert may have won the unique race — ignore.
  }

  return result;
}
