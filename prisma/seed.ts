// Seed script — imports the sample opportunities CSV and fills the database
// with dummy data so every feature has something to show. Idempotent: wipes
// existing properties (cascade) and re-imports. Run with `npm run db:seed`
// (or `npm run db:reset` to also re-run migrations).
//
// All data here is ENTIRELY FICTIONAL: invented contacts, made-up street names
// in the fictional suburb of Cliffhaven, Rivermouth, and dummy figures. Map
// coordinates are hand-set (no live geocoding) so the demo is self-contained.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { importCsv } from "@/lib/import/csv";
import { DEFAULT_DUE_DILIGENCE, DEFAULT_PEOPLE, DEFAULT_CRITERIA } from "@/lib/enums";
import { parseFieldSources } from "@/lib/property";
import { computeOffer } from "@/lib/offer/engine";
import { writePlaceholderImages } from "./placeholder-images";

const CSV_PATH = join(process.cwd(), "data", "sample_opportunities.csv");
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

type Viewing = {
  date: string; // ISO yyyy-mm-dd
  time?: string;
  status: "planned" | "completed" | "cancelled";
  attendees?: string;
  rating?: number;
  notes?: string;
};
type Sale = { date: string; price: number };
type Assess = { label: string; alex?: string; sam?: string; alexFlag?: string; samFlag?: string };

// Dummy per-property details, keyed by street address (as the importer parses
// it). Drives facts, valuations, flood risk, status, negotiation figures, the
// map pin, photos, notes, sale history, viewings and criteria assessments.
type Details = {
  status?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  floorAreaM2?: number;
  landAreaM2?: number;
  yearBuilt?: number;
  homesEstimate?: number;
  homesEstimateLow?: number;
  homesEstimateHigh?: number;
  otherEstimate?: number;
  otherEstimateSource?: string;
  capitalValue?: number;
  floodRisk?: string;
  ourOffer?: number;
  counterOffer?: number;
  lat?: number;
  lng?: number;
  photo?: string; // filename under /public/uploads
  photoCaption?: string;
  notes?: string[]; // timeline, oldest first
  sales?: Sale[]; // oldest first; latest also fills lastSale*
  viewings?: Viewing[];
  ddDone?: number[]; // due-diligence sortOrder indices to mark done
  assessments?: Assess[];
};

const DUMMY_DETAILS: Record<string, Details> = {
  "14 Rimu Avenue": {
    status: "contacted", propertyType: "House",
    bedrooms: 4, bathrooms: 2, parking: 2, floorAreaM2: 180, landAreaM2: 600,
    yearBuilt: 1995, homesEstimate: 1250000, homesEstimateLow: 1180000, homesEstimateHigh: 1360000,
    otherEstimate: 1280000, otherEstimateSource: "QV", capitalValue: 1150000, floodRisk: "none",
    lat: -37.6385, lng: 176.182,
    photo: "rimu-ave.svg", photoCaption: "Street frontage",
    notes: [
      "Owner open to a private sale — no agent involved. Wants a reasonably quick settlement.",
      "Left a message; they'll call back Thursday to talk through a viewing.",
    ],
    sales: [{ date: "2016-09-12", price: 910000 }],
    viewings: [
      { date: "2026-07-12", time: "4:00 PM", status: "planned", attendees: "Alex" },
    ],
  },
  "28 Kauri Street": {
    status: "viewing_scheduled", propertyType: "House",
    bedrooms: 3, bathrooms: 1, parking: 1, floorAreaM2: 120, landAreaM2: 450,
    yearBuilt: 1978, homesEstimate: 980000, homesEstimateLow: 920000, homesEstimateHigh: 1060000,
    otherEstimate: 1000000, otherEstimateSource: "QV", capitalValue: 910000, floodRisk: "low",
    lat: -37.6402, lng: 176.1838,
    photo: "kauri-st.svg", photoCaption: "Front of house",
    notes: ["Booked a viewing for Sat 5 Jul. Owner said the roof was redone in 2020."],
    viewings: [
      { date: "2026-07-05", time: "11:00 AM", status: "planned", attendees: "Alex, Sam" },
    ],
    assessments: [
      { label: "First impression", alex: "maybe", sam: "maybe" },
      { label: "All-day sun", alex: "3", sam: "4" },
      { label: "View", alex: "None", sam: "None" },
      { label: "Work needed", alex: "Cosmetic", sam: "Cosmetic" },
    ],
  },
  "9 Kowhai Lane": {
    status: "negotiating", propertyType: "House",
    bedrooms: 5, bathrooms: 3, parking: 2, floorAreaM2: 240, landAreaM2: 720,
    yearBuilt: 2008, homesEstimate: 1550000, homesEstimateLow: 1450000, homesEstimateHigh: 1720000,
    otherEstimate: 1580000, otherEstimateSource: "QV", capitalValue: 1420000, floodRisk: "none",
    ourOffer: 1450000, counterOffer: 1560000,
    lat: -37.6371, lng: 176.1805,
    photo: "kowhai-lane.svg", photoCaption: "Renovated villa",
    notes: [
      "Best of the bunch so far — sunny, renovated, sea glimpses from the deck.",
      "Put forward $1.45m. Vendor countered $1.56m.",
      "They're motivated — relocating overseas in the spring.",
    ],
    sales: [
      { date: "2014-03-20", price: 720000 },
      { date: "2021-11-05", price: 1180000 },
    ],
    viewings: [
      {
        date: "2026-06-10", time: "10:30 AM", status: "completed", attendees: "Alex, Sam",
        rating: 5, notes: "Loved it. Sunny open-plan living, renovated kitchen, generous garden. Worth pushing on.",
      },
    ],
    ddDone: [0, 1, 2, 3],
    assessments: [
      { label: "First impression", alex: "yes", sam: "yes" },
      { label: "All-day sun", alex: "5", sam: "5" },
      { label: "Indoor", alex: "4", sam: "5" },
      { label: "Kitchen", alex: "5", sam: "4", alexFlag: "love" },
      { label: "Bathrooms", alex: "4", sam: "4" },
      { label: "Bedroom", alex: "4", sam: "4" },
      { label: "View", alex: "Partial", sam: "Full" },
      { label: "Sun aspect", alex: "North", sam: "North" },
      { label: "Garage", alex: "true", sam: "true" },
      { label: "Outdoor", alex: "5", sam: "4" },
      { label: "Natural-hazard", alex: "yes", sam: "yes" },
      { label: "Warmth", alex: "4", sam: "3" },
      { label: "Work needed", alex: "Move-in ready", sam: "Cosmetic" },
    ],
  },
  "6 Totara Street": {
    status: "viewed", propertyType: "House",
    bedrooms: 3, bathrooms: 2, parking: 1, floorAreaM2: 140, landAreaM2: 520,
    yearBuilt: 1965, homesEstimate: 1080000, homesEstimateLow: 1000000, homesEstimateHigh: 1180000,
    otherEstimate: 1100000, otherEstimateSource: "QV", capitalValue: 1010000, floodRisk: "moderate",
    lat: -37.6418, lng: 176.1851,
    photo: "totara-st.svg", photoCaption: "Rear and garden",
    notes: [
      "Viewed Sunday. Solid bones and a big section, but the bathroom needs replacing.",
      "Sits a bit low — confirm the moderate flood rating on the council viewer.",
    ],
    sales: [
      { date: "2009-08-14", price: 520000 },
      { date: "2018-05-22", price: 845000 },
    ],
    viewings: [
      {
        date: "2026-06-18", time: "2:00 PM", status: "completed", attendees: "Alex, Sam",
        rating: 3, notes: "Great light and a huge garden; kitchen and bathroom both dated. Cold inside.",
      },
    ],
    ddDone: [0],
    assessments: [
      { label: "First impression", alex: "maybe", sam: "yes" },
      { label: "All-day sun", alex: "4", sam: "3" },
      { label: "Indoor", alex: "3", sam: "3" },
      { label: "Kitchen", alex: "2", sam: "3", alexFlag: "concern" },
      { label: "Bathrooms", alex: "2", sam: "2", alexFlag: "concern", samFlag: "concern" },
      { label: "Bedroom", alex: "4", sam: "3" },
      { label: "View", alex: "None", sam: "Partial" },
      { label: "Sun aspect", alex: "West", sam: "West" },
      { label: "Garage", alex: "true", sam: "false" },
      { label: "Outdoor", alex: "4", sam: "5" },
      { label: "Natural-hazard", alex: "maybe", sam: "yes", samFlag: "concern" },
      { label: "Warmth", alex: "2", sam: "3" },
      { label: "Work needed", alex: "Cosmetic", sam: "Major reno" },
    ],
  },
  "3/21 Harbour Esplanade": {
    status: "new", propertyType: "Apartment",
    bedrooms: 2, bathrooms: 1, parking: 1, floorAreaM2: 95, landAreaM2: 0,
    yearBuilt: 2015, homesEstimate: 720000, homesEstimateLow: 690000, homesEstimateHigh: 780000,
    otherEstimate: 730000, otherEstimateSource: "QV", capitalValue: 700000, floodRisk: "high",
    lat: -37.636, lng: 176.1792,
    photo: "harbour-esplanade.svg", photoCaption: "Waterfront block",
    notes: ["Saw it on a community noticeboard. Body corp ~$3.8k/yr. Right on the water — check flood risk."],
    assessments: [
      { label: "First impression", alex: "yes", sam: "maybe" },
      { label: "All-day sun", alex: "4", sam: "4" },
      { label: "View", alex: "Full", sam: "Full" },
      { label: "Natural-hazard", alex: "no", sam: "no", alexFlag: "deal_breaker", samFlag: "deal_breaker" },
    ],
  },
  "Tui Street": {
    status: "new", floodRisk: "unmodelled",
    notes: ["Heard from a neighbour that the corner place might come up privately. No street number yet."],
  },
};

async function main() {
  // Generate the placeholder listing photos so the demo has images out of the
  // box (/public/uploads is gitignored, so they're not committed).
  const images = writePlaceholderImages(UPLOADS_DIR);
  console.log(`Wrote ${images.length} placeholder images to public/uploads`);

  const csv = readFileSync(CSV_PATH, "utf-8");
  const { properties, warnings } = importCsv(csv);

  console.log(`\nImporting ${properties.length} sample properties from ${CSV_PATH}`);

  // Wipe existing data so the seed is repeatable. Children cascade-delete.
  await prisma.property.deleteMany();

  for (const p of properties) {
    const created = await prisma.property.create({
      data: {
        contactName: p.contactName,
        organisedThrough: p.organisedThrough,
        addressRaw: p.addressRaw,
        streetAddress: p.streetAddress,
        suburb: p.suburb,
        city: p.city,
        postcode: p.postcode,
        addressComplete: p.addressComplete,
        geocodeStatus: p.geocodeStatus,
        status: p.status,
        fieldSources: JSON.stringify(p.fieldSources),
        sourceUrls: JSON.stringify(p.sourceUrls),
        dueDiligenceItems: {
          create: DEFAULT_DUE_DILIGENCE.map((label, i) => ({ label, sortOrder: i })),
        },
      },
    });
    const flag = p.addressComplete ? "" : "  ⚠️  needs address";
    console.log(`  • ${created.contactName ?? "(no name)"} — ${created.addressRaw}${flag}`);
  }

  // People + criteria: seed only when empty (so renames in settings persist).
  if ((await prisma.person.count()) === 0) {
    await prisma.person.createMany({ data: DEFAULT_PEOPLE.map((name, i) => ({ name, sortOrder: i })) });
    console.log(`\nSeeded ${DEFAULT_PEOPLE.length} people: ${DEFAULT_PEOPLE.join(", ")} (rename in settings).`);
  }
  if ((await prisma.criterion.count()) === 0) {
    await prisma.criterion.createMany({
      data: DEFAULT_CRITERIA.map((c, i) => ({
        label: c.label,
        type: c.type,
        options: c.options ? JSON.stringify(c.options) : null,
        mustHave: c.mustHave ?? false,
        weight: c.weight ?? 1,
        sortOrder: i,
      })),
    });
    console.log(`Seeded ${DEFAULT_CRITERIA.length} criteria.`);
  }

  const people = await prisma.person.findMany({ orderBy: { sortOrder: "asc" } });
  const criteria = await prisma.criterion.findMany({ orderBy: { sortOrder: "asc" } });
  const [alex, sam] = people;
  const byLabel = (s: string) => criteria.find((c) => c.label.startsWith(s));

  let viewingCount = 0;
  let photoCount = 0;
  let assessmentCount = 0;

  // Apply dummy details: facts, valuations, flood, offers, coordinates, photos,
  // notes, sale history, viewings, due-diligence progress and assessments.
  for (const prop of await prisma.property.findMany()) {
    const d = DUMMY_DETAILS[prop.streetAddress ?? ""] ?? {};
    const offer = computeOffer({
      homesEstimate: d.homesEstimate ?? null,
      homesEstimateLow: d.homesEstimateLow ?? null,
      homesEstimateHigh: d.homesEstimateHigh ?? null,
      otherEstimate: d.otherEstimate ?? null,
      otherEstimateSource: d.otherEstimateSource ?? null,
      capitalValue: d.capitalValue ?? null,
    });
    const sources = parseFieldSources(prop.fieldSources);
    for (const f of ["homesEstimate", "otherEstimate", "capitalValue"] as const) {
      if (d[f] != null) sources[f] = "manual";
    }
    if (d.lat != null && d.lng != null) sources.location = "manual";

    const latestSale = d.sales?.[d.sales.length - 1];

    await prisma.property.update({
      where: { id: prop.id },
      data: {
        status: d.status ?? prop.status,
        propertyType: d.propertyType ?? null,
        bedrooms: d.bedrooms ?? null,
        bathrooms: d.bathrooms ?? null,
        parking: d.parking ?? null,
        floorAreaM2: d.floorAreaM2 ?? null,
        landAreaM2: d.landAreaM2 ?? null,
        yearBuilt: d.yearBuilt ?? null,
        homesEstimate: d.homesEstimate ?? null,
        homesEstimateLow: d.homesEstimateLow ?? null,
        homesEstimateHigh: d.homesEstimateHigh ?? null,
        otherEstimate: d.otherEstimate ?? null,
        otherEstimateSource: d.otherEstimateSource ?? null,
        capitalValue: d.capitalValue ?? null,
        floodRisk: d.floodRisk ?? null,
        ourOffer: d.ourOffer ?? null,
        counterOffer: d.counterOffer ?? null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        geocodeStatus: d.lat != null ? "manual" : prop.geocodeStatus,
        lastSalePrice: latestSale?.price ?? null,
        lastSaleDate: latestSale ? new Date(latestSale.date) : null,
        recommendedOfferLow: offer?.low ?? null,
        recommendedOfferHigh: offer?.high ?? null,
        offerRationale: offer?.rationale ?? null,
        fieldSources: JSON.stringify(sources),
      },
    });

    // Photo (local placeholder under /public/uploads).
    if (d.photo) {
      await prisma.photo.create({
        data: {
          propertyId: prop.id,
          localPath: `/uploads/${d.photo}`,
          source: "listing",
          caption: d.photoCaption ?? null,
          isPrimary: true,
        },
      });
      photoCount++;
    }

    // Notes timeline.
    for (const body of d.notes ?? []) {
      await prisma.note.create({ data: { propertyId: prop.id, body } });
    }

    // Sale history.
    for (const s of d.sales ?? []) {
      await prisma.saleRecord.create({
        data: { propertyId: prop.id, saleDate: new Date(s.date), salePrice: s.price, source: "manual" },
      });
    }

    // Viewings.
    for (const v of d.viewings ?? []) {
      await prisma.viewing.create({
        data: {
          propertyId: prop.id,
          scheduledDate: new Date(v.date),
          scheduledTime: v.time ?? null,
          status: v.status,
          attendees: v.attendees ?? null,
          rating: v.rating ?? null,
          notes: v.notes ?? null,
        },
      });
      viewingCount++;
    }

    // Due-diligence progress.
    if (d.ddDone?.length) {
      const items = await prisma.dueDiligenceItem.findMany({ where: { propertyId: prop.id } });
      for (const item of items) {
        if (d.ddDone.includes(item.sortOrder)) {
          await prisma.dueDiligenceItem.update({ where: { id: item.id }, data: { done: true } });
        }
      }
    }

    // Criteria assessments (per person).
    if (d.assessments?.length && alex && sam) {
      for (const a of d.assessments) {
        const c = byLabel(a.label);
        if (!c) continue;
        for (const [person, value, flag] of [
          [alex, a.alex, a.alexFlag],
          [sam, a.sam, a.samFlag],
        ] as const) {
          if (value == null) continue;
          await prisma.criterionAssessment.create({
            data: { propertyId: prop.id, criterionId: c.id, personId: person.id, value, flag: flag ?? null },
          });
          assessmentCount++;
        }
      }
    }
  }

  console.log(
    `\nDone: ${properties.length} properties, ${photoCount} photos, ${viewingCount} viewings, ${assessmentCount} assessments.`,
  );
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.log(`  - row ${w.rowIndex}${w.contactName ? ` (${w.contactName})` : ""}: ${w.message}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
