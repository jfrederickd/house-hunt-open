// Tunable configuration for the recommended-offer engine.
// Everything here is meant to be hand-edited as your view or the market changes.

export const OFFER_CONFIG = {
  // The reconciled market value is a weighted average of the two inputs below
  // (renormalised over whichever are present):
  //   E  = market estimate  — blends the homes.co.nz estimate, its range, and
  //        any other-source estimate (e.g. QV/OneRoof).
  //   CV = council CV/RV, lifted by the local suburb premium (see below).
  weights: {
    E: 0.7,
    CV: 0.3,
  },

  // Cliffhaven homes typically sell ABOVE the council CV/RV. We lift the CV by the
  // midpoint of this range so it represents market value rather than the (lower,
  // often stale) rating value. Adjust if your read of the local market changes.
  cvPremium: { low: 0.07, high: 0.15 },

  // The opening offer sits this fraction below the reconciled value.
  openingDiscount: 0.07,

  // Private-sale context surfaced in the rationale: with no agent, both sides
  // save roughly this much commission — shared negotiating room, not a reason
  // to overpay.
  commissionSaving: { low: 0.025, high: 0.04 },
};
