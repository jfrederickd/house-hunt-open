"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/actions/properties";

const initial: ActionState = { ok: true };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoFocus
        autoComplete="current-password"
        aria-label="Password"
      />
      {!state.ok && state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <LogIn className="size-4" />
        {pending ? "Checking…" : "Enter"}
      </Button>
    </form>
  );
}
