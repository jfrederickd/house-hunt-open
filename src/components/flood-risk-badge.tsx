import { Droplets } from "lucide-react";
import { floodRiskMeta } from "@/lib/enums";
import { cn } from "@/lib/utils";

/**
 * Flood-risk pill. Renders nothing when the risk hasn't been recorded, unless
 * `showUnchecked` is set (then a muted "Flood: not checked" prompt).
 */
export function FloodRiskBadge({
  risk,
  className,
  showUnchecked = false,
  compact = false,
}: {
  risk: string | null | undefined;
  className?: string;
  showUnchecked?: boolean;
  /** drop the "Flood:" prefix (e.g. under a column already labelled "Flood") */
  compact?: boolean;
}) {
  const meta = floodRiskMeta(risk);
  const prefix = compact ? "" : "Flood: ";

  if (!meta) {
    if (!showUnchecked) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Droplets className="size-3" />
        {`${prefix}not checked`}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badgeClass,
        className,
      )}
      title={meta.detail}
    >
      <Droplets className="size-3" />
      {`${prefix}${meta.label}`}
    </span>
  );
}
