// Recommended-offer engine. A transparent DECISION AID — not a valuation, not
// financial advice. Pure and deterministic so it's easy to test.
//
// Inputs (valuation figures only):
//   E  = market estimate — average of the homes.co.nz estimate, its range
//        (low + high), and any other-source estimate (e.g. QV).
//   CV = council CV/RV, lifted by the local suburb premium (homes here typically
//        sell 7–15% above CV), so it reflects market value not the rating value.
// Last-sale and comparable-$/m² inputs are intentionally NOT used.

import type { Property } from "@/generated/prisma/client";
import { formatNZD } from "@/lib/format";
import { OFFER_CONFIG } from "@/lib/offer/config";

export const OFFER_CAVEAT =
  "This is a negotiation starting point, not a valuation and not financial advice. Always commission a registered valuation, LIM, and builder's report before committing.";

type InputKey = "E" | "CV";

export type OfferInput = {
  key: InputKey;
  label: string;
  value: number;
  weight: number;
  note?: string;
  /** For composite inputs (the blended estimate, the adjusted CV), the parts. */
  components?: { label: string; value: number }[];
};

export type OfferResult = {
  low: number;
  high: number;
  reconciledValue: number;
  openingDiscount: number;
  inputsUsed: OfferInput[];
  inputsMissing: { key: InputKey; label: string; need: string }[];
  rationale: string;
  caveat: string;
};

type OfferProperty = Pick<
  Property,
  | "homesEstimate"
  | "homesEstimateLow"
  | "homesEstimateHigh"
  | "otherEstimate"
  | "otherEstimateSource"
  | "capitalValue"
>;

function round(n: number): number {
  // round to nearest $1,000 for a clean negotiation figure
  return Math.round(n / 1000) * 1000;
}

/**
 * Compute the recommended offer, or null when no inputs are available.
 * Returns the inputs used AND what's missing, so the UI can be honest about the
 * basis for the number.
 */
export function computeOffer(p: OfferProperty): OfferResult | null {
  const { weights, openingDiscount, commissionSaving, cvPremium } = OFFER_CONFIG;
  const used: OfferInput[] = [];
  const missing: OfferResult["inputsMissing"] = [];

  // E — market estimate: average of every estimate figure entered (homes.co.nz
  // point estimate, range low, range high, and any other-source estimate).
  const estimateSignals: { label: string; value: number }[] = [];
  if (p.homesEstimate != null)
    estimateSignals.push({ label: "homes.co.nz estimate", value: p.homesEstimate });
  if (p.homesEstimateLow != null)
    estimateSignals.push({ label: "homes.co.nz range low", value: p.homesEstimateLow });
  if (p.homesEstimateHigh != null)
    estimateSignals.push({ label: "homes.co.nz range high", value: p.homesEstimateHigh });
  if (p.otherEstimate != null)
    estimateSignals.push({
      label: p.otherEstimateSource?.trim() || "Other estimate",
      value: p.otherEstimate,
    });

  if (estimateSignals.length > 0) {
    const E = estimateSignals.reduce((s, x) => s + x.value, 0) / estimateSignals.length;
    const note =
      estimateSignals.length === 1
        ? estimateSignals[0].label
        : `average of ${estimateSignals.map((s) => s.label).join(", ")}`;
    used.push({
      key: "E",
      label: "Market estimate",
      value: E,
      weight: weights.E,
      note,
      components: estimateSignals.length > 1 ? estimateSignals : undefined,
    });
  } else {
    missing.push({ key: "E", label: "Market estimate", need: "a homes.co.nz or other estimate" });
  }

  // CV — council CV/RV, lifted by the local suburb premium (midpoint of range).
  if (p.capitalValue != null) {
    const premiumMid = (cvPremium.low + cvPremium.high) / 2;
    const adjustedCV = p.capitalValue * (1 + premiumMid);
    const lowPct = Math.round(cvPremium.low * 100);
    const highPct = Math.round(cvPremium.high * 100);
    used.push({
      key: "CV",
      label: "Capital value (CV/RV)",
      value: adjustedCV,
      weight: weights.CV,
      note: `${formatNZD(p.capitalValue)} + ${Math.round(premiumMid * 100)}% (Cliffhaven sells ~${lowPct}–${highPct}% above CV)`,
      components: [
        { label: "Council CV/RV", value: p.capitalValue },
        { label: `Adjusted +${Math.round(premiumMid * 100)}%`, value: adjustedCV },
      ],
    });
  } else {
    missing.push({ key: "CV", label: "Capital value", need: "the council CV/RV" });
  }

  if (used.length === 0) return null;

  // Renormalise weights over the inputs we actually have.
  const weightSum = used.reduce((s, i) => s + i.weight, 0);
  const reconciledValue = used.reduce((s, i) => s + i.value * (i.weight / weightSum), 0);

  const high = round(reconciledValue); // ceiling = reconciled value
  const low = round(reconciledValue * (1 - openingDiscount)); // opening below it

  const rationale = buildRationale(used, missing, reconciledValue, openingDiscount, commissionSaving);

  return {
    low,
    high,
    reconciledValue,
    openingDiscount,
    inputsUsed: used,
    inputsMissing: missing,
    rationale,
    caveat: OFFER_CAVEAT,
  };
}

function buildRationale(
  used: OfferInput[],
  missing: OfferResult["inputsMissing"],
  reconciled: number,
  discount: number,
  commission: { low: number; high: number },
): string {
  const usedPhrase = used.map((i) => i.note ?? i.label).join("; ");
  const missingPhrase =
    missing.length > 0 ? ` No ${missing.map((m) => m.label.toLowerCase()).join(", or ")} entered yet.` : "";
  const commissionPct = `${(commission.low * 100).toFixed(1)}–${(commission.high * 100).toFixed(0)}%`;
  return (
    `Based on ${usedPhrase}.${missingPhrase} ` +
    `Reconciled value ≈ ${formatNZD(reconciled)}; the opening offer sits ${Math.round(discount * 100)}% below it to leave room to negotiate, with the top of the range at the reconciled value. ` +
    `In a private sale, the ~${commissionPct} agent commission both sides save is shared negotiating room — not a reason to overpay.`
  );
}

// ---- Recommended sale price (settlement) -----------------------------------

export type SalePriceResult = {
  /** the recommended price to settle at */
  price: number;
  /** plain split-the-difference midpoint of offer and counter, for context */
  midpoint: number;
  /** what we anchored to: the reconciled market value, or the midpoint if none */
  basis: "market" | "midpoint";
  overBudget: boolean;
  rationale: string;
};

/**
 * Once an offer AND a counter exist, recommend where to settle: anchor on the
 * reconciled market value (everything the offer engine knows) but keep it
 * within the live negotiating range [offer, counter]. Returns null until both
 * an offer and a counter are present.
 */
export function recommendedSalePrice(
  p: { ourOffer: number | null; counterOffer: number | null; ourMaxBudget: number | null },
  reconciledValue: number | null,
): SalePriceResult | null {
  const { ourOffer: O, counterOffer: C } = p;
  if (O == null || C == null) return null;

  const lo = Math.min(O, C);
  const hi = Math.max(O, C);
  const midpoint = (O + C) / 2;
  const basis: "market" | "midpoint" = reconciledValue != null ? "market" : "midpoint";
  const anchor = reconciledValue ?? midpoint;
  const price = round(Math.max(lo, Math.min(hi, anchor)));
  const overBudget = p.ourMaxBudget != null && price > p.ourMaxBudget;

  let rationale: string;
  if (basis === "midpoint") {
    rationale =
      `No market estimate or CV entered, so this is the midpoint of your offer (${formatNZD(O)}) ` +
      `and their counter (${formatNZD(C)}).`;
  } else if (price >= hi) {
    rationale =
      `The property's data points to a value around ${formatNZD(reconciledValue!)} — at or above their ` +
      `counter of ${formatNZD(C)} — so meeting the counter looks fair.`;
  } else if (price <= lo) {
    rationale =
      `The property's data points to a value around ${formatNZD(reconciledValue!)} — at or below your ` +
      `offer of ${formatNZD(O)} — so holding near your offer looks right; there's little case to go higher.`;
  } else {
    rationale =
      `Anchored to the property's reconciled value (~${formatNZD(reconciledValue!)}), which sits between your ` +
      `offer (${formatNZD(O)}) and their counter (${formatNZD(C)}). The plain midpoint would be ${formatNZD(midpoint)}.`;
  }
  if (overBudget) {
    rationale += ` Note: this is above your max budget of ${formatNZD(p.ourMaxBudget!)}.`;
  }

  return { price, midpoint, basis, overBudget, rationale };
}
