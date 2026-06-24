// Domain helpers for the criteria assessment feature.

import type { Criterion, CriterionAssessment, Person } from "@/generated/prisma/client";
import {
  VERDICT_OPTIONS,
  ASSESSMENT_FLAGS,
  type CriterionType,
  type VerdictKey,
  type AssessmentFlag,
} from "@/lib/enums";

export function parseOptions(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const assessmentKey = (criterionId: string, personId: string) =>
  `${criterionId}:${personId}`;

/** Has this assessment been filled in at all? */
export function isAssessed(
  a: Pick<CriterionAssessment, "value" | "notes" | "flag"> | undefined | null,
): boolean {
  if (!a) return false;
  return (
    (a.value != null && a.value !== "") ||
    (a.notes != null && a.notes.trim() !== "") ||
    a.flag != null
  );
}

export function verdictMeta(key: string | null | undefined) {
  return VERDICT_OPTIONS.find((v) => v.key === key) ?? null;
}

export function flagMeta(key: string | null | undefined) {
  return ASSESSMENT_FLAGS.find((f) => f.key === key) ?? null;
}

/** Human-readable display of a stored value for a given criterion type. */
export function formatAssessmentValue(
  type: CriterionType,
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "—";
  switch (type) {
    case "verdict":
      return verdictMeta(value)?.label ?? value;
    case "rating":
      return `${value}/5`;
    case "boolean":
      return value === "true" ? "Yes" : "No";
    case "choice":
    case "text":
    default:
      return value;
  }
}

/** A coarse 0..1 desirability score for a value, used to detect disagreement. */
export function valueScore(
  type: CriterionType,
  value: string | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  switch (type) {
    case "verdict": {
      const k = value as VerdictKey;
      return k === "yes" ? 1 : k === "maybe" ? 0.5 : 0;
    }
    case "rating": {
      const n = Number(value);
      return Number.isFinite(n) ? (n - 1) / 4 : null;
    }
    case "boolean":
      return value === "true" ? 1 : 0;
    default:
      return null; // choice/text aren't on a desirability axis
  }
}

export type AssessmentLike = Pick<
  CriterionAssessment,
  "criterionId" | "personId" | "value" | "notes" | "flag"
>;

/** Do the people materially disagree on this criterion? */
export function isDisagreement(
  criterion: Pick<Criterion, "id" | "type">,
  assessments: AssessmentLike[],
): boolean {
  const forCrit = assessments.filter((a) => a.criterionId === criterion.id);
  // Any flag mismatch (e.g. one deal-breaker, one love) counts as disagreement.
  const flags = new Set(forCrit.map((a) => a.flag ?? ""));
  if (forCrit.some((a) => a.flag === "deal_breaker") && flags.size > 1) return true;

  const scores = forCrit
    .map((a) => valueScore(criterion.type as CriterionType, a.value))
    .filter((s): s is number => s != null);
  if (scores.length >= 2) {
    if (Math.max(...scores) - Math.min(...scores) >= 0.5) return true;
  }
  // For choice, disagreement = different selected options.
  if (criterion.type === "choice") {
    const vals = new Set(forCrit.map((a) => a.value).filter((v) => v != null && v !== ""));
    if (vals.size >= 2) return true;
  }
  return false;
}

export type CriteriaSummary = {
  total: number;
  assessedByPerson: Record<string, number>;
  dealBreakers: { criterionId: string; personId: string }[];
  disagreements: number;
};

export function summarise(
  criteria: (Pick<Criterion, "id" | "type"> & { active?: boolean })[],
  people: Pick<Person, "id">[],
  assessments: AssessmentLike[],
): CriteriaSummary {
  // Inputs are normally already the active criteria; treat missing active as true.
  const active = criteria.filter((c) => c.active !== false);
  const assessedByPerson: Record<string, number> = {};
  for (const p of people) {
    assessedByPerson[p.id] = active.filter((c) =>
      isAssessed(assessments.find((a) => a.criterionId === c.id && a.personId === p.id)),
    ).length;
  }
  const dealBreakers = assessments
    .filter((a) => a.flag === "deal_breaker")
    .map((a) => ({ criterionId: a.criterionId, personId: a.personId }));
  const disagreements = active.filter((c) => isDisagreement(c, assessments)).length;
  return { total: active.length, assessedByPerson, dealBreakers, disagreements };
}

export type FlagType = AssessmentFlag;

export type PersonScore = {
  /** 0–100 weighted desirability across the criteria this person scored. */
  pct: number;
  /** how many active criteria the person has filled in (any value/notes/flag). */
  assessed: number;
  /** how many contributed a numeric score (verdict/rating/boolean). */
  scored: number;
  /** has this person flagged a deal-breaker on this property? */
  dealBreaker: boolean;
};

/**
 * One person's weighted criteria score for a property (0–100), or null if they
 * haven't scored anything yet. Choice/text criteria aren't on a desirability
 * axis, so they count toward "assessed" but not the score.
 */
export function personScore(
  criteria: (Pick<Criterion, "id" | "type" | "weight"> & { active?: boolean })[],
  assessments: AssessmentLike[],
  personId: string,
): PersonScore | null {
  const active = criteria.filter((c) => c.active !== false);
  let weightSum = 0;
  let weighted = 0;
  let assessed = 0;
  let scored = 0;
  let dealBreaker = false;

  for (const c of active) {
    const a = assessments.find((x) => x.criterionId === c.id && x.personId === personId);
    if (!a) continue;
    if (isAssessed(a)) assessed++;
    if (a.flag === "deal_breaker") dealBreaker = true;
    const s = valueScore(c.type as CriterionType, a.value);
    if (s != null) {
      const w = c.weight || 1;
      weightSum += w;
      weighted += w * s;
      scored++;
    }
  }

  if (assessed === 0) return null;
  const pct = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : 0;
  return { pct, assessed, scored, dealBreaker };
}
