"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  passwordsMatch,
  SESSION_COOKIE,
} from "@/lib/auth";
import type { ActionState } from "@/lib/actions/properties";

// Only allow redirecting to internal paths after login.
function safeNext(next: string): string {
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return { ok: false, message: "Login isn't configured on the server." };
  }
  if (!passwordsMatch(password, expected)) {
    return { ok: false, message: "Incorrect password." };
  }

  const token = await createSessionToken(30);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
