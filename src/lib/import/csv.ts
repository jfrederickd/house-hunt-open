// CSV importer for house-hunt opportunities.
//
// Implements the cleaning rules from section 7 of the build plan:
//  - trim leading/trailing whitespace on every cell (e.g. "Nadia ")
//  - duplicate contact names for different addresses are kept as separate
//    properties (we never dedupe on name)
//  - an address with no street number (e.g. "Tui Street") is imported with
//    addressComplete=false and geocodeStatus="ambiguous" and a "needs address"
//    warning — it must NOT fail the import
//  - "date visit organised" + "time visit organised" become a planned Viewing
//  - "organised through" is normalised to the phone|messenger|other enum
//
// The parser is dependency-free and handles quoted fields, escaped quotes,
// and CRLF line endings.

import { parseAddress } from "@/lib/address";
import { parseNzDate, parseNzTime } from "@/lib/dates";
import { buildDeepLinks } from "@/lib/links";
import type { OrganisedThrough } from "@/lib/enums";

/** Parse raw CSV text into an array of row objects keyed by (lower-cased) header. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1)
    .filter((cells) => cells.some((c) => c.trim() !== "")) // skip blank lines
    .map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cells[i] ?? "").trim();
      });
      return obj;
    });
}

/** Low-level CSV → string[][] (handles quotes, escaped quotes, CRLF). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, ""); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // flush trailing field/row
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---- column mapping ---------------------------------------------------------

// Accept a few header spellings so a real CSV export drops in cleanly.
const COLUMN_ALIASES = {
  name: ["name", "contact", "contact name"],
  address: ["address", "addr"],
  date: ["date visit organised", "date", "visit date", "date organised"],
  time: ["time visit organised", "time", "visit time", "time organised"],
  organisedThrough: ["organised through", "organized through", "organised", "via", "contact method"],
} as const;

function pick(row: Record<string, string>, keys: readonly string[]): string {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return "";
}

function normaliseOrganisedThrough(value: string): OrganisedThrough | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (/phone|call|tel|txt|text|sms|mobile/.test(v)) return "phone";
  if (/messenger|fb|facebook|message|dm|whats ?app|insta/.test(v)) return "messenger";
  return "other";
}

export type ImportWarning = {
  rowIndex: number;
  contactName?: string;
  addressRaw?: string;
  message: string;
};

export type ImportedViewing = {
  scheduledDate: Date | null;
  scheduledTime: string | null;
  status: "planned";
};

export type ImportedProperty = {
  contactName: string | null;
  organisedThrough: OrganisedThrough | null;
  addressRaw: string;
  streetAddress: string;
  suburb: string;
  city: string;
  postcode: string | null;
  addressComplete: boolean;
  geocodeStatus: "manual" | "ambiguous";
  status: "new";
  fieldSources: Record<string, "manual" | "api" | "estimated">;
  sourceUrls: Record<string, string>;
  viewing: ImportedViewing | null;
};

export type ImportResult = {
  properties: ImportedProperty[];
  warnings: ImportWarning[];
};

/** Map cleaned CSV rows to property records, collecting warnings (never throws). */
export function mapRows(rows: Record<string, string>[]): ImportResult {
  const properties: ImportedProperty[] = [];
  const warnings: ImportWarning[] = [];

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2; // 1-based + header row, for human-friendly messages
    const contactName = pick(row, COLUMN_ALIASES.name).trim() || null;
    const addressRaw = pick(row, COLUMN_ALIASES.address).trim();

    if (!addressRaw) {
      warnings.push({
        rowIndex,
        contactName: contactName ?? undefined,
        message: "Row has no address — skipped.",
      });
      return;
    }

    const parsed = parseAddress(addressRaw);
    const organisedThrough = normaliseOrganisedThrough(pick(row, COLUMN_ALIASES.organisedThrough));

    if (!parsed.addressComplete) {
      warnings.push({
        rowIndex,
        contactName: contactName ?? undefined,
        addressRaw,
        message: `Incomplete address (no street number) — imported but flagged as "needs address".`,
      });
    }

    // Viewing from date/time, if present.
    const scheduledDate = parseNzDate(pick(row, COLUMN_ALIASES.date));
    const scheduledTime = parseNzTime(pick(row, COLUMN_ALIASES.time));
    const viewing: ImportedViewing | null =
      scheduledDate || scheduledTime
        ? { scheduledDate, scheduledTime, status: "planned" }
        : null;

    const fieldSources: ImportedProperty["fieldSources"] = { addressRaw: "manual" };
    if (contactName) fieldSources.contactName = "manual";
    if (organisedThrough) fieldSources.organisedThrough = "manual";

    const sourceUrls: Record<string, string> = {};
    for (const link of buildDeepLinks(parsed)) sourceUrls[link.label] = link.url;

    properties.push({
      contactName,
      organisedThrough,
      addressRaw,
      streetAddress: parsed.streetAddress,
      suburb: parsed.suburb,
      city: parsed.city,
      postcode: parsed.postcode,
      addressComplete: parsed.addressComplete,
      geocodeStatus: parsed.addressComplete ? "manual" : "ambiguous",
      status: "new",
      fieldSources,
      sourceUrls,
      viewing,
    });
  });

  return { properties, warnings };
}

/** Convenience: parse + map in one call. */
export function importCsv(text: string): ImportResult {
  return mapRows(parseCsv(text));
}
