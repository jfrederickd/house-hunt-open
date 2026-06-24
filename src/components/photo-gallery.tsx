"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Star, Trash2, Image as ImageIcon, MapPinned, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/generated/prisma/client";
import { uploadPhoto, setPrimaryPhoto, deletePhoto, fetchStreetView } from "@/lib/actions/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  upload: "Upload",
  streetview: "Street View",
  listing: "Listing",
  other: "Other",
};

export function PhotoGallery({
  propertyId,
  photos,
  imageUrl,
  hasCoords,
  streetViewEnabled,
}: {
  propertyId: string;
  photos: Photo[];
  imageUrl: string | null;
  hasCoords: boolean;
  streetViewEnabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string>("");

  const hasUpload = photos.some((p) => p.source === "upload");
  const hasStreetView = photos.some((p) => p.source === "streetview");
  const canStreetView = streetViewEnabled && hasCoords && !imageUrl && !hasUpload && !hasStreetView;

  const src = (p: Photo) => p.localPath ?? p.url ?? "";

  return (
    <div className="space-y-4">
      {/* Listing photo note */}
      {imageUrl && (
        <p className="text-xs text-muted-foreground">
          A pasted listing photo is set as the primary image (edit the property to change the URL).
        </p>
      )}

      {/* Gallery grid */}
      {photos.length === 0 && !imageUrl ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="size-4" />
          No photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imageUrl && (
            <figure className="group relative overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-pasted URL */}
              <img src={imageUrl} alt="Listing" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                Listing
              </figcaption>
            </figure>
          )}
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local/proxy image */}
              <img src={src(p)} alt={p.caption ?? "Photo"} className="aspect-[4/3] w-full object-cover" />
              <figcaption className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                {SOURCE_LABEL[p.source] ?? p.source}
                {p.isPrimary && " · primary"}
              </figcaption>
              <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title={p.isPrimary ? "Primary photo" : "Set as primary"}
                  onClick={() => startTransition(async () => { await setPrimaryPhoto(p.id, propertyId); })}
                  className={cn(
                    "rounded bg-background/90 p-1.5 hover:text-amber-500",
                    p.isPrimary && "text-amber-500",
                  )}
                >
                  <Star className={cn("size-3.5", p.isPrimary && "fill-current")} />
                </button>
                <button
                  type="button"
                  title="Delete photo"
                  onClick={() => startTransition(async () => { await deletePhoto(p.id, propertyId); })}
                  className="rounded bg-background/90 p-1.5 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}

      {/* Upload */}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const res = await uploadPhoto(propertyId, formData);
            if (res.ok) {
              toast.success(res.message ?? "Uploaded.");
              formRef.current?.reset();
              setFileName("");
            } else {
              toast.error(res.message ?? "Upload failed.");
            }
          })
        }
        className="flex flex-wrap items-center gap-2"
      >
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/50">
          <Upload className="size-4" />
          {fileName || "Choose photo"}
          <input
            type="file"
            name="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        <Input name="caption" placeholder="Caption (optional)" className="h-9 w-44" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </Button>
      </form>

      {/* Street View fallback */}
      {canStreetView && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await fetchStreetView(propertyId);
              if (res.ok) toast.success(res.message ?? "Added.");
              else toast.error(res.message ?? "Failed.");
            })
          }
        >
          <MapPinned className="size-4" />
          Fetch Street View image
        </Button>
      )}
      {!streetViewEnabled && !imageUrl && !hasUpload && (
        <p className="text-xs text-muted-foreground">
          Street View fallback is off. Enable it with <code>STREETVIEW_ENABLED</code> + a key to auto-fetch an
          exterior for never-listed properties.
        </p>
      )}
    </div>
  );
}
