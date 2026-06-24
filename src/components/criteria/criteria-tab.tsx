"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardList,
  Columns3,
  Check,
  Loader2,
  Settings2,
  TriangleAlert,
  Heart,
  Ban,
  CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CriterionControl } from "@/components/criteria/criterion-control";
import { saveAssessment } from "@/lib/actions/criteria";
import {
  ASSESSMENT_FLAGS,
  type CriterionType,
  type AssessmentFlag,
} from "@/lib/enums";
import {
  assessmentKey,
  isAssessed,
  isDisagreement,
  summarise,
  formatAssessmentValue,
  verdictMeta,
  flagMeta,
  type AssessmentLike,
} from "@/lib/criteria";

export type CriterionDTO = {
  id: string;
  label: string;
  type: CriterionType;
  options: string[];
  mustHave: boolean;
  weight: number;
};
export type PersonDTO = { id: string; name: string };
export type AssessmentDTO = {
  criterionId: string;
  personId: string;
  value: string | null;
  notes: string | null;
  flag: string | null;
};

type Cell = { value: string | null; notes: string | null; flag: string | null };
const EMPTY: Cell = { value: null, notes: null, flag: null };

const WIDE_QUERY = "(min-width: 1024px)";
function useIsWide() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(WIDE_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false, // server snapshot: assume narrow (mobile-first)
  );
}

const flagIcon: Record<AssessmentFlag, typeof Heart> = {
  love: Heart,
  concern: CircleAlert,
  deal_breaker: Ban,
};

export function CriteriaTab({
  propertyId,
  criteria,
  people,
  activePersonId,
  assessments,
}: {
  propertyId: string;
  criteria: CriterionDTO[];
  people: PersonDTO[];
  activePersonId: string;
  assessments: AssessmentDTO[];
}) {
  const [edits, setEdits] = useState<Record<string, Cell>>(() => {
    const m: Record<string, Cell> = {};
    for (const a of assessments) {
      m[assessmentKey(a.criterionId, a.personId)] = {
        value: a.value,
        notes: a.notes,
        flag: a.flag,
      };
    }
    return m;
  });
  // Authoritative store for merging; only written inside event handlers below.
  const editsRef = useRef(edits);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingCount, setSavingCount] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Default to compare on wide screens, inspection on small (mobile-first);
  // a manual toggle overrides the default.
  const isWide = useIsWide();
  const [override, setOverride] = useState<"inspect" | "compare" | null>(null);
  const mode = override ?? (isWide ? "compare" : "inspect");
  const setMode = setOverride;

  const cellOf = (criterionId: string, personId: string): Cell =>
    edits[assessmentKey(criterionId, personId)] ?? EMPTY;

  async function persist(criterionId: string, personId: string, next: Cell) {
    setSavingCount((n) => n + 1);
    try {
      await saveAssessment({ propertyId, criterionId, personId, ...next });
      setSavedAt(Date.now());
    } catch {
      toast.error("Couldn't save that — check your connection and try again.");
    } finally {
      setSavingCount((n) => n - 1);
    }
  }

  function update(
    criterionId: string,
    personId: string,
    partial: Partial<Cell>,
    debounce = false,
  ) {
    const key = assessmentKey(criterionId, personId);
    const cur = editsRef.current[key] ?? EMPTY;
    const next = { ...cur, ...partial };
    editsRef.current = { ...editsRef.current, [key]: next };
    setEdits((prev) => ({ ...prev, [key]: next }));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    if (debounce) {
      timers.current[key] = setTimeout(() => persist(criterionId, personId, next), 600);
    } else {
      persist(criterionId, personId, next);
    }
  }

  // Live assessment list (reflecting unsaved edits) for summary + disagreement.
  const live: AssessmentLike[] = useMemo(
    () =>
      Object.entries(edits).map(([k, v]) => {
        const [criterionId, personId] = k.split(":");
        return { criterionId, personId, ...v };
      }),
    [edits],
  );

  const summary = useMemo(
    () => summarise(criteria, people, live),
    [criteria, people, live],
  );

  const activePerson = people.find((p) => p.id === activePersonId) ?? people[0];

  if (criteria.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <ClipboardList className="size-6" />
        <p className="text-sm">No active criteria. Add some in settings.</p>
        <Link href="/criteria" className="text-sm font-medium text-foreground underline">
          Manage criteria
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-0.5">
          <ModeButton active={mode === "inspect"} onClick={() => setMode("inspect")} icon={ClipboardList}>
            Inspection
          </ModeButton>
          <ModeButton active={mode === "compare"} onClick={() => setMode("compare")} icon={Columns3}>
            Compare
          </ModeButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <SaveIndicator saving={savingCount > 0} savedAt={savedAt} />
          <Link href="/criteria" className="inline-flex items-center gap-1 hover:text-foreground">
            <Settings2 className="size-3.5" />
            Manage
          </Link>
        </div>
      </div>

      {mode === "inspect" ? (
        <InspectionMode
          criteria={criteria}
          activePerson={activePerson}
          cellOf={cellOf}
          update={update}
          assessedCount={summary.assessedByPerson[activePerson.id] ?? 0}
          total={summary.total}
        />
      ) : (
        <CompareMode
          criteria={criteria}
          people={people}
          cellOf={cellOf}
          live={live}
          summary={summary}
        />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ClipboardList;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <Check className="size-3.5" />
        Saved
      </span>
    );
  }
  return <span className="text-muted-foreground/70">Autosaves</span>;
}

// ---- Inspection mode --------------------------------------------------------

function InspectionMode({
  criteria,
  activePerson,
  cellOf,
  update,
  assessedCount,
  total,
}: {
  criteria: CriterionDTO[];
  activePerson: PersonDTO;
  cellOf: (criterionId: string, personId: string) => Cell;
  update: (criterionId: string, personId: string, partial: Partial<Cell>, debounce?: boolean) => void;
  assessedCount: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((assessedCount / total) * 100);
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{activePerson.name}&apos;s assessment</span>
          <span className="text-muted-foreground">
            {assessedCount} of {total} done
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((c) => {
          const cell = cellOf(c.id, activePerson.id);
          return (
            <div key={c.id} className="rounded-xl border p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.label}</span>
                  {c.mustHave && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      Must-have
                    </span>
                  )}
                </div>
              </div>

              <CriterionControl
                type={c.type}
                options={c.options}
                value={cell.value}
                onChange={(v) => update(c.id, activePerson.id, { value: v }, c.type === "text")}
              />

              <textarea
                value={cell.notes ?? ""}
                onChange={(e) => update(c.id, activePerson.id, { notes: e.target.value || null }, true)}
                placeholder="Notes…"
                rows={2}
                className="mt-3 w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />

              <FlagChips
                value={cell.flag}
                onChange={(f) => update(c.id, activePerson.id, { flag: f })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagChips({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (flag: string | null) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {ASSESSMENT_FLAGS.map((f) => {
        const Icon = flagIcon[f.key];
        const selected = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(selected ? null : f.key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              selected ? "border-transparent text-white" : "text-muted-foreground hover:bg-muted",
            )}
            style={selected ? { backgroundColor: f.color } : undefined}
          >
            <Icon className="size-3.5" />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- Compare mode -----------------------------------------------------------

function CompareMode({
  criteria,
  people,
  cellOf,
  live,
  summary,
}: {
  criteria: CriterionDTO[];
  people: PersonDTO[];
  cellOf: (criterionId: string, personId: string) => Cell;
  live: AssessmentLike[];
  summary: ReturnType<typeof summarise>;
}) {
  return (
    <div className="space-y-4">
      {/* Summary band */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
        {people.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">
              {summary.assessedByPerson[p.id] ?? 0}/{summary.total}
            </span>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          {summary.disagreements > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <TriangleAlert className="size-4" />
              {summary.disagreements} disagreement{summary.disagreements === 1 ? "" : "s"}
            </span>
          )}
          {summary.dealBreakers.length > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <Ban className="size-4" />
              {summary.dealBreakers.length} deal-breaker{summary.dealBreakers.length === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Criterion</th>
              {people.map((p) => (
                <th key={p.id} className="px-4 py-3 font-medium">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => {
              const disagree = isDisagreement(c, live);
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b last:border-0 align-top",
                    disagree && "bg-amber-50",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.label}</span>
                      {c.mustHave && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                          Must
                        </span>
                      )}
                      {disagree && <TriangleAlert className="size-3.5 text-amber-600" />}
                    </div>
                  </td>
                  {people.map((p) => {
                    const cell = cellOf(c.id, p.id);
                    return <CompareCell key={p.id} type={c.type} cell={cell} />;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Rows where you disagree are highlighted. Switch to Inspection mode (or use the header
        person selector) to record your own answers.
      </p>
    </div>
  );
}

function CompareCell({ type, cell }: { type: CriterionType; cell: Cell }) {
  const assessed = isAssessed(cell);
  const fMeta = flagMeta(cell.flag);
  const vMeta = type === "verdict" ? verdictMeta(cell.value) : null;
  const isDealBreaker = cell.flag === "deal_breaker";

  return (
    <td
      className={cn(
        "px-4 py-3",
        !assessed && "bg-muted/20 text-muted-foreground",
        isDealBreaker && "bg-red-50",
      )}
    >
      {!assessed ? (
        <span className="text-muted-foreground/60">—</span>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {vMeta && (
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: vMeta.color }}
              />
            )}
            <span className="font-medium">{formatAssessmentValue(type, cell.value)}</span>
          </div>
          {fMeta && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: fMeta.color }}
            >
              {fMeta.label}
            </span>
          )}
          {cell.notes && <p className="text-xs text-muted-foreground">{cell.notes}</p>}
        </div>
      )}
    </td>
  );
}
