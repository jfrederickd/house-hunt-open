"use client";

import { useTransition } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { geocodeProperty } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";

const PropertyMap = dynamic(() => import("@/components/map/property-map"), {
  ssr: false,
  loading: () => <div className="h-44 w-full rounded-xl border bg-muted" />,
});

export function LocationPanel({
  id,
  lat,
  lng,
  status,
  address,
  suburb,
  geocodeStatus,
  addressComplete,
}: {
  id: string;
  lat: number | null;
  lng: number | null;
  status: string;
  address: string;
  suburb: string | null;
  geocodeStatus: string;
  addressComplete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const runGeocode = () =>
    startTransition(async () => {
      const res = await geocodeProperty(id);
      if (res.ok) toast.success(res.message ?? "Geocoded.");
      else toast.error(res.message ?? "Geocoding failed.");
    });

  return (
    <div className="space-y-3">
      {lat != null && lng != null ? (
        <>
          <PropertyMap
            properties={[{ id, lat, lng, status, address, suburb }]}
            className="h-44 w-full"
            zoom={15}
          />
          <p className="text-xs text-muted-foreground">
            {lat.toFixed(5)}, {lng.toFixed(5)} · {geocodeStatus}
          </p>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            {addressComplete
              ? "Not geocoded yet."
              : "Address is incomplete — add a street number, then geocode."}
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={runGeocode}
        disabled={pending || !addressComplete}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {lat != null ? "Re-geocode" : "Geocode now"}
      </Button>
    </div>
  );
}
