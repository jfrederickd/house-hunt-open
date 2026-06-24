"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { addViewing } from "@/lib/actions/viewings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function QuickAddViewing({ properties }: { properties: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");

  if (properties.length === 0) return null;

  return (
    <div>
      {open ? (
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              if (!propertyId) {
                toast.error("Pick a property.");
                return;
              }
              const res = await addViewing(propertyId, fd);
              if (res.ok) {
                toast.success(res.message!);
                formRef.current?.reset();
                setOpen(false);
              } else {
                toast.error(res.message!);
              }
            })
          }
          className="space-y-3 rounded-xl border p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Property</Label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" name="scheduledDate" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <Input type="time" name="scheduledTime" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Attendees</Label>
              <Input name="attendees" placeholder="e.g. both of us" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea name="notes" rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>Schedule viewing</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm">
          <CalendarPlus className="size-4" />
          Quick add viewing
        </Button>
      )}
    </div>
  );
}
