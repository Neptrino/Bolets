/* Calendar framing for the "aquesta setmana" and "cap de setmana" intents on
   the Avui page: the civil week (Monday to Sunday) and the coming weekend in
   the Catalonia time zone, written the way people search for them. Pure date
   arithmetic on civil dates; no readings involved. */

const TIME_ZONE = "Europe/Madrid";
const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

export interface CivilDate {
  year: number;
  month: number;
  day: number;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
}

const partsFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric", weekday: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function civilDate(at: Date): CivilDate {
  const parts = Object.fromEntries(partsFormat.formatToParts(at).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: WEEKDAYS.indexOf(parts.weekday) };
}

/** The same civil date shifted by whole days, computed at noon UTC so DST changes cannot skip a day. */
export function shiftCivilDate(date: CivilDate, days: number): CivilDate {
  const noon = Date.UTC(date.year, date.month - 1, date.day + days, 12);
  const shifted = new Date(noon);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), weekday: (((date.weekday + days) % 7) + 7) % 7 };
}

/** "de setembre", "d’octubre". */
export function monthPhrase(month: number) {
  const name = MONTHS[month - 1];
  return /^[aeiou]/u.test(name) ? `d’${name}` : `de ${name}`;
}

export function isoDate(date: CivilDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export interface WeekWindow {
  start: CivilDate;
  end: CivilDate;
  /** "del 15 al 21 de setembre" or "del 29 de setembre al 5 d’octubre". */
  label: string;
}

export function weekWindow(at: Date): WeekWindow {
  const today = civilDate(at);
  const start = shiftCivilDate(today, -today.weekday);
  const end = shiftCivilDate(start, 6);
  const label = start.month === end.month
    ? `del ${start.day} al ${end.day} ${monthPhrase(end.month)}`
    : `del ${start.day} ${monthPhrase(start.month)} al ${end.day} ${monthPhrase(end.month)}`;
  return { start, end, label };
}

export interface WeekendWindow {
  saturday: CivilDate;
  sunday: CivilDate;
  /** "20 i 21 de setembre" or "31 d’octubre i 1 de novembre". */
  label: string;
  /** True on Saturday and Sunday, when the weekend named is the current one. */
  current: boolean;
}

/** The coming weekend, or the current one on Saturday and Sunday. */
export function weekendWindow(at: Date): WeekendWindow {
  const today = civilDate(at);
  const toSaturday = today.weekday === 6 ? -1 : 5 - today.weekday;
  const saturday = shiftCivilDate(today, toSaturday);
  const sunday = shiftCivilDate(saturday, 1);
  const label = saturday.month === sunday.month
    ? `${saturday.day} i ${sunday.day} ${monthPhrase(sunday.month)}`
    : `${saturday.day} ${monthPhrase(saturday.month)} i ${sunday.day} ${monthPhrase(sunday.month)}`;
  return { saturday, sunday, label, current: today.weekday >= 5 };
}
