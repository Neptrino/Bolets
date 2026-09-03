import type {
  BacklinkProspectSort,
  BacklinkSortDirection,
  BacklinkStatus,
} from "@/src/lib/backlinks/types";

export const BACKLINK_STATUSES: readonly BacklinkStatus[] = [
  "discovered", "ready", "sent", "linked", "lost", "suppressed", "failed",
];

export const BACKLINK_SORTS: readonly BacklinkProspectSort[] = [
  "updated", "title", "status", "score", "domain", "checked", "sent",
];

export type BacklinkTableSearchParams = {
  detail?: string | string[];
  error?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
  updated?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

export type BacklinkTableQuery = {
  page: number;
  search: string;
  status: BacklinkStatus | null;
  sort: BacklinkProspectSort;
  direction: BacklinkSortDirection;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseBacklinkTableQuery(input: BacklinkTableSearchParams): BacklinkTableQuery {
  const pageValue = Number.parseInt(firstValue(input.page) ?? "1", 10);
  const statusValue = firstValue(input.status);
  const sortValue = firstValue(input.sort);
  const directionValue = firstValue(input.dir);
  return {
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
    search: (firstValue(input.q) ?? "").trim().slice(0, 120),
    status: BACKLINK_STATUSES.includes(statusValue as BacklinkStatus) ? statusValue as BacklinkStatus : null,
    sort: BACKLINK_SORTS.includes(sortValue as BacklinkProspectSort) ? sortValue as BacklinkProspectSort : "updated",
    direction: directionValue === "asc" ? "asc" : "desc",
  };
}

export function backlinkTableHref(
  current: BacklinkTableQuery,
  overrides: Partial<BacklinkTableQuery> = {},
) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (next.search) params.set("q", next.search);
  if (next.status) params.set("status", next.status);
  if (next.sort !== "updated") params.set("sort", next.sort);
  if (next.direction !== "desc") params.set("dir", next.direction);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/admin/enllacos?${query}` : "/admin/enllacos";
}

export function backlinkDetailHref(id: string, current: BacklinkTableQuery) {
  const collectionHref = backlinkTableHref(current);
  const separator = collectionHref.includes("?") ? "&" : "?";
  return `${collectionHref}${separator}detail=${encodeURIComponent(id)}`;
}

export function backlinkDetailId(input: BacklinkTableSearchParams) {
  const candidate = firstValue(input.detail);
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

export function safeBacklinkReturnPath(value: string | string[] | undefined) {
  const candidate = firstValue(value);
  if (!candidate) return "/admin/enllacos";
  try {
    const url = new URL(candidate, "https://bolets.app");
    return url.origin === "https://bolets.app" && url.pathname === "/admin/enllacos"
      ? `${url.pathname}${url.search}`
      : "/admin/enllacos";
  } catch {
    return "/admin/enllacos";
  }
}

export function nextBacklinkSortDirection(
  current: BacklinkTableQuery,
  sort: BacklinkProspectSort,
): BacklinkSortDirection {
  if (current.sort === sort) return current.direction === "asc" ? "desc" : "asc";
  return sort === "title" || sort === "domain" || sort === "status" ? "asc" : "desc";
}
