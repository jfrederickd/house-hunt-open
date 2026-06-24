import Link from "next/link";
import { Columns3, TriangleAlert, Ban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  bestEstimate,
  displayAddress,
  pricePerFloorM2,
  pricePerLandM2,
} from "@/lib/property";
import { formatNZDCompact, formatArea, formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { FloodRiskBadge } from "@/components/flood-risk-badge";
import { PIPELINE_STATUS_META, type PipelineStatus } from "@/lib/enums";
import { PricePerM2Chart, type ChartDatum } from "@/components/compare/price-per-m2-chart";
import { personScore, isDisagreement, type PersonScore, type AssessmentLike } from "@/lib/criteria";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  address: string;
  status: string;
  floodRisk: string | null;
  estimate: number | null;
  cv: number | null;
  offerHigh: number | null;
  ourOffer: number | null;
  counterOffer: number | null;
  floorPerM2: number | null;
  landPerM2: number | null;
  beds: number | null;
  baths: number | null;
  floorArea: number | null;
  landArea: number | null;
};

// Direction: "low" = cheaper is better value; "high" = more is better.
// highlight=false → shown but not "best-in-column" coloured (e.g. negotiation figures).
const METRICS: { key: keyof Row; label: string; dir: "low" | "high"; fmt: (n: number) => string; highlight?: boolean }[] = [
  { key: "estimate", label: "Estimate", dir: "low", fmt: (n) => formatNZDCompact(n) },
  { key: "cv", label: "CV/RV", dir: "low", fmt: (n) => formatNZDCompact(n) },
  { key: "offerHigh", label: "Offer (top)", dir: "low", fmt: (n) => formatNZDCompact(n) },
  { key: "ourOffer", label: "Our offer", dir: "low", fmt: (n) => formatNZDCompact(n), highlight: false },
  { key: "counterOffer", label: "Counter", dir: "low", fmt: (n) => formatNZDCompact(n), highlight: false },
  { key: "floorPerM2", label: "$/m² floor", dir: "low", fmt: (n) => `$${Math.round(n / 1000)}k` },
  { key: "landPerM2", label: "$/m² land", dir: "low", fmt: (n) => `$${formatNumber(Math.round(n))}` },
  { key: "beds", label: "Beds", dir: "high", fmt: (n) => `${n}` },
  { key: "baths", label: "Baths", dir: "high", fmt: (n) => `${n}` },
  { key: "floorArea", label: "Floor", dir: "high", fmt: (n) => formatArea(n) },
  { key: "landArea", label: "Land", dir: "high", fmt: (n) => formatArea(n) },
];

// Row order: most-active first, dead last.
const STATUS_RANK: Record<string, number> = {
  negotiating: 0,
  offer_made: 1,
  under_contract: 2,
  purchased: 3,
  viewing_scheduled: 4,
  viewed: 5,
  contacted: 6,
  new: 7,
  passed: 8,
};
const statusRank = (status: string) => STATUS_RANK[status] ?? 50;

export default async function ComparePage() {
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "asc" } });

  const rows: Row[] = properties.map((p) => {
    const estimate = bestEstimate(p);
    // $/m² reflects what we'd actually pay: our offer if made, else the
    // recommended top offer. (Not the market estimate.)
    const offerBasis = p.ourOffer ?? p.recommendedOfferHigh ?? null;
    return {
      id: p.id,
      address: displayAddress(p),
      status: p.status,
      floodRisk: p.floodRisk,
      estimate,
      cv: p.capitalValue,
      offerHigh: p.recommendedOfferHigh,
      ourOffer: p.ourOffer,
      counterOffer: p.counterOffer,
      floorPerM2: pricePerFloorM2(offerBasis, p.floorAreaM2),
      landPerM2: pricePerLandM2(offerBasis, p.landAreaM2),
      beds: p.bedrooms,
      baths: p.bathrooms,
      floorArea: p.floorAreaM2,
      landArea: p.landAreaM2,
    };
  });

  // Order rows by pipeline status: most-active first, dead last. The three
  // statuses not in the user's list (offer_made/under_contract/purchased) sit
  // just under negotiating as "deal in progress"; unknowns sink to the bottom.
  rows.sort((a, b) => statusRank(a.status) - statusRank(b.status));

  // Best-in-column property id per metric.
  const best: Partial<Record<keyof Row, string>> = {};
  for (const m of METRICS) {
    if (m.highlight === false) continue; // negotiation figures aren't ranked
    const candidates = rows.filter((r) => r[m.key] != null) as (Row & Record<string, number>)[];
    if (candidates.length < 2) continue; // no point highlighting a sole value
    const winner = candidates.reduce((a, b) =>
      m.dir === "low" ? ((a[m.key] as number) <= (b[m.key] as number) ? a : b) : ((a[m.key] as number) >= (b[m.key] as number) ? a : b),
    );
    best[m.key] = winner.id;
  }

  const chartData: ChartDatum[] = rows
    .filter((r) => r.floorPerM2 != null)
    .map((r) => ({
      name: r.address,
      value: r.floorPerM2!,
      status: r.status,
      color: PIPELINE_STATUS_META[r.status as PipelineStatus]?.color ?? "#9ca3af",
    }));

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Columns3 className="size-6" />
          <p className="text-sm">Add some properties to compare them side by side.</p>
        </div>
      </div>
    );
  }

  // ---- Criteria fit: each person's weighted score (0–100) per house ----
  const [criteria, people, assessmentRows] = await Promise.all([
    prisma.criterion.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.person.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.criterionAssessment.findMany(),
  ]);

  const fitRows = properties.map((p) => {
    const as = assessmentRows.filter((a) => a.propertyId === p.id) as AssessmentLike[];
    const scores = people.map((person) => personScore(criteria, as, person.id));
    const present = scores.filter((s): s is PersonScore => s != null);
    const combined =
      present.length === people.length && people.length > 0
        ? Math.round(present.reduce((t, s) => t + s.pct, 0) / present.length)
        : null;
    const disagreements = criteria.filter((c) => isDisagreement(c, as)).length;
    const dealBreakerBy = people.filter((_, i) => scores[i]?.dealBreaker).map((p2) => p2.name);
    return { id: p.id, address: displayAddress(p), status: p.status, scores, combined, disagreements, dealBreakerBy };
  });
  fitRows.sort((a, b) => statusRank(a.status) - statusRank(b.status));

  // Highest score per person column + combined (only highlight when >1 value).
  const topPerPerson = people.map((_, i) => {
    const vals = fitRows.map((r) => r.scores[i]?.pct).filter((v): v is number => v != null);
    return vals.length >= 2 ? Math.max(...vals) : null;
  });
  const topCombined = (() => {
    const vals = fitRows.map((r) => r.combined).filter((v): v is number => v != null);
    return vals.length >= 2 ? Math.max(...vals) : null;
  })();
  const showFit = people.length > 0 && assessmentRows.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
        <p className="text-sm text-muted-foreground">
          Best value per column is highlighted. Cheaper price / $ per m² and more space win.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 font-medium">Property</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Flood</th>
              {METRICS.map((m) => (
                <th key={m.key} className="px-3 py-3 text-right font-medium whitespace-nowrap">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                  <Link href={`/properties/${r.id}`} className="hover:underline">{r.address}</Link>
                </td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">
                  {r.floodRisk ? (
                    <FloodRiskBadge risk={r.floodRisk} compact />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {METRICS.map((m) => {
                  const val = r[m.key] as number | null;
                  const isBest = best[m.key] === r.id;
                  return (
                    <td
                      key={m.key}
                      className={cn(
                        "px-3 py-3 text-right whitespace-nowrap tabular-nums",
                        isBest && "bg-green-50 font-semibold text-green-800",
                      )}
                    >
                      {val == null ? <span className="text-muted-foreground">—</span> : m.fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-medium">Floor $/m² comparison</h2>
        <p className="mb-3 text-xs text-muted-foreground">Based on our offer (or the recommended top offer if none made) ÷ floor area. Lower is cheaper per square metre.</p>
        <PricePerM2Chart data={chartData} />
      </div>

      {/* Criteria fit — each person's weighted score per house */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Criteria fit{people.length > 0 ? ` — ${people.map((p) => p.name).join(" vs ")}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Each house scored 0–100% against your active criteria, weighted by importance. Higher
            is a better fit. Open a property for the per-criterion breakdown.
          </p>
        </div>

        {!showFit ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Record criteria on a property (the Criteria tab) to see how each house scores for you both.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 font-medium">Property</th>
                  {people.map((p) => (
                    <th key={p.id} className="px-3 py-3 text-right font-medium whitespace-nowrap">{p.name}</th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium">Together</th>
                  <th className="px-3 py-3 font-medium">Signals</th>
                </tr>
              </thead>
              <tbody>
                {fitRows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/20",
                      r.dealBreakerBy.length > 0 && "bg-red-50/60",
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                      <Link href={`/properties/${r.id}`} className="hover:underline">{r.address}</Link>
                    </td>
                    {r.scores.map((s, i) => (
                      <td
                        key={people[i].id}
                        className={cn(
                          "px-3 py-3 text-right whitespace-nowrap tabular-nums",
                          s && topPerPerson[i] != null && s.pct === topPerPerson[i] && "bg-green-50 font-semibold text-green-800",
                        )}
                      >
                        {s ? (
                          <>
                            {s.pct}%
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {s.assessed}/{criteria.length}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-3 py-3 text-right whitespace-nowrap tabular-nums",
                        r.combined != null && topCombined != null && r.combined === topCombined && "bg-green-50 font-semibold text-green-800",
                      )}
                    >
                      {r.combined != null ? `${r.combined}%` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        {r.dealBreakerBy.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                            <Ban className="size-3" />
                            Deal-breaker · {r.dealBreakerBy.join(", ")}
                          </span>
                        )}
                        {r.disagreements > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <TriangleAlert className="size-3.5" />
                            {r.disagreements} differ
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
