const BACKLINK_TIME_ZONE = "Europe/Madrid";
const SCHEDULE_START_MINUTES = 10 * 60 + 20;
const SCHEDULE_END_MINUTES = SCHEDULE_START_MINUTES + 10;

const localPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BACKLINK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  timeZone: BACKLINK_TIME_ZONE,
  dateStyle: "medium",
});

export function nextBacklinkRunWindow(now = new Date()) {
  const parts = Object.fromEntries(localPartsFormatter.formatToParts(now)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
  const localMinutes = parts.hour * 60 + parts.minute;
  const dayOffset = localMinutes >= SCHEDULE_END_MINUTES ? 1 : 0;
  const targetDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, 12));
  return `${dateFormatter.format(targetDay)}, 10:20–10:30`;
}
