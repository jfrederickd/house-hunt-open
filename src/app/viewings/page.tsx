import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { displayAddress } from "@/lib/property";
import { formatDate, todayUtcMs } from "@/lib/dates";
import { QuickAddViewing } from "@/components/quick-add-viewing";
import { ViewingListItem } from "@/components/viewings/viewing-list-item";
import type { Viewing, Property } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type Row = Viewing & { property: Property };

export default async function ViewingsPage() {
  const viewings = await prisma.viewing.findMany({
    include: { property: true },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
  });
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "asc" } });

  // "Upcoming" = planned, dated today-or-later OR with no date yet.
  // "Today" is judged in NZ time (not the UTC server clock) so a viewing whose
  // date has passed in NZ doesn't linger in Upcoming for ~12 hours.
  const todayUtc = todayUtcMs();
  const isUpcoming = (v: Row) =>
    v.status === "planned" && (v.scheduledDate == null || v.scheduledDate.getTime() >= todayUtc);

  const upcoming = viewings.filter(isUpcoming);
  const past = viewings.filter((v) => !isUpcoming(v)).reverse(); // most recent first

  // Group upcoming by date heading.
  const groups = new Map<string, Row[]>();
  for (const v of upcoming) {
    const key = v.scheduledDate
      ? formatDate(v.scheduledDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "Date to be confirmed";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Viewings</h1>
          <p className="text-sm text-muted-foreground">
            {upcoming.length === 0 ? "Nothing scheduled." : `${upcoming.length} upcoming across all properties.`}
          </p>
        </div>
        <QuickAddViewing properties={properties.map((p) => ({ id: p.id, label: displayAddress(p) }))} />
      </div>

      {/* Upcoming */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
            <CalendarDays className="size-6" />
            <p className="text-sm">No upcoming viewings.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {[...groups.entries()].map(([heading, rows]) => (
              <div key={heading}>
                <h3 className="mb-2 text-sm font-medium">{heading}</h3>
                <ul className="space-y-2">
                  {rows.map((v) => (
                    <ViewingListItem
                      key={v.id}
                      viewing={v}
                      propertyId={v.property.id}
                      propertyLabel={displayAddress(v.property)}
                      propertyStatus={v.property.status}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past / completed */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past &amp; completed</h2>
          <ul className="space-y-2">
            {past.map((v) => (
              <ViewingListItem
                key={v.id}
                viewing={v}
                propertyId={v.property.id}
                propertyLabel={displayAddress(v.property)}
                propertyStatus={v.property.status}
                muted
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
