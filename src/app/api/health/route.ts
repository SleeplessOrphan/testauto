// Used by the staging smoke test to confirm the deploy is serving requests.
export function GET() {
  return Response.json({ ok: true });
}
