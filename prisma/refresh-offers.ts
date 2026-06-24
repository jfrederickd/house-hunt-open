// Recompute and persist each property's recommended-offer fields with the
// current engine. The detail page computes the offer live, but the Compare
// table reads the stored recommendedOffer* columns, which are otherwise only
// written when a property is saved through the form. Run after changing the
// offer engine so Compare matches.
//
//   tsx prisma/refresh-offers.ts   (uses DATABASE_URL — points at prod in the container)

import { prisma } from "@/lib/prisma";
import { computeOffer } from "@/lib/offer/engine";

async function main() {
  const properties = await prisma.property.findMany();
  for (const p of properties) {
    const offer = computeOffer(p);
    await prisma.property.update({
      where: { id: p.id },
      data: {
        recommendedOfferLow: offer?.low ?? null,
        recommendedOfferHigh: offer?.high ?? null,
        offerRationale: offer?.rationale ?? null,
      },
    });
    console.log(
      `  ${p.contactName ?? p.addressRaw}: ${offer ? `${offer.low}–${offer.high}` : "no inputs"}`,
    );
  }
  console.log(`Refreshed ${properties.length} properties.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("refresh failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
