"use client";

import { LayoutGrid, List, Rows3, type LucideIcon } from "lucide-react";
import { useId, useSyncExternalStore } from "react";

export type SpeciesDirectoryLayout = "cards" | "compact" | "list";

const layoutOptions: Array<{ value: SpeciesDirectoryLayout; label: string; shortLabel: string; icon: LucideIcon }> = [
  { value: "cards", label: "Targetes amb descripció", shortLabel: "Targetes", icon: Rows3 },
  { value: "compact", label: "Graella compacta", shortLabel: "Compacta", icon: LayoutGrid },
  { value: "list", label: "Llista", shortLabel: "Llista", icon: List },
];

const storageKey = "bolets:catalogue-layout";
const changeEvent = "bolets:catalogue-layout-change";

function isLayout(value: unknown): value is SpeciesDirectoryLayout {
  return layoutOptions.some((option) => option.value === value);
}

function readLayout(): SpeciesDirectoryLayout {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isLayout(stored) ? stored : "cards";
  } catch {
    return "cards";
  }
}

let fallbackLayout: SpeciesDirectoryLayout | null = null;

function getLayout(): SpeciesDirectoryLayout {
  return fallbackLayout ?? readLayout();
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setLayout(layout: SpeciesDirectoryLayout) {
  try {
    window.localStorage.setItem(storageKey, layout);
    fallbackLayout = null;
  } catch {
    // Storage can be unavailable; keep the choice for this page view only.
    fallbackLayout = layout;
  }
  window.dispatchEvent(new Event(changeEvent));
}

/** Per-viewer catalogue layout, remembered in browser storage when available. */
export function useSpeciesDirectoryLayout() {
  const layout = useSyncExternalStore(subscribe, getLayout, () => "cards" as const);
  return [layout, setLayout] as const;
}

export function SpeciesDirectoryLayoutControl({
  layout,
  onChange,
}: {
  layout: SpeciesDirectoryLayout;
  onChange: (layout: SpeciesDirectoryLayout) => void;
}) {
  const choiceName = useId();
  const labelId = useId();
  return (
    <div className="card directory-layout-control" role="radiogroup" aria-labelledby={labelId}>
      <span id={labelId} className="visually-hidden">Disposició del catàleg</span>
      {layoutOptions.map((option) => {
        const Icon = option.icon;
        return (
          <label key={option.value} className="directory-layout-option" title={option.label}>
            <input
              type="radio"
              name={choiceName}
              value={option.value}
              checked={layout === option.value}
              aria-label={option.label}
              onChange={() => onChange(option.value)}
            />
            <span aria-hidden="true"><Icon size={16} />{option.shortLabel}</span>
          </label>
        );
      })}
    </div>
  );
}
