// Calendar dates as whole days since 1970-01-01 (UTC). The home of civil dates is `@mark1russell7/algebra/clock`.
// This file is a shortcut: algebra/clock has no calendar-date arithmetic yet. Its end: the pull request of the recurrence rule
// adds these functions to algebra/clock, and this file then imports them (stock roadmap item S4).

import type { IsoDate } from "./types.ts";

const DAY_MS = 86_400_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** This function gives the day number of a calendar date. It throws a `RangeError` for a text that is not a real date. */
export function dayOf(date: IsoDate): number {
  const m = ISO.exec(date);
  if (!m) throw new RangeError(`not a date of the form YYYY-MM-DD: ${JSON.stringify(date)}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isoOf(ms / DAY_MS) !== date) throw new RangeError(`not a real calendar date: ${date}`);
  return ms / DAY_MS;
}

/** This function gives the calendar date of a day number. A fraction of a day goes down to the start of its day. */
export function isoOf(day: number): IsoDate {
  if (!Number.isFinite(day)) throw new RangeError(`not a finite day number: ${day}`);
  return new Date(Math.floor(day) * DAY_MS).toISOString().slice(0, 10);
}

/** This function adds a count of days to a calendar date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return isoOf(dayOf(date) + days);
}
