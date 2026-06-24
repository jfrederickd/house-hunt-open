import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/criteria";
import type { CriterionType } from "@/lib/enums";
import { CriteriaSettings } from "@/components/criteria/criteria-settings";

export const dynamic = "force-dynamic";

export default async function CriteriaSettingsPage() {
  const [criteria, people] = await Promise.all([
    prisma.criterion.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.person.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Criteria &amp; people</h1>
        <p className="text-sm text-muted-foreground">
          These apply to every property. Reorder, edit, add, or deactivate criteria, and rename
          the people doing the assessing.
        </p>
      </div>

      <CriteriaSettings
        criteria={criteria.map((c) => ({
          id: c.id,
          label: c.label,
          type: c.type as CriterionType,
          options: parseOptions(c.options),
          mustHave: c.mustHave,
          weight: c.weight,
          active: c.active,
        }))}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
