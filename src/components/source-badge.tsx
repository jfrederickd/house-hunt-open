import { FIELD_SOURCE_LABELS, type FieldSource } from "@/lib/enums";
import { cn } from "@/lib/utils";

const STYLES: Record<FieldSource, string> = {
  manual: "bg-secondary text-secondary-foreground",
  api: "bg-chart-1/15 text-foreground",
  estimated: "bg-chart-3/15 text-foreground",
};

/**
 * Tiny provenance chip shown next to a value: manual | api | estimated.
 * Renders nothing when the source is unknown (keeps panels uncluttered).
 */
export function SourceBadge({
  source,
  className,
}: {
  source: FieldSource | null | undefined;
  className?: string;
}) {
  if (!source) return null;
  return (
    <span
      title={`Source: ${FIELD_SOURCE_LABELS[source]}`}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STYLES[source],
        className,
      )}
    >
      {FIELD_SOURCE_LABELS[source]}
    </span>
  );
}
