"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dateFromInputValue, parseNzTime } from "@/lib/dates";
import type { ActionState } from "@/lib/actions/properties";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function parseRating(formData: FormData): number | null {
  const v = str(formData, "rating");
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function revalidate(propertyId: string) {
  revalidatePath("/");
  revalidatePath("/viewings");
  revalidatePath(`/properties/${propertyId}`);
}

export async function addViewing(propertyId: string, formData: FormData): Promise<ActionState> {
  const scheduledDate = dateFromInputValue(str(formData, "scheduledDate"));
  const scheduledTime = parseNzTime(str(formData, "scheduledTime"));
  if (!scheduledDate && !scheduledTime) {
    return { ok: false, message: "Add at least a date or a time." };
  }

  await prisma.viewing.create({
    data: {
      propertyId,
      scheduledDate,
      scheduledTime,
      attendees: str(formData, "attendees"),
      notes: str(formData, "notes"),
      status: "planned",
    },
  });

  // Gentle pipeline sync: a new viewing nudges an early-stage property forward.
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { status: true } });
  if (property && (property.status === "new" || property.status === "contacted")) {
    await prisma.property.update({ where: { id: propertyId }, data: { status: "viewing_scheduled" } });
  }

  revalidate(propertyId);
  return { ok: true, message: "Viewing scheduled." };
}

export async function updateViewing(
  id: string,
  propertyId: string,
  formData: FormData,
): Promise<ActionState> {
  await prisma.viewing.update({
    where: { id },
    data: {
      scheduledDate: dateFromInputValue(str(formData, "scheduledDate")),
      scheduledTime: parseNzTime(str(formData, "scheduledTime")),
      attendees: str(formData, "attendees"),
      notes: str(formData, "notes"),
    },
  });
  revalidate(propertyId);
  return { ok: true, message: "Viewing updated." };
}

export async function completeViewing(
  id: string,
  propertyId: string,
  formData: FormData,
): Promise<ActionState> {
  await prisma.viewing.update({
    where: { id },
    data: {
      status: "completed",
      notes: str(formData, "notes"),
      rating: parseRating(formData),
    },
  });

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { status: true } });
  if (property && property.status === "viewing_scheduled") {
    await prisma.property.update({ where: { id: propertyId }, data: { status: "viewed" } });
  }

  revalidate(propertyId);
  return { ok: true, message: "Viewing marked complete." };
}

export async function cancelViewing(id: string, propertyId: string): Promise<void> {
  await prisma.viewing.update({ where: { id }, data: { status: "cancelled" } });
  revalidate(propertyId);
}

export async function deleteViewing(id: string, propertyId: string): Promise<void> {
  await prisma.viewing.delete({ where: { id } });
  revalidate(propertyId);
}
