// The error contract of the stock over the calendar dates of `@mark1russell7/algebra/clock`. The clock entry gives
// `undefined` for a bad date. The stock throws a `RangeError`, thus a bad record stops a query and names its date.
// This file has no date arithmetic of its own.

import { addDays as clockAddDays, dateOfDay, dayNumber } from "@mark1russell7/algebra/clock";
import type { IsoDate } from "./types.ts";

/** This function gives the day number of a calendar date. It throws a `RangeError` for a text that is not a real date. */
export function dayOf(date: IsoDate): number {
  const day = dayNumber(date);
  if (day === undefined) throw new RangeError(`not a real calendar date of the form YYYY-MM-DD: ${JSON.stringify(date)}`);
  return day;
}

/** This function gives the calendar date of a day number. A fraction of a day goes down to the start of its day. */
export function isoOf(day: number): IsoDate {
  const date = Number.isFinite(day) ? dateOfDay(Math.floor(day)) : undefined;
  if (date === undefined) throw new RangeError(`not a day number in the years 1 to 9999: ${day}`);
  return date;
}

/** This function adds a whole count of days to a calendar date. It throws a `RangeError` for a bad date or count. */
export function addDays(date: IsoDate, days: number): IsoDate {
  dayOf(date);
  const out = clockAddDays(date, days);
  if (out === undefined) throw new RangeError(`not a whole count of days in the calendar: ${days}`);
  return out;
}
