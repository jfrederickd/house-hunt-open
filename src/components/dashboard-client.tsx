"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import type { Property, Viewing, Photo } from "@/generated/prisma/client";
import type { MapProperty } from "@/components/map/property-map";
import { PropertyCard } from "@/components/property-card";
import { bestEstimate, displayAddress } from "@/lib/property";
import { PIPELINE_STATUS_META, PIPELINE_STATUSES } from "@/lib/enums";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PropertyMap = dynamic(() => import("@/components/map/property-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-xl border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type CardProperty = Property & { viewings: Viewing[]; photos: Photo[] };

const SORTS = {
  added: "Recently added",
  estimateDesc: "Estimate (high→low)",
  estimateAsc: "Estimate (low→high)",
  offerDesc: "Offer (high→low)",
  bedsDesc: "Bedrooms (most)",
  viewing: "Next viewing",
} as const;
type SortKey = keyof typeof SORTS;

function nextViewingTime(p: CardProperty): number {
  const times = p.viewings
    .filter((v) => v.status === "planned" && v.scheduledDate)
    .map((v) => new Date(v.scheduledDate as unknown as string).getTime());
  return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

export function DashboardClient({ properties }: { properties: CardProperty[] }) {
  const [view, setView] = useState<"grid" | "map">("grid");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [suburb, setSuburb] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("added");

  const suburbs = useMemo(
    () => Array.from(new Set(properties.map((p) => p.suburb).filter(Boolean))) as string[],
    [properties],
  );
  const statusesPresent = useMemo(
    () => PIPELINE_STATUSES.filter((s) => properties.some((p) => p.status === s)),
    [properties],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = properties.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (suburb !== "all" && p.suburb !== suburb) return false;
      if (q) {
        const hay = `${p.addressRaw} ${p.streetAddress ?? ""} ${p.suburb ?? ""} ${p.contactName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const byNum = (a: number | null, b: number | null, dir: 1 | -1) =>
      ((b ?? -Infinity) - (a ?? -Infinity)) * (dir === 1 ? 1 : -1);

    const sorted = [...list];
    switch (sort) {
      case "estimateDesc":
        sorted.sort((a, b) => byNum(bestEstimate(a), bestEstimate(b), 1));
        break;
      case "estimateAsc":
        sorted.sort((a, b) => (bestEstimate(a) ?? Infinity) - (bestEstimate(b) ?? Infinity));
        break;
      case "offerDesc":
        sorted.sort((a, b) => byNum(a.recommendedOfferHigh, b.recommendedOfferHigh, 1));
        break;
      case "bedsDesc":
        sorted.sort((a, b) => byNum(a.bedrooms, b.bedrooms, 1));
        break;
      case "viewing":
        sorted.sort((a, b) => nextViewingTime(a) - nextViewingTime(b));
        break;
      default:
        break; // "added" keeps query order (createdAt asc)
    }
    return sorted;
  }, [properties, query, status, suburb, sort]);

  const mapData: MapProperty[] = filtered
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      lat: p.lat!,
      lng: p.lng!,
      status: p.status,
      address: displayAddress(p),
      suburb: p.suburb,
    }));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address or contact"
            className="h-9 w-56 pl-8"
          />
        </div>

        <Select value={status} onChange={setStatus} label="Status">
          <option value="all">All statuses</option>
          {statusesPresent.map((s) => (
            <option key={s} value={s}>{PIPELINE_STATUS_META[s].label}</option>
          ))}
        </Select>

        {suburbs.length > 1 && (
          <Select value={suburb} onChange={setSuburb} label="Suburb">
            <option value="all">All suburbs</option>
            {suburbs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        )}

        <Select value={sort} onChange={(v) => setSort(v as SortKey)} label="Sort">
          {Object.entries(SORTS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </Select>

        <div className="ml-auto inline-flex rounded-lg border p-0.5">
          <Toggle active={view === "grid"} onClick={() => setView("grid")} icon={LayoutGrid} label="Grid" />
          <Toggle active={view === "map"} onClick={() => setView("map")} icon={MapIcon} label="Map" />
        </div>
      </div>

      {/* Result count + map legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {properties.length} shown
        </p>
        {view === "map" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {statusesPresent.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: PIPELINE_STATUS_META[s].color }} />
                {PIPELINE_STATUS_META[s].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <SlidersHorizontal className="size-5" />
          <p className="text-sm">No properties match these filters.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : mapData.length === 0 ? (
        <div className="flex h-[40vh] w-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          None of the filtered properties have coordinates yet.
        </div>
      ) : (
        <PropertyMap properties={mapData} />
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </select>
  );
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
