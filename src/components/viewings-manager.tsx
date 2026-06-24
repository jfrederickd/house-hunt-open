"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Plus, Check, Pencil, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import type { Viewing } from "@/generated/prisma/client";
import {
  addViewing,
  updateViewing,
  completeViewing,
  cancelViewing,
  deleteViewing,
} from "@/lib/actions/viewings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingDisplay, StarRatingInput } from "@/components/star-rating";
import { ViewingFields } from "@/components/viewings/viewing-fields";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-indigo-100 text-indigo-900",
  completed: "bg-green-100 text-green-900",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function ViewingsManager({
  propertyId,
  viewings,
}: {
  propertyId: string;
  viewings: Viewing[];
}) {
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const addRef = useRef<HTMLFormElement>(null);

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    startTransition(async () => {
      await fn();
      after?.();
    });

  return (
    <div className="space-y-4">
      {viewings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No viewings yet.</p>
      ) : (
        <ul className="space-y-3">
          {viewings.map((v) => (
            <li key={v.id} className="rounded-lg border p-3">
              {editingId === v.id ? (
                <form
                  action={(fd) =>
                    run(
                      async () => {
                        const res = await updateViewing(v.id, propertyId, fd);
                        if (res.ok) toast.success(res.message!);
                      },
                      () => setEditingId(null),
                    )
                  }
                  className="space-y-3"
                >
                  <ViewingFields viewing={v} />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    <span className="font-medium">
                      {v.scheduledDate ? formatDate(v.scheduledDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Date TBC"}
                      {v.scheduledTime ? ` · ${v.scheduledTime}` : ""}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[v.status])}>
                      {v.status}
                    </span>
                    {v.rating != null && <StarRatingDisplay value={v.rating} className="ml-1" />}
                  </div>
                  {v.attendees && <p className="mt-1 text-sm text-muted-foreground">With {v.attendees}</p>}
                  {v.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{v.notes}</p>}

                  {completingId === v.id ? (
                    <form
                      action={(fd) =>
                        run(
                          async () => {
                            const res = await completeViewing(v.id, propertyId, fd);
                            if (res.ok) toast.success(res.message!);
                          },
                          () => setCompletingId(null),
                        )
                      }
                      className="mt-3 space-y-2 rounded-md bg-muted/50 p-3"
                    >
                      <Label className="text-xs">Rating</Label>
                      <StarRatingInput name="rating" defaultValue={v.rating ?? 0} />
                      <Textarea name="notes" rows={2} placeholder="How was it?" defaultValue={v.notes ?? ""} />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm"><Check className="size-4" />Save outcome</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setCompletingId(null)}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.status !== "completed" && (
                        <Button size="xs" variant="outline" onClick={() => setCompletingId(v.id)}>
                          <Check className="size-3.5" />Mark completed
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(v.id)}>
                        <Pencil className="size-3.5" />Edit
                      </Button>
                      {v.status === "planned" && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => run(async () => { await cancelViewing(v.id, propertyId); })}
                        >
                          <Ban className="size-3.5" />Cancel
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => run(async () => { await deleteViewing(v.id, propertyId); })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          ref={addRef}
          action={(fd) =>
            run(
              async () => {
                const res = await addViewing(propertyId, fd);
                if (res.ok) {
                  toast.success(res.message!);
                  addRef.current?.reset();
                } else toast.error(res.message!);
              },
              () => setAdding(false),
            )
          }
          className="space-y-3 rounded-lg border p-3"
        >
          <ViewingFields />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Schedule viewing</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" />Add viewing
        </Button>
      )}
    </div>
  );
}
