export const DEFAULT_ACCESS_DESTINATION = "/compte/bosc";

const ACCESS_DESTINATIONS = [
  DEFAULT_ACCESS_DESTINATION,
  "/compte/troballes",
  "/compte/col-laboracio",
  "/compte/privadesa",
  "/moderacio",
  "/admin",
  "/admin/usuaris",
  "/admin/troballes",
  "/admin/avisos",
  "/admin/aportacions",
  "/admin/publicacio",
  "/admin/operacions",
] as const;

export type AccessDestination = (typeof ACCESS_DESTINATIONS)[number];

const PUBLIC_FINDING_DESTINATION = /^\/troballes\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveAccessDestination(value: string | string[] | null | undefined): AccessDestination | `/troballes/${string}` {
  if (typeof value !== "string") return DEFAULT_ACCESS_DESTINATION;
  const fixedDestination = ACCESS_DESTINATIONS.find((destination) => destination === value);
  if (fixedDestination) return fixedDestination;
  if (PUBLIC_FINDING_DESTINATION.test(value)) return value as `/troballes/${string}`;
  return DEFAULT_ACCESS_DESTINATION;
}
