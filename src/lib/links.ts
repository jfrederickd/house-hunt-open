// Deep links to manual-lookup pages (section 2 of the plan). We never scrape
// these — they open in a new tab so the user can read the figures and paste
// them back into the form.

import { fullAddress } from "./address";

export type PropertyLinkInput = {
  addressRaw?: string | null;
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  postcode?: string | null;
};

function addressQuery(p: PropertyLinkInput): string {
  const full = fullAddress({
    streetAddress: p.streetAddress ?? p.addressRaw,
    suburb: p.suburb,
    city: p.city,
    postcode: p.postcode,
  });
  return full || (p.addressRaw ?? "");
}

export type DeepLink = { label: string; url: string };

export function buildDeepLinks(p: PropertyLinkInput): DeepLink[] {
  const q = encodeURIComponent(addressQuery(p));
  // homes.co.nz uses a path slug; we send the encoded address and let the site resolve it.
  const homesSlug = encodeURIComponent((addressQuery(p) || "").replace(/,/g, "").replace(/\s+/g, "-").toLowerCase());
  return [
    {
      label: "homes.co.nz",
      url: `https://homes.co.nz/address/${homesSlug}`,
    },
    {
      label: "OneRoof",
      url: `https://www.oneroof.co.nz/property/search?q=${q}`,
    },
    {
      // CCC rates/valuation search landing page — the lookup is completed manually.
      label: "CCC rates/valuation",
      url: "https://www.ccc.govt.nz/services/rates-and-valuations/ratesinformationsearch",
    },
    {
      // CCC flood-extent viewer — search the address here to read the flood risk.
      label: "CCC flood viewer",
      url: "https://gis.ccc.govt.nz/portal/apps/webappviewer/index.html?id=65b4e2bfc84c4f2e85606cc46bcb6d01",
    },
  ];
}
