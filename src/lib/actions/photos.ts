"use server";

import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { shouldUseStreetView } from "@/lib/property";
import {
  isStreetViewEnabled,
  checkStreetViewAvailable,
} from "@/lib/enrichment/streetview";
import type { ActionState } from "@/lib/actions/properties";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadPhoto(propertyId: string, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a photo to upload." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, message: "Unsupported image type (use JPG, PNG, WEBP, or GIF)." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Image is larger than 8 MB." };
  }

  const ext = EXT[file.type] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", propertyId);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { ok: false, message: `Upload failed: ${(e as Error).message}` };
  }

  // First image with no existing primary becomes primary.
  const existingPrimary = await prisma.photo.count({ where: { propertyId, isPrimary: true } });
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { imageUrl: true } });
  const makePrimary = existingPrimary === 0 && !property?.imageUrl;

  await prisma.photo.create({
    data: {
      propertyId,
      localPath: `/uploads/${propertyId}/${filename}`,
      source: "upload",
      caption: (formData.get("caption") as string)?.trim() || null,
      isPrimary: makePrimary,
    },
  });

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true, message: "Photo uploaded." };
}

export async function setPrimaryPhoto(photoId: string, propertyId: string): Promise<void> {
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { propertyId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
}

export async function deletePhoto(photoId: string, propertyId: string): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  await prisma.photo.delete({ where: { id: photoId } });
  // Best-effort removal of the file on disk.
  if (photo?.localPath) {
    try {
      await unlink(join(process.cwd(), "public", photo.localPath));
    } catch {
      // already gone — ignore
    }
  }
  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
}

/**
 * Fetch a Street View exterior as a fallback image. Only acts when the feature
 * is enabled, the property has coords, and there's no listing URL or upload.
 * Handles ZERO_RESULTS gracefully.
 */
export async function fetchStreetView(propertyId: string): Promise<ActionState> {
  if (!isStreetViewEnabled()) {
    return { ok: false, message: "Street View is disabled. Set STREETVIEW_ENABLED and a key to enable it." };
  }
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { photos: true },
  });
  if (!property) return { ok: false, message: "Property not found." };
  if (property.lat == null || property.lng == null) {
    return { ok: false, message: "Geocode the property first." };
  }
  if (!shouldUseStreetView(property, property.photos)) {
    return { ok: false, message: "A listing photo or upload already exists; Street View is only a fallback." };
  }
  if (property.photos.some((p) => p.source === "streetview")) {
    return { ok: false, message: "Street View image already added." };
  }

  const status = await checkStreetViewAvailable(property.lat, property.lng);
  if (status === "ZERO_RESULTS") {
    return { ok: false, message: "No Street View imagery at this location." };
  }
  if (status !== "OK") {
    return { ok: false, message: "Couldn't reach Street View." };
  }

  const makePrimary = !property.photos.some((p) => p.isPrimary);
  await prisma.photo.create({
    data: {
      propertyId,
      url: `/api/properties/${propertyId}/streetview`,
      source: "streetview",
      caption: "Google Street View",
      isPrimary: makePrimary,
    },
  });

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true, message: "Street View image added." };
}
