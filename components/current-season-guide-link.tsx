"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { monthInTimeZone } from "@/src/lib/seasonality";
import type { Month } from "@/src/lib/types";

export interface SeasonalFooterGuide {
  path: string;
  cardTitle: string;
  months: readonly Month[];
}

const ONE_HOUR = 60 * 60 * 1000;

function subscribeToCalendar(onMonthCheck: () => void) {
  const interval = window.setInterval(onMonthCheck, ONE_HOUR);
  return () => window.clearInterval(interval);
}

function currentMonthSnapshot() {
  return monthInTimeZone();
}

export function CurrentSeasonGuideLink({
  guides,
  initialMonth,
}: {
  guides: readonly SeasonalFooterGuide[];
  initialMonth: Month;
}) {
  const currentMonth = useSyncExternalStore(
    subscribeToCalendar,
    currentMonthSnapshot,
    () => initialMonth,
  );
  const currentGuide = guides.find((guide) => guide.months.includes(currentMonth));

  return (
    <Link href={currentGuide?.path ?? "/temporada"}>
      {currentGuide?.cardTitle ?? "Bolets per estació"}
    </Link>
  );
}
