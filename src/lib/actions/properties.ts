"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { propertySchema, TRACKED_FIELDS, type PropertyFormValues } from "@/lib/validation";
import { hasStreetNumber, fullAddress } from "@/lib/address";
import { buildDeepLinks } from "@/lib/links";
import { parseFieldSources } from "@/lib/property";
import { DEFAULT_DUE_DILIGENCE, type FieldSource } from "@/lib/enums";
import type { FieldSourceMap } from "@/lib/property";
import { geocodeAddress } from "@/lib/enrichment/geocode";
import { computeOffer } from "@/lib/offer/engine";

// Compute and shape the persisted offer fields from validated values.
function offerFields(v: PropertyFormValues) {
  const offer = computeOffer({
    homesEstimate: v.homesEstimate,
    homesEstimateLow: v.homesEstimateLow,
    homesEstimateHigh: v.homesEstimateHigh,
    otherEstimate: v.otherEstimate,
    otherEstimateSource: v.otherEstimateSource,
    capitalValue: v.capitalValue,
  });
  return {
    recommendedOfferLow: offer?.low ?? null,
    recommendedOfferHigh: offer?.high ?? null,
    offerRationale: offer?.rationale ?? null,
  };
}

type ResolvedLocation = {
  lat: number | null;
  lng: number | null;
  geocodeStatus: string;
  /** provenance for the lat/lng pair, or null when unknown */
  locationSource: FieldSource | null;
};

// Best-effort geocode of a complete address. Incomplete addresses (e.g. no
// street number) are left un-geocoded and flagged ambiguous.
async function geocodeFromValues(
  v: PropertyFormValues,
  addressComplete: boolean,
): Promise<ResolvedLocation> {
  if (!addressComplete) {
    return { lat: null, lng: null, geocodeStatus: "ambiguous", locationSource: null };
  }
  const query = fullAddress({
    streetAddress: v.streetAddress ?? v.addressRaw,
    suburb: v.suburb,
    city: v.city,
    postcode: v.postcode,
  });
  const g = await geocodeAddress(query);
  if (g.lat != null && g.lng != null) {
    return { lat: g.lat, lng: g.lng, geocodeStatus: g.status, locationSource: "api" };
  }
  return { lat: null, lng: null, geocodeStatus: "failed", locationSource: null };
}

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "_form");
    if (!errors[key]) errors[key] = i.message;
  }
  return errors;
}

// Map validated form values → Prisma scalar data (excluding lat/lng/geocode,
// which the caller handles so it can preserve enrichment provenance).
function scalarData(v: PropertyFormValues) {
  return {
    contactName: v.contactName,
    organisedThrough: v.organisedThrough,
    addressRaw: v.addressRaw,
    streetAddress: v.streetAddress ?? v.addressRaw,
    suburb: v.suburb,
    city: v.city,
    postcode: v.postcode,
    status: v.status,
    capitalValue: v.capitalValue,
    capitalValueDate: v.capitalValueDate,
    landValue: v.landValue,
    improvementValue: v.improvementValue,
    homesEstimate: v.homesEstimate,
    homesEstimateLow: v.homesEstimateLow,
    homesEstimateHigh: v.homesEstimateHigh,
    otherEstimate: v.otherEstimate,
    otherEstimateSource: v.otherEstimateSource,
    bedrooms: v.bedrooms,
    bathrooms: v.bathrooms,
    parking: v.parking,
    floorAreaM2: v.floorAreaM2,
    landAreaM2: v.landAreaM2,
    yearBuilt: v.yearBuilt,
    propertyType: v.propertyType,
    lastSalePrice: v.lastSalePrice,
    lastSaleDate: v.lastSaleDate,
    compPricePerM2: v.compPricePerM2,
    ourMaxBudget: v.ourMaxBudget,
    ourOffer: v.ourOffer,
    counterOffer: v.counterOffer,
    floodRisk: v.floodRisk,
    imageUrl: v.imageUrl,
  };
}

// Mark every tracked field that has a value as manually-sourced (form edits are
// manual by definition), preserving any existing api/estimated provenance only
// for untouched fields is out of scope — editing in the form means manual.
function mergeFieldSources(
  existing: FieldSourceMap,
  v: PropertyFormValues,
): FieldSourceMap {
  const sources: FieldSourceMap = { ...existing };
  sources.addressRaw = "manual";
  for (const f of TRACKED_FIELDS) {
    if (v[f] != null && v[f] !== "") sources[f] = "manual";
    else delete sources[f];
  }
  return sources;
}

export async function createProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;
  const data = scalarData(v);
  const addressComplete = hasStreetNumber(data.streetAddress ?? data.addressRaw);

  // Manual coords win; otherwise geocode a complete address.
  const loc: ResolvedLocation =
    v.lat != null && v.lng != null
      ? { lat: v.lat, lng: v.lng, geocodeStatus: "manual", locationSource: "manual" }
      : await geocodeFromValues(v, addressComplete);

  const sources = mergeFieldSources({}, v);
  if (loc.locationSource) sources.location = loc.locationSource;
  const sourceUrls: Record<string, string> = {};
  for (const link of buildDeepLinks(data)) sourceUrls[link.label] = link.url;

  let created;
  try {
    created = await prisma.property.create({
      data: {
        ...data,
        ...offerFields(v),
        lat: loc.lat,
        lng: loc.lng,
        addressComplete,
        geocodeStatus: loc.geocodeStatus,
        fieldSources: JSON.stringify(sources),
        sourceUrls: JSON.stringify(sourceUrls),
        dueDiligenceItems: {
          create: DEFAULT_DUE_DILIGENCE.map((label, i) => ({ label, sortOrder: i })),
        },
      },
    });
  } catch (e) {
    return { ok: false, message: `Could not save: ${(e as Error).message}` };
  }

  revalidatePath("/");
  redirect(`/properties/${created.id}`);
}

export async function updateProperty(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Property not found." };

  const data = scalarData(v);
  const addressComplete = hasStreetNumber(data.streetAddress ?? data.addressRaw);
  const existingSources = parseFieldSources(existing.fieldSources);

  const coordsProvided = v.lat != null && v.lng != null;
  const coordsChanged = v.lat !== existing.lat || v.lng !== existing.lng;
  const addressChanged =
    fullAddress({ streetAddress: data.streetAddress, suburb: v.suburb, city: v.city, postcode: v.postcode }) !==
    fullAddress({ streetAddress: existing.streetAddress, suburb: existing.suburb, city: existing.city, postcode: existing.postcode });

  let loc: ResolvedLocation;
  if (coordsProvided) {
    // Manual coords. Keep prior provenance only if they're unchanged.
    loc = {
      lat: v.lat,
      lng: v.lng,
      geocodeStatus: coordsChanged ? "manual" : existing.geocodeStatus,
      locationSource: coordsChanged ? "manual" : ((existingSources.location as FieldSource) ?? "manual"),
    };
  } else if (!addressComplete) {
    loc = { lat: null, lng: null, geocodeStatus: "ambiguous", locationSource: null };
  } else if (addressChanged || existing.lat == null) {
    // Address is new/changed and we have no manual coords → (re)geocode.
    loc = await geocodeFromValues(v, addressComplete);
  } else {
    // Unchanged address, keep what we had.
    loc = {
      lat: existing.lat,
      lng: existing.lng,
      geocodeStatus: existing.geocodeStatus,
      locationSource: (existingSources.location as FieldSource) ?? null,
    };
  }

  const sources = mergeFieldSources(existingSources, v);
  if (loc.locationSource) sources.location = loc.locationSource;
  else delete sources.location;

  // Refresh deep links if the address changed.
  const sourceUrls: Record<string, string> = {};
  for (const link of buildDeepLinks(data)) sourceUrls[link.label] = link.url;

  try {
    await prisma.property.update({
      where: { id },
      data: {
        ...data,
        ...offerFields(v),
        lat: loc.lat,
        lng: loc.lng,
        addressComplete,
        geocodeStatus: loc.geocodeStatus,
        fieldSources: JSON.stringify(sources),
        sourceUrls: JSON.stringify(sourceUrls),
      },
    });
  } catch (e) {
    return { ok: false, message: `Could not save: ${(e as Error).message}` };
  }

  revalidatePath("/");
  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

export async function deleteProperty(id: string): Promise<void> {
  await prisma.property.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

/**
 * Force a (re)geocode of a property from its current address. Used by the
 * "Geocode now" button. No-op for incomplete addresses (stays ambiguous).
 */
export async function geocodeProperty(id: string): Promise<ActionState> {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Property not found." };
  if (!existing.addressComplete) {
    return { ok: false, message: "Address is incomplete — add a street number first." };
  }

  const query = fullAddress({
    streetAddress: existing.streetAddress ?? existing.addressRaw,
    suburb: existing.suburb,
    city: existing.city,
    postcode: existing.postcode,
  });
  const g = await geocodeAddress(query);

  const sources = parseFieldSources(existing.fieldSources);
  if (g.lat != null && g.lng != null) sources.location = "api";
  else delete sources.location;

  await prisma.property.update({
    where: { id },
    data: {
      lat: g.lat,
      lng: g.lng,
      geocodeStatus: g.lat != null ? g.status : "failed",
      fieldSources: JSON.stringify(sources),
    },
  });

  revalidatePath("/");
  revalidatePath(`/properties/${id}`);
  return g.lat != null
    ? { ok: true, message: "Geocoded." }
    : { ok: false, message: "Couldn't find that address." };
}

// ---- Notes ----------------------------------------------------------------

export async function addNote(propertyId: string, formData: FormData): Promise<ActionState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Note can't be empty." };
  await prisma.note.create({ data: { propertyId, body } });
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

export async function deleteNote(noteId: string, propertyId: string): Promise<void> {
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath(`/properties/${propertyId}`);
}

// ---- Due diligence --------------------------------------------------------

export async function toggleDueDiligence(itemId: string, propertyId: string, done: boolean): Promise<void> {
  await prisma.dueDiligenceItem.update({ where: { id: itemId }, data: { done } });
  revalidatePath(`/properties/${propertyId}`);
}

export async function addDueDiligenceItem(propertyId: string, formData: FormData): Promise<ActionState> {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { ok: false, message: "Label can't be empty." };
  const count = await prisma.dueDiligenceItem.count({ where: { propertyId } });
  await prisma.dueDiligenceItem.create({ data: { propertyId, label, sortOrder: count } });
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

export async function deleteDueDiligenceItem(itemId: string, propertyId: string): Promise<void> {
  await prisma.dueDiligenceItem.delete({ where: { id: itemId } });
  revalidatePath(`/properties/${propertyId}`);
}
