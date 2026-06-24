// Public health check for the host's uptime probe (allowed past the auth gate).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
