import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const properties = await prisma.property.findMany({
    include: { viewings: true, photos: true },
    orderBy: { createdAt: "asc" },
  });
  const count = properties.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Private off-market opportunities in Cliffhaven.
          </p>
        </div>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Home className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No properties yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first opportunity, or seed from the import script.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/properties/new" />}>
            <Plus className="size-4" />
            Add property
          </Button>
        </div>
      ) : (
        <DashboardClient properties={properties} />
      )}
    </div>
  );
}
