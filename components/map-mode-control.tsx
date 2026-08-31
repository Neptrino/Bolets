"use client";

import { useId, useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MapViewMode } from "@/src/lib/types";

const mapModeOptions: Array<{
  value: MapViewMode;
  label: string;
  shortLabel: string;
}> = [
  { value: "prediction", label: "Condicions actuals", shortLabel: "Condicions" },
  { value: "compatibility", label: "Terreny adequat", shortLabel: "Terreny" },
];

export function MapModeControl({
  mode,
  predictionAvailable = true,
}: {
  mode: MapViewMode;
  predictionAvailable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const choiceName = useId();
  const labelId = useId();
  const [isPending, startTransition] = useTransition();
  const [optimisticMode, setOptimisticMode] = useOptimistic(mode);

  const selectMode = (nextMode: MapViewMode) => {
    if (nextMode === optimisticMode) return;
    const next = new URLSearchParams(searchParams.toString());
    if (nextMode === "prediction") next.delete("mode");
    else next.set("mode", nextMode);
    const query = next.toString();
    startTransition(() => {
      setOptimisticMode(nextMode);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div
      className="map-mode-control"
      role="radiogroup"
      aria-labelledby={labelId}
      aria-busy={isPending}
    >
      <span id={labelId} className="map-mode-control-label">
        Vista
      </span>
      <div className="map-mode-options">
        {mapModeOptions
          .filter((option) => predictionAvailable || option.value !== "prediction")
          .map((option) => (
          <label key={option.value} className="map-mode-option">
            <input
              type="radio"
              name={choiceName}
              value={option.value}
              checked={optimisticMode === option.value}
              disabled={isPending}
              aria-label={option.label}
              onChange={() => selectMode(option.value)}
            />
            <span aria-hidden>{option.shortLabel}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
