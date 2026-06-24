import { Info, TrendingDown, AlertTriangle, CircleDollarSign, Handshake } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeOffer, recommendedSalePrice, OFFER_CAVEAT } from "@/lib/offer/engine";
import { formatNZD, formatRange } from "@/lib/format";

export function OfferPanel({ property }: { property: Property }) {
  const offer = computeOffer(property);
  const salePrice = recommendedSalePrice(property, offer?.reconciledValue ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="size-4" />
          Recommended offer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!offer ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Not enough data yet to suggest an offer. Add any of:
            </p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              <li>a homes.co.nz or other market estimate</li>
              <li>a last sale price and date</li>
              <li>the council capital value (CV/RV)</li>
              <li>a comparable $/m² and floor area</li>
            </ul>
          </div>
        ) : (
          <>
            <div>
              <p className="text-3xl font-semibold tracking-tight">{formatRange(offer.low, offer.high)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown className="size-3.5" />
                Opening {Math.round(offer.openingDiscount * 100)}% below a reconciled value of {formatNZD(offer.reconciledValue)}
              </p>
            </div>

            {property.ourMaxBudget != null && (
              <p
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm ${
                  offer.high > property.ourMaxBudget
                    ? "bg-amber-100 text-amber-900"
                    : "bg-green-100 text-green-900"
                }`}
              >
                {offer.high > property.ourMaxBudget && <AlertTriangle className="size-4" />}
                Your max budget is {formatNZD(property.ourMaxBudget)}
                {offer.high > property.ourMaxBudget
                  ? " — the top of this range is above it."
                  : " — this range is within it."}
              </p>
            )}

            {/* Inputs used */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Based on</p>
              <ul className="space-y-1">
                {offer.inputsUsed.map((i) => (
                  <li key={i.key} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span>
                        {i.label}
                        {i.note && <span className="text-muted-foreground"> — {i.note}</span>}
                      </span>
                      <span className="shrink-0 font-medium">{formatNZD(i.value)}</span>
                    </div>
                    {i.components && i.components.length > 1 && (
                      <ul className="mt-1 space-y-0.5 border-l pl-3">
                        {i.components.map((c) => (
                          <li
                            key={c.label}
                            className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground"
                          >
                            <span>{c.label}</span>
                            <span className="shrink-0 tabular-nums">{formatNZD(c.value)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              {offer.inputsMissing.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Missing: {offer.inputsMissing.map((m) => m.label.toLowerCase()).join(", ")}.
                </p>
              )}
            </div>

            <p className="text-sm leading-relaxed">{offer.rationale}</p>
          </>
        )}

        {(property.ourOffer != null || property.counterOffer != null) && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-900">Negotiation</p>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-amber-900/80">Our offer</span>
              <span className="font-semibold text-amber-900">{formatNZD(property.ourOffer)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-amber-900/80">Counter offer</span>
              <span className="font-semibold text-amber-900">{formatNZD(property.counterOffer)}</span>
            </div>

            {salePrice && (
              <div className="mt-2 space-y-1 border-t border-amber-200 pt-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
                  <Handshake className="size-3.5" />
                  Recommended sale price
                </p>
                <p className="text-2xl font-semibold tracking-tight text-amber-900">
                  {formatNZD(salePrice.price)}
                </p>
                <p className="text-sm leading-relaxed text-amber-900/80">{salePrice.rationale}</p>
                {salePrice.overBudget && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                    <AlertTriangle className="size-4" />
                    Above your max budget.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {OFFER_CAVEAT}
        </p>
      </CardContent>
    </Card>
  );
}
