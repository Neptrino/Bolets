const OPERATIONAL_RESYNC_TARGETS = [
  "all",
  "regional-environment",
  "station-rain",
  "spatial-atmosphere",
  "soil-forecast",
  "condition-caches",
] as const;

export type OperationalResyncTarget = typeof OPERATIONAL_RESYNC_TARGETS[number];

export type OperationalResyncResult = {
  accepted: boolean;
  target: OperationalResyncTarget;
  reason?: string;
  requestIds: number[];
  resetPipelines: string[];
};

export function isOperationalResyncTarget(value: unknown): value is OperationalResyncTarget {
  return typeof value === "string"
    && OPERATIONAL_RESYNC_TARGETS.some((target) => target === value);
}
