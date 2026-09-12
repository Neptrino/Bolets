"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/** Keep heavy destination assets off initial load; warm on pointer or keyboard intent. */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [active, setActive] = useState(false);
  return <Link
    {...props}
    prefetch={active ? null : false}
    onMouseEnter={(event) => { onMouseEnter?.(event); if (!event.defaultPrevented) setActive(true); }}
    onFocus={(event) => { onFocus?.(event); if (!event.defaultPrevented) setActive(true); }}
    onTouchStart={(event) => { onTouchStart?.(event); if (!event.defaultPrevented) setActive(true); }}
  />;
}
