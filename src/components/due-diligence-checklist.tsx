"use client";

import { useRef, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DueDiligenceItem } from "@/generated/prisma/client";
import {
  toggleDueDiligence,
  addDueDiligenceItem,
  deleteDueDiligenceItem,
} from "@/lib/actions/properties";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DueDiligenceChecklist({
  propertyId,
  items,
}: {
  propertyId: string;
  items: DueDiligenceItem[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {done} of {items.length} done
        </span>
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <Checkbox
              id={`dd-${item.id}`}
              checked={item.done}
              onCheckedChange={(checked) =>
                startTransition(async () => {
                  await toggleDueDiligence(item.id, propertyId, checked === true);
                })
              }
            />
            <label
              htmlFor={`dd-${item.id}`}
              className={`flex-1 cursor-pointer text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
            >
              {item.label}
            </label>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await deleteDueDiligenceItem(item.id, propertyId);
                })
              }
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label={`Delete ${item.label}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <form
        ref={formRef}
        action={(formData) => {
          startTransition(async () => {
            await addDueDiligenceItem(propertyId, formData);
            formRef.current?.reset();
          });
        }}
        className="flex items-center gap-2 pt-1"
      >
        <Input name="label" placeholder="Add a check…" className="h-8" />
        <Button type="submit" size="sm" variant="outline">
          <Plus className="size-4" />
          Add
        </Button>
      </form>
    </div>
  );
}
