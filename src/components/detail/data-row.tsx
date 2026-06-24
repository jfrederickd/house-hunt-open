import { SourceBadge } from "@/components/source-badge";
import type { FieldSource } from "@/lib/enums";

/** A label / value row with an optional provenance badge, for the detail panels. */
export function DataRow({
  label,
  value,
  source,
}: {
  label: string;
  value: React.ReactNode;
  source?: FieldSource | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-right text-sm font-medium">
        {value}
        {source && <SourceBadge source={source} />}
      </dd>
    </div>
  );
}
