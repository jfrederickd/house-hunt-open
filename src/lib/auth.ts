// Tiny HMAC-signed session token, usable from both the Edge middleware and
// Node server actions (uses Web Crypto + btoa/atob, available in both).
// This is a single shared-password gate for a two-person private tool — not a
// full identity system.

export const SESSION_COOKIE = "hh_session";
const VERSION = "v1";

const encoder = new TextEncoder();

// Web Crypto's BufferSource typing is fussy about the Uint8Array<ArrayBuffer>
// generic; this keeps a clean, copy-backed view that always satisfies it.
function buf(data: string | Uint8Array): Uint8Array<ArrayBuffer> {
  const src = typeof data === "string" ? encoder.encode(data) : data;
  return new Uint8Array(src);
}

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  if (s.length % 4) s += "=".repeat(4 - (s.length % 4));
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    buf(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Create a signed token valid for `days`. Throws if AUTH_SECRET is unset. */
export async function createSessionToken(days = 30): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const payload = `${VERSION}.${exp}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, buf(payload));
  return `${payload}.${toB64Url(new Uint8Array(sig))}`;
}

/** Verify a token's signature and expiry. Returns false on anything suspect. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expStr, sigB64] = parts;
  if (version !== VERSION) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  try {
    const key = await hmacKey(secret);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      buf(fromB64Url(sigB64)),
      buf(`${version}.${expStr}`),
    );
  } catch {
    return false;
  }
}

/** Whether the auth gate is configured at all (used to keep local dev open). */
export function authEnabled(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}

/** Length-aware, early-exit-resistant string compare for the shared password. */
export function passwordsMatch(input: string, expected: string): boolean {
  if (expected.length === 0) return false;
  const a = encoder.encode(input);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
