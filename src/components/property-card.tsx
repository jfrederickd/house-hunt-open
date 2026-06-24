import Link from "next/link";
import { Bed, Bath, Car, Maximize, LandPlot, CalendarDays, MapPin, AlertTriangle } from "lucide-react";
import type { Property, Viewing, Photo } from "@/generated/prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { FloodRiskBadge } from "@/components/flood-risk-badge";
import { bestEstimate, displayAddress, resolvePrimaryImage } from "@/lib/property";
import { formatNZDCompact, formatRange, formatArea } from "@/lib/format";
import { formatDate } from "@/lib/dates";

type CardProperty = Property & { viewings: Viewing[]; photos: Photo[] };

function nextViewing(viewings: Viewing[]): Viewing | null {
  const planned = viewings
    .filter((v) => v.status === "planned" && v.scheduledDate)
    .sort((a, b) => (a.scheduledDate!.getTime() - b.scheduledDate!.getTime()));
  return planned[0] ?? null;
}

function Fact({ icon: Icon, value }: { icon: typeof Bed; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="size-3.5" />
      {value}
    </span>
  );
}

export function PropertyCard({ property }: { property: CardProperty }) {
  const est = bestEstimate(property);
  const upcoming = nextViewing(property.viewings);
  const hero = resolvePrimaryImage(property, property.photos);

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-pasted/local/proxy images, not optimised
          <img
            src={hero.src}
            alt={displayAddress(property)}
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <MapPin className="size-8 opacity-40" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={property.status} className="bg-background/90 backdrop-blur" />
        </div>
        {!property.addressComplete && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            <AlertTriangle className="size-3" />
            Needs address
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-medium leading-tight">{displayAddress(property)}</h3>
          <p className="text-sm text-muted-foreground">
            {property.suburb ?? "—"}
            {property.contactName ? ` · ${property.contactName}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {property.bedrooms != null && <Fact icon={Bed} value={`${property.bedrooms}`} />}
          {property.bathrooms != null && <Fact icon={Bath} value={`${property.bathrooms}`} />}
          {property.parking != null && <Fact icon={Car} value={`${property.parking}`} />}
          {property.floorAreaM2 != null && <Fact icon={Maximize} value={formatArea(property.floorAreaM2)} />}
          {property.landAreaM2 != null && <Fact icon={LandPlot} value={formatArea(property.landAreaM2)} />}
        </div>

        {property.floodRisk && (
          <div>
            <FloodRiskBadge risk={property.floodRisk} />
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Best estimate</p>
            <p className="font-semibold">{est != null ? formatNZDCompact(est) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Offer range</p>
            <p className="font-medium">
              {property.recommendedOfferLow != null || property.recommendedOfferHigh != null
                ? formatRange(property.recommendedOfferLow, property.recommendedOfferHigh)
                : "—"}
            </p>
          </div>
        </div>

        {(property.ourOffer != null || property.counterOffer != null) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Our offer</span>
              <span className="font-semibold text-amber-900">{formatNZDCompact(property.ourOffer)}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Counter</span>
              <span className="font-semibold text-amber-900">{formatNZDCompact(property.counterOffer)}</span>
            </span>
          </div>
        )}

        {upcoming && (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            Next viewing {formatDate(upcoming.scheduledDate)}
            {upcoming.scheduledTime ? ` · ${upcoming.scheduledTime}` : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
