// The rotation tasks of the schedule. A lot needs a rotation when the household does not use it before its due date.

import { dayOf, isoOf } from "./dates.ts";
import { byDue } from "./stock.ts";
import type { IsoDate, Lot, Task } from "./types.ts";

/**
 * This function gives the rotation date of a lot: `due - units / useRate - leadDays`.
 * On that date, the household starts to use the lot, and uses all of it before the due date.
 * A `useRate` of 0 gives `due - leadDays`: the date to replace the lot.
 */
export function rotationDate(lot: Lot, useRate: number, leadDays: number): IsoDate {
  if (!(useRate >= 0)) throw new RangeError(`the use rate must be 0 or more: ${useRate}`);
  if (!(leadDays >= 0)) throw new RangeError(`the lead time must be 0 or more days: ${leadDays}`);
  const useDays = useRate > 0 ? lot.units / useRate : 0;
  return isoOf(dayOf(lot.due) - useDays - leadDays);
}

/**
 * This function gives the rotation tasks at the date, the first due first.
 *
 * - The household uses the lots of a product first expiring, first out, at the rate of `useRates[product]` units each day.
 * - A lot that the use finishes before its due date needs no task.
 * - A lot that the use does not finish in time gets a task on its rotation date, or on `at` when that date is past.
 * - A lot past its due date gets a task to remove it, on `at`.
 */
export function rotationTasks(at: IsoDate, lots: readonly Lot[], useRates: Readonly<Record<string, number>>, leadDays: number): Task[] {
  const today = dayOf(at);
  const tasks: Task[] = [];
  const used = new Map<string, number>();
  for (const lot of byDue(lots.filter((l) => l.units > 0))) {
    const due = dayOf(lot.due);
    if (due <= today) {
      tasks.push({ id: `rotate:${lot.id}`, kind: "rotate", due: at, ref: lot.id, title: `Remove the lot ${lot.id} of ${lot.product}: its due date was ${lot.due}` });
      continue;
    }
    const rate = useRates[lot.product] ?? 0;
    const before = used.get(lot.product) ?? 0;
    used.set(lot.product, before + lot.units);
    if (rate > 0 && today + (before + lot.units) / rate <= due) continue;
    const date = rotationDate(lot, rate, leadDays);
    const when = dayOf(date) < today ? at : date;
    const title = rate > 0
      ? `Start to use the lot ${lot.id} of ${lot.product}, or move it to a place that uses it: its due date is ${lot.due}`
      : `Replace the lot ${lot.id} of ${lot.product}: its due date is ${lot.due}`;
    tasks.push({ id: `rotate:${lot.id}`, kind: "rotate", due: when, ref: lot.id, title });
  }
  return tasks.sort((a, b) => dayOf(a.due) - dayOf(b.due) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** This function gives the tasks with a due date from `at` to `at + days`, both included. A task before `at` is in the list. */
export function tasksWithin(tasks: readonly Task[], at: IsoDate, days: number): Task[] {
  const end = dayOf(at) + days;
  return tasks.filter((t) => dayOf(t.due) <= end);
}
