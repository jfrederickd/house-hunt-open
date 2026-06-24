import type { Viewing } from "@/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toInputDateValue, toInputTimeValue } from "@/lib/dates";

/** Shared date/time/attendees/notes fields for the add + edit viewing forms. */
export function ViewingFields({ viewing }: { viewing?: Viewing }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Date</Label>
        <Input type="date" name="scheduledDate" defaultValue={toInputDateValue(viewing?.scheduledDate)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Time</Label>
        <Input type="time" name="scheduledTime" defaultValue={toInputTimeValue(viewing?.scheduledTime)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Attendees</Label>
        <Input name="attendees" placeholder="e.g. both of us" defaultValue={viewing?.attendees ?? ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs">Notes</Label>
        <Textarea name="notes" rows={2} placeholder="Anything to remember" defaultValue={viewing?.notes ?? ""} />
      </div>
    </div>
  );
}
