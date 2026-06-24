"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ACTIVE_PERSON_COOKIE } from "@/lib/active-person";
import { CRITERION_TYPES, type CriterionType } from "@/lib/enums";

// ---- active person ----------------------------------------------------------

export async function setActivePerson(personId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PERSON_COOKIE, personId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Refresh everything so the header + Inspection mode reflect the new person.
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- assessments (autosave) -------------------------------------------------

export type SaveAssessmentInput = {
  propertyId: string;
  criterionId: string;
  personId: string;
  value?: string | null;
  notes?: string | null;
  flag?: string | null;
};

/**
 * Upsert one person's assessment of one criterion for one property.
 * Deliberately does NOT revalidate: the Criteria tab is a client component that
 * keeps its own state, so re-rendering the page would just disrupt typing.
 */
export async function saveAssessment(input: SaveAssessmentInput) {
  const { propertyId, criterionId, personId } = input;
  const data = {
    value: input.value ?? null,
    notes: input.notes ?? null,
    flag: input.flag ?? null,
  };
  await prisma.criterionAssessment.upsert({
    where: { propertyId_criterionId_personId: { propertyId, criterionId, personId } },
    update: data,
    create: { propertyId, criterionId, personId, ...data },
  });
  return { ok: true };
}

// ---- people (settings) ------------------------------------------------------

export async function renamePerson(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Name can't be empty." };
  await prisma.person.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addPerson(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Name can't be empty." };
  const count = await prisma.person.count();
  await prisma.person.create({ data: { name: trimmed, sortOrder: count } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- criteria (settings) ----------------------------------------------------

function normaliseType(type: string): CriterionType {
  return (CRITERION_TYPES as readonly string[]).includes(type)
    ? (type as CriterionType)
    : "verdict";
}

export type CriterionInput = {
  label: string;
  type: string;
  options?: string[]; // for choice
  mustHave?: boolean;
  weight?: number;
};

function cleanOptions(type: CriterionType, options?: string[]): string | null {
  if (type !== "choice") return null;
  const opts = (options ?? []).map((o) => o.trim()).filter(Boolean);
  return opts.length ? JSON.stringify(opts) : null;
}

export async function createCriterion(input: CriterionInput) {
  const label = input.label.trim();
  if (!label) return { ok: false, message: "Label is required." };
  const type = normaliseType(input.type);
  const max = await prisma.criterion.aggregate({ _max: { sortOrder: true } });
  await prisma.criterion.create({
    data: {
      label,
      type,
      options: cleanOptions(type, input.options),
      mustHave: input.mustHave ?? false,
      weight: input.weight ?? 1,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCriterion(id: string, input: CriterionInput) {
  const label = input.label.trim();
  if (!label) return { ok: false, message: "Label is required." };
  const type = normaliseType(input.type);
  await prisma.criterion.update({
    where: { id },
    data: {
      label,
      type,
      options: cleanOptions(type, input.options),
      mustHave: input.mustHave ?? false,
      weight: input.weight ?? 1,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCriterionActive(id: string, active: boolean) {
  await prisma.criterion.update({ where: { id }, data: { active } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Move a criterion up or down by swapping sortOrder with its neighbour. */
export async function reorderCriterion(id: string, direction: "up" | "down") {
  const all = await prisma.criterion.findMany({ orderBy: { sortOrder: "asc" } });
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return { ok: false };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= all.length) return { ok: true }; // already at edge
  const a = all[idx];
  const b = all[swapWith];
  await prisma.$transaction([
    prisma.criterion.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.criterion.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}
