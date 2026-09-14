"use client";

import { useId, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { CircleHelp } from "lucide-react";

export function CulinaryRatingHelp() {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  return <span className="culinary-rating-help">
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger
        aria-label="Com s’interpreta el valor culinari"
        aria-describedby={open ? tooltipId : undefined}
        delay={150}
        closeOnClick={false}
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={15} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" align="center" sideOffset={8} collisionPadding={16} className="culinary-tooltip-positioner">
          <Tooltip.Popup id={tooltipId} role="tooltip" className="culinary-rating-tooltip">
            Les estrelles valoren l’interès gastronòmic; la classificació de consum indica si calen condicions de seguretat.
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  </span>;
}
