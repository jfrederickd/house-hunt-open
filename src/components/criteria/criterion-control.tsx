"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { VERDICT_OPTIONS, type CriterionType } from "@/lib/enums";

export function CriterionControl({
  type,
  options,
  value,
  onChange,
}: {
  type: CriterionType;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const toggle = (v: string) => onChange(value === v ? null : v);

  if (type === "verdict") {
    return (
      <div className="flex flex-wrap gap-2">
        {VERDICT_OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                selected
                  ? "border-transparent text-white"
                  : "hover:bg-muted",
              )}
              style={selected ? { backgroundColor: o.color } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "rating") {
    const current = value ? Number(value) : 0;
    return (
      <div className="inline-flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n}`}
            onClick={() => onChange(n === current ? null : String(n))}
            className="rounded p-0.5"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                n <= current ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  if (type === "choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && (
          <span className="text-sm text-muted-foreground">No options configured.</span>
        )}
        {options.map((o) => {
          const selected = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="flex gap-2">
        {[
          { v: "true", label: "Yes" },
          { v: "false", label: "No" },
        ].map((o) => {
          const selected = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => toggle(o.v)}
              className={cn(
                "rounded-full border px-4 py-1 text-sm font-medium transition-colors",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // text
  return (
    <Textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder="Type your answer…"
      rows={2}
    />
  );
}
