// Domain helpers for the Property model: provenance (field sources), derived
// values (best estimate, $/m²), and JSON (de)serialisation of the loosely-typed
// JSON columns.

import type { Property, Photo } from "@/generated/prisma/client";
import type { FieldSource } from "@/lib/enums";

export type FieldSourceMap = Record<string, FieldSource>;
export type SourceUrlMap = Record<string, string>;

export function parseFieldSources(json: string | null | undefined): FieldSourceMap {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? (obj as FieldSourceMap) : {};
  } catch {
    return {};
  }
}

export function parseSourceUrls(json: string | null | undefined): SourceUrlMap {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? (obj as SourceUrlMap) : {};
  } catch {
    return {};
  }
}

/** Provenance for a single field, defaulting to "manual" when present but untracked. */
export function fieldSource(
  sources: FieldSourceMap,
  field: string,
): FieldSource | null {
  return sources[field] ?? null;
}

/**
 * The single "best" market value estimate for cards/compare:
 *   homesEstimate → midpoint(low, high) → otherEstimate.
 */
export function bestEstimate(p: Pick<
  Property,
  "homesEstimate" | "homesEstimateLow" | "homesEstimateHigh" | "otherEstimate"
>): number | null {
  if (p.homesEstimate != null) return p.homesEstimate;
  if (p.homesEstimateLow != null && p.homesEstimateHigh != null) {
    return (p.homesEstimateLow + p.homesEstimateHigh) / 2;
  }
  return p.otherEstimate ?? null;
}

export function pricePerFloorM2(value: number | null, floorAreaM2: number | null): number | null {
  if (value == null || !floorAreaM2) return null;
  return value / floorAreaM2;
}

export function pricePerLandM2(value: number | null, landAreaM2: number | null): number | null {
  if (value == null || !landAreaM2) return null;
  return value / landAreaM2;
}

/** A short, human display address. */
export function displayAddress(p: Pick<Property, "streetAddress" | "addressRaw">): string {
  return p.streetAddress || p.addressRaw;
}

export type ImageRef = { src: string; source: string; caption: string | null };

function photoSrc(p: Photo): string | null {
  return p.localPath ?? p.url ?? null;
}

/**
 * Resolve the primary image to show, following the plan's priority:
 *   1. a Photo explicitly marked primary
 *   2. the pasted listing `imageUrl`
 *   3. an uploaded photo
 *   4. a Street View photo (only ever stored when 2 & 3 are absent)
 */
export function resolvePrimaryImage(
  property: Pick<Property, "imageUrl">,
  photos: Photo[],
): ImageRef | null {
  const primary = photos.find((p) => p.isPrimary);
  if (primary) {
    const src = photoSrc(primary);
    if (src) return { src, source: primary.source, caption: primary.caption };
  }
  if (property.imageUrl) return { src: property.imageUrl, source: "listing", caption: null };
  const byOrder =
    photos.find((p) => p.source === "upload") ?? photos.find((p) => p.source === "streetview") ?? photos[0];
  if (byOrder) {
    const src = photoSrc(byOrder);
    if (src) return { src, source: byOrder.source, caption: byOrder.caption };
  }
  return null;
}

/** Whether a Street View fetch is appropriate: no listing URL and no uploads. */
export function shouldUseStreetView(
  property: Pick<Property, "imageUrl">,
  photos: Photo[],
): boolean {
  if (property.imageUrl) return false;
  return !photos.some((p) => p.source === "upload");
}
