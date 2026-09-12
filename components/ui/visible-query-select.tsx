"use client";

import { ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { QuerySelectProps } from "./query-select";

const QuerySelectControl = lazy(() => import("./query-select").then(module => ({ default: module.QuerySelect })));

/** Keep controls in collapsed panels out of the map's initial download. */
export function VisibleQuerySelect(props: QuerySelectProps) {
  const boundary = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = boundary.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      setVisible(true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const selectedLabel = props.items.find(item => item.value === props.value)?.label ?? "";
  const placeholder = (
      <div
        className={["species-select-trigger", `species-select-trigger-${props.variant ?? "compact"}`, props.className].filter(Boolean).join(" ")}
        aria-busy="true"
      >
        <input className="species-select-input" value={selectedLabel} disabled readOnly aria-label={props["aria-label"] ?? "Selecciona una opció"} />
        <span className="species-select-icon" aria-hidden="true"><ChevronDown size={props.variant === "map" || props.variant === "comparison" ? 20 : 16} /></span>
      </div>
  );
  return <div ref={boundary}>
    <Suspense fallback={placeholder}>
      {visible ? <QuerySelectControl {...props} /> : placeholder}
    </Suspense>
  </div>;
}
