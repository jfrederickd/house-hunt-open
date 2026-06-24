"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PIPELINE_STATUS_META, type PipelineStatus } from "@/lib/enums";

export type MapProperty = {
  id: string;
  lat: number;
  lng: number;
  status: string;
  address: string;
  suburb: string | null;
};

// Cliffhaven, Rivermouth — fallback centre when there are no markers.
const DEFAULT_CENTER: [number, number] = [-37.638, 176.182];

function pinIcon(status: string): L.DivIcon {
  const color = PIPELINE_STATUS_META[status as PipelineStatus]?.color ?? "#9ca3af";
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:9999px;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export default function PropertyMap({
  properties,
  className = "h-[70vh] w-full",
  zoom = 13,
}: {
  properties: MapProperty[];
  className?: string;
  zoom?: number;
}) {
  const points = properties.map((p) => [p.lat, p.lng] as [number, number]);
  const center = points[0] ?? DEFAULT_CENTER;

  return (
    <div className={`overflow-hidden rounded-xl border ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="size-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {properties.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.status)}>
            <Popup>
              <div className="space-y-1">
                <p className="font-medium">{p.address}</p>
                {p.suburb && <p className="text-muted-foreground">{p.suburb}</p>}
                <Link href={`/properties/${p.id}`} className="text-primary underline">
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
