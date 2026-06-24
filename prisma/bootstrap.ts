// Boot-time bootstrap: ensure the two people and the default criteria exist.
// Idempotent and NON-destructive — only inserts when the tables are empty, so
// it never touches properties, assessments, renamed people, or edited criteria.
// (Distinct from `seed.ts`, which wipes + reimports the sample properties.)

import { prisma } from "@/lib/prisma";
import { DEFAULT_PEOPLE, DEFAULT_CRITERIA } from "@/lib/enums";

async function main() {
  if ((await prisma.person.count()) === 0) {
    await prisma.person.createMany({
      data: DEFAULT_PEOPLE.map((name, i) => ({ name, sortOrder: i })),
    });
    console.log(`  seeded ${DEFAULT_PEOPLE.length} people`);
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
    console.log(`  seeded ${DEFAULT_CRITERIA.length} criteria`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("bootstrap failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
