"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Viewing } from "@/generated/prisma/client";
import { updateViewing } from "@/lib/actions/viewings";
import { ViewingFields } from "@/components/viewings/viewing-fields";
import { StarRatingDisplay } from "@/components/star-rating";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ViewingListItem({
  viewing,
  propertyId,
  propertyLabel,
  propertyStatus,
  muted,
}: {
  viewing: Viewing;
  propertyId: string;
  propertyLabel: string;
  propertyStatus: string;
  muted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const v = viewing;

  if (editing) {
    return (
      <li className="rounded-lg border bg-card p-3">
        <form
          action={(fd) =>
            startTransition(async () => {
              const res = await updateViewing(v.id, propertyId, fd);
              if (res.ok) {
                toast.success(res.message!);
                setEditing(false);
              } else {
                toast.error(res.message!);
              }
            })
          }
          className="space-y-3"
        >
          <ViewingFields viewing={v} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>Save</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-card p-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <CalendarClock className={muted ? "size-4 text-muted-foreground" : "size-4 text-indigo-500"} />
        {v.scheduledDate ? formatDate(v.scheduledDate, { day: "numeric", month: "short" }) : "TBC"}
        {v.scheduledTime ? ` · ${v.scheduledTime}` : ""}
      </span>
      <Link
        href={`/properties/${propertyId}`}
        className="inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <MapPin className="size-3.5 text-muted-foreground" />
        {propertyLabel}
      </Link>
      {v.attendees && <span className="text-sm text-muted-foreground">with {v.attendees}</span>}
      <span className="ml-auto inline-flex items-center gap-2">
        {v.rating != null && <StarRatingDisplay value={v.rating} />}
        {v.status !== "planned" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{v.status}</span>
        )}
        <StatusBadge status={propertyStatus} />
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </span>
    </li>
  );
}
