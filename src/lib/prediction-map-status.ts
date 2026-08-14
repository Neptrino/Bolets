export type PredictionViewportStatus =
  | "empty"
  | "mixed"
  | "incompatible"
  | "withheld"
  | "ready";

export type PredictionViewportCounts = {
  published: number;
  excluded: number;
  withheld: number;
};

export function predictionViewportStatus({
  published,
  excluded,
  withheld,
}: PredictionViewportCounts): PredictionViewportStatus {
  if (published + excluded + withheld === 0) return "empty";
  if (excluded > 0 && withheld > 0) return "mixed";
  if (published > 0) return "ready";
  if (excluded > 0) return "incompatible";
  return "withheld";
}
