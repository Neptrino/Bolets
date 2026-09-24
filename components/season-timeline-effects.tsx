"use client";

import { useEffect, useRef, useState } from "react";

const SPORE_COUNT = 32;

/** Deterministic scatter so the server and the browser draw the same spores. */
const spores = Array.from({ length: SPORE_COUNT }, (_, index) => ({
  x: (index * 37 + 11) % 100,
  size: 3 + ((index * 7) % 5),
  duration: 7 + ((index * 13) % 9),
  delay: -((index * 29) % 80) / 10,
  drift: ((index * 17) % 40) - 20,
}));

/**
 * Spores rising through the stage. Richer months light more of them, so the
 * number of species in season can be felt before it is read.
 */
export function SeasonSpores({ intensity }: { intensity: number }) {
  const lit = Math.round(intensity * SPORE_COUNT);
  return (
    <div className="season-stage-spores" aria-hidden="true">
      {spores.map((spore, index) => (
        <span
          key={index}
          data-lit={index < lit || undefined}
          style={{
            "--x": `${spore.x}%`,
            "--size": `${spore.size}px`,
            "--duration": `${spore.duration}s`,
            "--delay": `${spore.delay}s`,
            "--drift": `${spore.drift}px`,
          } as React.CSSProperties}
        >
          <span />
        </span>
      ))}
    </div>
  );
}

/** Rolls a number towards its new value; instant when motion is reduced. */
export function useCountUp(target: number, duration = 700) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const length = reduce ? 0 : duration;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = length === 0 ? 1 : Math.min(1, (now - start) / length);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}

/** How the month compares with the richest one, in words based on species counts only. */
export function seasonLevel(total: number, tallest: number) {
  const intensity = tallest > 0 ? total / tallest : 0;
  if (total === tallest) return { intensity, tone: "peak", label: "El mes amb més espècies" } as const;
  if (intensity >= 0.7) return { intensity, tone: "high", label: "Plena temporada" } as const;
  if (intensity >= 0.3) return { intensity, tone: "mid", label: "Temporada mitjana" } as const;
  return { intensity, tone: "low", label: "Temporada fluixa" } as const;
}
