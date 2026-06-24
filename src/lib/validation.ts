import { z } from "zod";
import { PIPELINE_STATUSES, ORGANISED_THROUGH } from "@/lib/enums";
import { dateFromInputValue } from "@/lib/dates";

// Coercion helpers for HTML form values (everything arrives as strings).

const optStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
  z.string().nullable(),
);

const reqStr = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().min(1, "Required"),
);

// Empty / missing → null; non-numeric → NaN (rejected by .finite()/.int()).
const toNumberOrNull = (v: unknown, strip = /[$,\s]/g): number | null => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return Number(s.replace(strip, ""));
};

const optNum = z.preprocess(
  (v) => toNumberOrNull(v),
  z.union([z.number().finite("Must be a number"), z.null()]),
);

const optInt = z.preprocess(
  (v) => toNumberOrNull(v, /[,\s]/g),
  z.union([z.number().int("Must be a whole number"), z.null()]),
);

const optDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? dateFromInputValue(v) : null),
  z.date().nullable(),
);

const latField = z.preprocess(
  (v) => toNumberOrNull(v, /\s/g),
  z.union([z.number().min(-90).max(90), z.null()]),
);

const lngField = z.preprocess(
  (v) => toNumberOrNull(v, /\s/g),
  z.union([z.number().min(-180).max(180), z.null()]),
);

export const propertySchema = z.object({
  // Contact
  contactName: optStr,
  organisedThrough: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(ORGANISED_THROUGH).nullable(),
  ),
  // Address
  addressRaw: reqStr,
  streetAddress: optStr,
  suburb: optStr,
  city: optStr,
  postcode: optStr,
  lat: latField,
  lng: lngField,
  // Pipeline
  status: z.enum(PIPELINE_STATUSES),
  // Valuation
  capitalValue: optNum,
  capitalValueDate: optDate,
  landValue: optNum,
  improvementValue: optNum,
  homesEstimate: optNum,
  homesEstimateLow: optNum,
  homesEstimateHigh: optNum,
  otherEstimate: optNum,
  otherEstimateSource: optStr,
  // Facts
  bedrooms: optInt,
  bathrooms: optInt,
  parking: optInt,
  floorAreaM2: optNum,
  landAreaM2: optNum,
  yearBuilt: optInt,
  propertyType: optStr,
  // Sale
  lastSalePrice: optNum,
  lastSaleDate: optDate,
  // Comparable + offer inputs
  compPricePerM2: optNum,
  ourMaxBudget: optNum,
  // Negotiation
  ourOffer: optNum,
  counterOffer: optNum,
  // Flood risk (from the CCC flood viewer)
  floodRisk: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["high", "moderate", "low", "none", "unmodelled"]).nullable(),
  ),
  // Image
  imageUrl: optStr,
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

/** Fields that, when present, count as manually-sourced for provenance badges. */
export const TRACKED_FIELDS: (keyof PropertyFormValues)[] = [
  "contactName",
  "organisedThrough",
  "capitalValue",
  "capitalValueDate",
  "landValue",
  "improvementValue",
  "homesEstimate",
  "homesEstimateLow",
  "homesEstimateHigh",
  "otherEstimate",
  "bedrooms",
  "bathrooms",
  "parking",
  "floorAreaM2",
  "landAreaM2",
  "yearBuilt",
  "propertyType",
  "lastSalePrice",
  "lastSaleDate",
  "compPricePerM2",
  "ourMaxBudget",
  "ourOffer",
  "counterOffer",
  "imageUrl",
];
