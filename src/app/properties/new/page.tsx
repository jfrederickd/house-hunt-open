import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PropertyForm } from "@/components/property-form";
import { createProperty } from "@/lib/actions/properties";

export const dynamic = "force-dynamic";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add property</h1>
        <p className="text-sm text-muted-foreground">
          Every field is optional except the address. You can paste valuations and
          photos later from the detail page.
        </p>
      </div>
      <PropertyForm action={createProperty} submitLabel="Create property" />
    </div>
  );
}
