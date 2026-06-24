"use client";

import { useTransition } from "react";
import Link from "next/link";
import { UserRound, ChevronDown, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { setActivePerson } from "@/lib/actions/criteria";

type PersonOption = { id: string; name: string };

export function PersonSelector({
  people,
  activePersonId,
}: {
  people: PersonOption[];
  activePersonId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  if (people.length === 0) return null;
  const active = people.find((p) => p.id === activePersonId) ?? people[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/60 data-[disabled]:opacity-50"
        disabled={pending}
      >
        <UserRound className="size-4 text-muted-foreground" />
        <span className="hidden text-muted-foreground sm:inline">Viewing as</span>
        <span className="max-w-[8rem] truncate">{active.name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuRadioGroup
          value={active.id}
          onValueChange={(v) => startTransition(() => void setActivePerson(String(v)))}
        >
          <DropdownMenuLabel>Viewing as</DropdownMenuLabel>
          {people.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              {p.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/criteria" />}>
          <Settings2 className="size-4 text-muted-foreground" />
          Manage people &amp; criteria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
