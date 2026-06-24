"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/actions/properties";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_META,
  ORGANISED_THROUGH,
  ORGANISED_THROUGH_LABELS,
  FLOOD_RISK_LEVELS,
} from "@/lib/enums";
import { toInputDateValue } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const INITIAL: ActionState = { ok: false };

export function PropertyForm({
  action,
  property,
  submitLabel = "Save",
}: {
  action: FormAction;
  property?: Property | null;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const errors = state.errors ?? {};
  const p = property;

  return (
    <form action={formAction} className="space-y-8">
      {state.message && !state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Section title="Contact & pipeline">
        <Field label="Contact name" error={errors.contactName}>
          <Input name="contactName" defaultValue={p?.contactName ?? ""} placeholder="e.g. Ava" />
        </Field>
        <Field label="Organised through" error={errors.organisedThrough}>
          <NativeSelect name="organisedThrough" defaultValue={p?.organisedThrough ?? ""}>
            <option value="">—</option>
            {ORGANISED_THROUGH.map((o) => (
              <option key={o} value={o}>
                {ORGANISED_THROUGH_LABELS[o]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Pipeline status" error={errors.status}>
          <NativeSelect name="status" defaultValue={p?.status ?? "new"}>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PIPELINE_STATUS_META[s].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </Section>

      <Section title="Address" hint="Manually entered. Geocoding fills lat/lng on save; you can also override them.">
        <Field label="Address (raw)" error={errors.addressRaw} required className="sm:col-span-2">
          <Input name="addressRaw" defaultValue={p?.addressRaw ?? ""} placeholder="e.g. 14 Rimu Avenue, Cliffhaven" required />
        </Field>
        <Field label="Street address" error={errors.streetAddress}>
          <Input name="streetAddress" defaultValue={p?.streetAddress ?? ""} placeholder="14 Rimu Avenue" />
        </Field>
        <Field label="Suburb" error={errors.suburb}>
          <Input name="suburb" defaultValue={p?.suburb ?? ""} placeholder="Cliffhaven" />
        </Field>
        <Field label="City" error={errors.city}>
          <Input name="city" defaultValue={p?.city ?? ""} placeholder="Rivermouth" />
        </Field>
        <Field label="Postcode" error={errors.postcode}>
          <Input name="postcode" defaultValue={p?.postcode ?? ""} placeholder="9012" />
        </Field>
        <Field label="Latitude (override)" error={errors.lat}>
          <Input name="lat" defaultValue={p?.lat ?? ""} placeholder="-43.5675" inputMode="decimal" />
        </Field>
        <Field label="Longitude (override)" error={errors.lng}>
          <Input name="lng" defaultValue={p?.lng ?? ""} placeholder="172.7546" inputMode="decimal" />
        </Field>
      </Section>

      <Section title="Valuation" hint="Open the deep-links on the detail page, read the figures, and paste them here.">
        <Field label="Capital value (CV/RV)" error={errors.capitalValue}>
          <Input name="capitalValue" defaultValue={p?.capitalValue ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="CV date" error={errors.capitalValueDate}>
          <Input type="date" name="capitalValueDate" defaultValue={toInputDateValue(p?.capitalValueDate)} />
        </Field>
        <Field label="Land value" error={errors.landValue}>
          <Input name="landValue" defaultValue={p?.landValue ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Improvement value" error={errors.improvementValue}>
          <Input name="improvementValue" defaultValue={p?.improvementValue ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="homes.co.nz estimate" error={errors.homesEstimate}>
          <Input name="homesEstimate" defaultValue={p?.homesEstimate ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Estimate low" error={errors.homesEstimateLow}>
          <Input name="homesEstimateLow" defaultValue={p?.homesEstimateLow ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Estimate high" error={errors.homesEstimateHigh}>
          <Input name="homesEstimateHigh" defaultValue={p?.homesEstimateHigh ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Other estimate" error={errors.otherEstimate}>
          <Input name="otherEstimate" defaultValue={p?.otherEstimate ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Other estimate source" error={errors.otherEstimateSource}>
          <Input name="otherEstimateSource" defaultValue={p?.otherEstimateSource ?? ""} placeholder="e.g. OneRoof" />
        </Field>
      </Section>

      <Section title="Property facts">
        <Field label="Bedrooms" error={errors.bedrooms}>
          <Input name="bedrooms" defaultValue={p?.bedrooms ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Bathrooms" error={errors.bathrooms}>
          <Input name="bathrooms" defaultValue={p?.bathrooms ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Parking" error={errors.parking}>
          <Input name="parking" defaultValue={p?.parking ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Floor area (m²)" error={errors.floorAreaM2}>
          <Input name="floorAreaM2" defaultValue={p?.floorAreaM2 ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Land area (m²)" error={errors.landAreaM2}>
          <Input name="landAreaM2" defaultValue={p?.landAreaM2 ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Year built" error={errors.yearBuilt}>
          <Input name="yearBuilt" defaultValue={p?.yearBuilt ?? ""} inputMode="numeric" placeholder="e.g. 1998" />
        </Field>
        <Field label="Property type" error={errors.propertyType}>
          <Input name="propertyType" defaultValue={p?.propertyType ?? ""} placeholder="e.g. House" />
        </Field>
      </Section>

      <Section
        title="Flood risk"
        hint="Look the address up on the CCC flood viewer (linked on the detail page) and record the worst extent it falls within."
      >
        <Field label="Flood risk" error={errors.floodRisk}>
          <NativeSelect name="floodRisk" defaultValue={p?.floodRisk ?? ""}>
            <option value="">Not checked</option>
            {FLOOD_RISK_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label} — {l.detail.replace(/\.$/, "")}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </Section>

      <Section title="Sale history & offer inputs">
        <Field label="Last sale price" error={errors.lastSalePrice}>
          <Input name="lastSalePrice" defaultValue={p?.lastSalePrice ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Last sale date" error={errors.lastSaleDate}>
          <Input type="date" name="lastSaleDate" defaultValue={toInputDateValue(p?.lastSaleDate)} />
        </Field>
        <Field label="Comparable $/m² (floor)" error={errors.compPricePerM2} hint="Optional input for the offer engine">
          <Input name="compPricePerM2" defaultValue={p?.compPricePerM2 ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Our max budget (private)" error={errors.ourMaxBudget}>
          <Input name="ourMaxBudget" defaultValue={p?.ourMaxBudget ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
      </Section>

      <Section title="Negotiation" hint="Track the offer you've made and the vendor's counter while negotiating.">
        <Field label="Our offer" error={errors.ourOffer}>
          <Input name="ourOffer" defaultValue={p?.ourOffer ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
        <Field label="Counter offer" error={errors.counterOffer}>
          <Input name="counterOffer" defaultValue={p?.counterOffer ?? ""} placeholder="$" inputMode="numeric" />
        </Field>
      </Section>

      <Section title="Image" hint="Paste a homes.co.nz / original listing photo URL. We never scrape it.">
        <Field label="Image URL" error={errors.imageUrl} className="sm:col-span-2">
          <Input name="imageUrl" defaultValue={p?.imageUrl ?? ""} placeholder="https://…" inputMode="url" />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={p ? `/properties/${p.id}` : "/"} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}
