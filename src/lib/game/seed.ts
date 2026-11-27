/** Reads a fixed random seed from a `?seed=` query string; null when absent or not an integer. */
export function parseSeed(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed');
  return raw !== null && /^-?\d+$/.test(raw) ? Number(raw) : null;
}
