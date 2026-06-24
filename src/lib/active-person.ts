import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_PERSON_COOKIE = "activePersonId";

export async function getPeople() {
  return prisma.person.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * The people plus whichever is currently "active" (from the cookie, falling
 * back to the first). Used by the header selector and the detail page so
 * Inspection mode defaults to the right person.
 */
export async function getActivePerson() {
  // Resilient: the root layout calls this on every route, including during the
  // container image build when no database exists yet. Never throw.
  try {
    const people = await getPeople();
    if (people.length === 0) return { people, activePersonId: null as string | null };
    const cookieStore = await cookies();
    const cookieId = cookieStore.get(ACTIVE_PERSON_COOKIE)?.value;
    const active = people.find((p) => p.id === cookieId) ?? people[0];
    return { people, activePersonId: active.id };
  } catch {
    return { people: [], activePersonId: null as string | null };
  }
}
