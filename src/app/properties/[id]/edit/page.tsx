import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/property-form";
import { updateProperty } from "@/lib/actions/properties";
import { displayAddress } from "@/lib/property";
import { DeletePropertyButton } from "@/components/delete-property-button";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const action = updateProperty.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to property
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Edit {displayAddress(property)}</h1>
          <DeletePropertyButton id={id} label={displayAddress(property)} />
        </div>
      </div>
      <PropertyForm action={action} property={property} submitLabel="Save changes" />
    </div>
  );
}
