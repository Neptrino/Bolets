"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  queueUmamiEvent,
  type UmamiEventName,
} from "@/src/lib/umami-goals";

export function UmamiEventLink({
  analyticsEvent,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { analyticsEvent: UmamiEventName }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) queueUmamiEvent(analyticsEvent);
      }}
    />
  );
}
