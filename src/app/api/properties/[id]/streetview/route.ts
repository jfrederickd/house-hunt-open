import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStreetViewEnabled, streetViewImageUrl } from "@/lib/enrichment/streetview";

// Proxies the Google Street View Static image so the API key stays server-side.
// Returns 404 when disabled, no coords, or Google has no imagery.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/properties/[id]/streetview">) {
  const { id } = await ctx.params;

  if (!isStreetViewEnabled()) {
    return new Response("Street View disabled", { status: 404 });
  }

  const property = await prisma.property.findUnique({
    where: { id },
    select: { lat: true, lng: true },
  });
  if (!property?.lat || !property?.lng) {
    return new Response("No coordinates", { status: 404 });
  }

  const url = streetViewImageUrl(property.lat, property.lng);
  if (!url) return new Response("Not configured", { status: 404 });

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    // Google returns a non-200 (with return_error_code) when there's no imagery.
    return new Response("No Street View imagery", { status: 404 });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
