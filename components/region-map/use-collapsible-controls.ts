import { useEffect, useState } from "react";

export function useCollapsibleMapControls() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const narrowMap = window.matchMedia("(max-width: 680px)");
    let collapseFrame: number | undefined;
    const collapseForNarrowMap = (event: MediaQueryListEvent) => {
      if (event.matches) setExpanded(false);
    };
    if (narrowMap.matches) {
      collapseFrame = window.requestAnimationFrame(() => setExpanded(false));
    }
    narrowMap.addEventListener("change", collapseForNarrowMap);
    return () => {
      if (collapseFrame !== undefined) window.cancelAnimationFrame(collapseFrame);
      narrowMap.removeEventListener("change", collapseForNarrowMap);
    };
  }, []);

  return {
    expanded,
    toggle: () => setExpanded((current) => !current),
  };
}
