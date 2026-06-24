"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Plus,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CRITERION_TYPES,
  CRITERION_TYPE_LABELS,
  type CriterionType,
} from "@/lib/enums";
import {
  createCriterion,
  updateCriterion,
  reorderCriterion,
  setCriterionActive,
  renamePerson,
  addPerson,
  type CriterionInput,
} from "@/lib/actions/criteria";

type CriterionRow = {
  id: string;
  label: string;
  type: CriterionType;
  options: string[];
  mustHave: boolean;
  weight: number;
  active: boolean;
};
type PersonRow = { id: string; name: string };

export function CriteriaSettings({
  criteria,
  people,
}: {
  criteria: CriterionRow[];
  people: PersonRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null); // criterion id or "new"

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, onOk?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message ?? "Something went wrong.");
      else onOk?.();
    });

  return (
    <div className="space-y-10">
      {/* People */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">People</h2>
        <div className="space-y-2">
          {people.map((p) => (
            <PersonEditor
              key={p.id}
              person={p}
              disabled={pending}
              onRename={(name) => run(() => renamePerson(p.id, name))}
            />
          ))}
          <AddPerson disabled={pending} onAdd={(name) => run(() => addPerson(name))} />
        </div>
      </section>

      {/* Criteria */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Criteria</h2>
          {editingId !== "new" && (
            <Button size="sm" variant="outline" onClick={() => setEditingId("new")} disabled={pending}>
              <Plus className="size-4" />
              Add criterion
            </Button>
          )}
        </div>

        {editingId === "new" && (
          <CriterionForm
            disabled={pending}
            onCancel={() => setEditingId(null)}
            onSubmit={(input) => run(() => createCriterion(input), () => setEditingId(null))}
          />
        )}

        <ul className="divide-y rounded-xl border">
          {criteria.map((c, i) =>
            editingId === c.id ? (
              <li key={c.id} className="p-3">
                <CriterionForm
                  initial={c}
                  disabled={pending}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(input) => run(() => updateCriterion(c.id, input), () => setEditingId(null))}
                />
              </li>
            ) : (
              <li
                key={c.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  !c.active && "opacity-50",
                )}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0 || pending}
                    onClick={() => run(() => reorderCriterion(c.id, "up"))}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === criteria.length - 1 || pending}
                    onClick={() => run(() => reorderCriterion(c.id, "down"))}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.label}</span>
                    {c.mustHave && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                        Must-have
                      </span>
                    )}
                    {!c.active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CRITERION_TYPE_LABELS[c.type]}
                    {c.type === "choice" && c.options.length > 0 && ` · ${c.options.join(", ")}`}
                    {` · weight ${c.weight}`}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={c.active ? "Deactivate" : "Reactivate"}
                  disabled={pending}
                  onClick={() => run(() => setCriterionActive(c.id, !c.active))}
                  className="text-muted-foreground hover:text-foreground"
                  title={c.active ? "Deactivate" : "Reactivate"}
                >
                  {c.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Edit"
                  disabled={pending}
                  onClick={() => setEditingId(c.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function PersonEditor({
  person,
  disabled,
  onRename,
}: {
  person: PersonRow;
  disabled: boolean;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(person.name);
  const dirty = name.trim() !== person.name && name.trim() !== "";
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
      {dirty && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onRename(name.trim())}>
          <Check className="size-4" />
          Save
        </Button>
      )}
    </div>
  );
}

function AddPerson({ disabled, onAdd }: { disabled: boolean; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a person…"
        className="max-w-xs"
      />
      {name.trim() && (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            onAdd(name.trim());
            setName("");
          }}
        >
          <Plus className="size-4" />
          Add
        </Button>
      )}
    </div>
  );
}

function CriterionForm({
  initial,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial?: CriterionRow;
  disabled: boolean;
  onSubmit: (input: CriterionInput) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [type, setType] = useState<CriterionType>(initial?.type ?? "verdict");
  const [options, setOptions] = useState((initial?.options ?? []).join(", "));
  const [mustHave, setMustHave] = useState(initial?.mustHave ?? false);
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));

  const submit = () => {
    if (!label.trim()) {
      toast.error("Label is required.");
      return;
    }
    onSubmit({
      label,
      type,
      options: type === "choice" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [],
      mustHave,
      weight: Number(weight) || 1,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Label</span>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Kitchen" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CriterionType)}
            className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {CRITERION_TYPES.map((t) => (
              <option key={t} value={t}>
                {CRITERION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === "choice" && (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Options (comma-separated)</span>
          <Input
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="None, Partial, Full"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mustHave}
            onChange={(e) => setMustHave(e.target.checked)}
            className="size-4"
          />
          Must-have
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Weight</span>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-20"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={submit}>
          <Check className="size-4" />
          {initial ? "Save changes" : "Add criterion"}
        </Button>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
