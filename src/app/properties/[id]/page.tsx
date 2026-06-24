import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Bed,
  Bath,
  Car,
  Maximize,
  LandPlot,
  Phone,
  MessageCircle,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { FloodRiskBadge } from "@/components/flood-risk-badge";
import { DataRow } from "@/components/detail/data-row";
import { NotesTimeline } from "@/components/notes-timeline";
import { DueDiligenceChecklist } from "@/components/due-diligence-checklist";
import { LocationPanel } from "@/components/map/location-panel";
import { PhotoGallery } from "@/components/photo-gallery";
import { ViewingsManager } from "@/components/viewings-manager";
import { OfferPanel } from "@/components/offer-panel";
import { DetailTabs } from "@/components/detail/detail-tabs";
import { CriteriaTab } from "@/components/criteria/criteria-tab";
import { getActivePerson } from "@/lib/active-person";
import { parseOptions } from "@/lib/criteria";
import type { CriterionType } from "@/lib/enums";
import { resolvePrimaryImage } from "@/lib/property";
import { isStreetViewEnabled } from "@/lib/enrichment/streetview";
import {
  parseFieldSources,
  bestEstimate,
  displayAddress,
} from "@/lib/property";
import { buildDeepLinks } from "@/lib/links";
import { formatNZD, formatNumber, formatArea, formatRange } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { ORGANISED_THROUGH_LABELS, type OrganisedThrough } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      viewings: { orderBy: { scheduledDate: "asc" } },
      noteEntries: { orderBy: { timestamp: "desc" } },
      dueDiligenceItems: { orderBy: { sortOrder: "asc" } },
      saleRecords: { orderBy: { saleDate: "desc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!property) notFound();

  const sources = parseFieldSources(property.fieldSources);
  // Deep-links are derived from the address — compute live so all properties
  // get the current set (incl. the CCC flood viewer), not whatever was stored.
  const urls = Object.fromEntries(buildDeepLinks(property).map((l) => [l.label, l.url]));
  const est = bestEstimate(property);
  const hero = resolvePrimaryImage(property, property.photos);

  // Criteria assessment data (per the active person + everyone, for compare).
  const [criteriaRows, { people, activePersonId }, assessmentRows] = await Promise.all([
    prisma.criterion.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getActivePerson(),
    prisma.criterionAssessment.findMany({ where: { propertyId: id } }),
  ]);
  const criteriaDTO = criteriaRows.map((c) => ({
    id: c.id,
    label: c.label,
    type: c.type as CriterionType,
    options: parseOptions(c.options),
    mustHave: c.mustHave,
    weight: c.weight,
  }));
  const assessmentsDTO = assessmentRows.map((a) => ({
    criterionId: a.criterionId,
    personId: a.personId,
    value: a.value,
    notes: a.notes,
    flag: a.flag,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
            Dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{displayAddress(property)}</h1>
            <StatusBadge status={property.status} />
            <FloodRiskBadge risk={property.floodRisk} showUnchecked />
            {!property.addressComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                <AlertTriangle className="size-3" />
                Needs address
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {[property.suburb, property.city].filter(Boolean).join(", ") || "—"}
            </span>
            {property.contactName && (
              <span className="inline-flex items-center gap-1">
                {property.organisedThrough === "phone" ? (
                  <Phone className="size-3.5" />
                ) : property.organisedThrough === "messenger" ? (
                  <MessageCircle className="size-3.5" />
                ) : null}
                {property.contactName}
                {property.organisedThrough
                  ? ` · ${ORGANISED_THROUGH_LABELS[property.organisedThrough as OrganisedThrough]}`
                  : ""}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={`/properties/${id}/edit`} />}>
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      <DetailTabs
        overview={
          <div className="space-y-6">
            {/* Hero image */}
            <div className="aspect-[16/7] w-full overflow-hidden rounded-xl bg-muted">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- pasted/local/proxy image
          <img src={hero.src} alt={displayAddress(property)} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="size-8 opacity-40" />
            <p className="text-sm">No image yet — paste a listing photo URL, upload a photo, or fetch Street View below.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Valuation</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DataRow label="Best estimate" value={formatNZD(est)} />
                <DataRow label="homes.co.nz estimate" value={formatNZD(property.homesEstimate)} source={sources.homesEstimate} />
                <DataRow
                  label="Estimate range"
                  value={formatRange(property.homesEstimateLow, property.homesEstimateHigh)}
                />
                <DataRow
                  label="Other estimate"
                  value={
                    property.otherEstimate != null
                      ? `${formatNZD(property.otherEstimate)}${property.otherEstimateSource ? ` (${property.otherEstimateSource})` : ""}`
                      : "—"
                  }
                  source={sources.otherEstimate}
                />
                <DataRow
                  label="Capital value (CV/RV)"
                  value={
                    property.capitalValue != null
                      ? `${formatNZD(property.capitalValue)}${property.capitalValueDate ? ` (${formatDate(property.capitalValueDate, { month: "short", year: "numeric" })})` : ""}`
                      : "—"
                  }
                  source={sources.capitalValue}
                />
                <DataRow label="Land value" value={formatNZD(property.landValue)} source={sources.landValue} />
                <DataRow label="Improvement value" value={formatNZD(property.improvementValue)} source={sources.improvementValue} />
              </dl>

              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale history</p>
                {property.lastSalePrice == null && property.saleRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sale history entered.</p>
                ) : (
                  <dl className="divide-y">
                    {property.lastSalePrice != null && (
                      <DataRow
                        label={`Last sale${property.lastSaleDate ? ` (${formatDate(property.lastSaleDate)})` : ""}`}
                        value={formatNZD(property.lastSalePrice)}
                        source={sources.lastSalePrice}
                      />
                    )}
                    {property.saleRecords.map((s) => (
                      <DataRow key={s.id} label={formatDate(s.saleDate)} value={formatNZD(s.salePrice)} />
                    ))}
                  </dl>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                <FactRow icon={Bed} label="Bedrooms" value={property.bedrooms != null ? formatNumber(property.bedrooms) : "—"} />
                <FactRow icon={Bath} label="Bathrooms" value={property.bathrooms != null ? formatNumber(property.bathrooms) : "—"} />
                <FactRow icon={Car} label="Parking" value={property.parking != null ? formatNumber(property.parking) : "—"} />
                <FactRow icon={Maximize} label="Floor area" value={formatArea(property.floorAreaM2)} />
                <FactRow icon={LandPlot} label="Land area" value={formatArea(property.landAreaM2)} />
                <FactRow icon={Info} label="Year built" value={property.yearBuilt != null ? `${property.yearBuilt}` : "—"} />
              </div>
              {property.propertyType && (
                <p className="mt-3 text-sm text-muted-foreground">Type: {property.propertyType}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery
                propertyId={property.id}
                photos={property.photos}
                imageUrl={property.imageUrl}
                hasCoords={property.lat != null && property.lng != null}
                streetViewEnabled={isStreetViewEnabled()}
              />
            </CardContent>
          </Card>

          {/* Recommended offer — computed live from current data */}
          <OfferPanel property={property} />

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesTimeline propertyId={property.id} notes={property.noteEntries} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location + mini map */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPanel
                id={property.id}
                lat={property.lat}
                lng={property.lng}
                status={property.status}
                address={displayAddress(property)}
                suburb={property.suburb}
                geocodeStatus={property.geocodeStatus}
                addressComplete={property.addressComplete}
              />
            </CardContent>
          </Card>

          {/* Deep links */}
          <Card>
            <CardHeader>
              <CardTitle>Look up the numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Open these, read the figures, and paste them in via Edit. We never scrape them.
              </p>
              {Object.entries(urls).map(([label, url]) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  {label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Viewings */}
          <Card>
            <CardHeader>
              <CardTitle>Viewings</CardTitle>
            </CardHeader>
            <CardContent>
              <ViewingsManager propertyId={property.id} viewings={property.viewings} />
            </CardContent>
          </Card>

          {/* Due diligence */}
          <Card>
            <CardHeader>
              <CardTitle>Due diligence</CardTitle>
            </CardHeader>
            <CardContent>
              <DueDiligenceChecklist propertyId={property.id} items={property.dueDiligenceItems} />
            </CardContent>
          </Card>
        </div>
      </div>
          </div>
        }
        criteria={
          people.length > 0 && activePersonId ? (
            <CriteriaTab
              propertyId={property.id}
              criteria={criteriaDTO}
              people={people.map((p) => ({ id: p.id, name: p.name }))}
              activePersonId={activePersonId}
              assessments={assessmentsDTO}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Add people in settings to assess criteria.
            </p>
          )
        }
      />
    </div>
  );
}

function FactRow({ icon: Icon, label, value }: { icon: typeof Bed; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
