// The routine tasks of the schedule: the checks of devices, the drills, the reviews of sources and the purchases that
// come again on a calendar rule. The rule is the recurrence rule of @mark1russell7/algebra/clock.

import { nextOccurrence, recurrenceProblems, type Recurrence } from "@mark1russell7/algebra/clock";
import { addDays, dayOf } from "./dates.ts";
import type { IsoDate, Task } from "./types.ts";

export type { Recurrence };

/** A task that comes again on a calendar rule, for example a check of a device each 6 months. */
export interface Routine {
  readonly id: string;
  readonly kind: "check" | "drill" | "review" | "buy";
  /** The `id` of the record that the routine is for: a device, a plan, a source or a product. */
  readonly ref: string;
  readonly title: string;
  readonly rule: Recurrence;
}

/** This function gives the problems of the routines: an empty id, an id two times, and the problems of each rule. */
export function routineProblems(routines: readonly Routine[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const r of routines) {
    if (typeof r.id !== "string" || r.id.length === 0) {
      problems.push("a routine needs a nonempty id");
      continue;
    }
    if (seen.has(r.id)) problems.push(`the routine ${r.id} is in the list two times`);
    seen.add(r.id);
    for (const p of recurrenceProblems(r.rule)) problems.push(`the routine ${r.id}: ${p}`);
  }
  return problems;
}

/**
 * This function gives the next task of each routine, the first due first.
 *
 * - With no record in `lastDone`, the task is on the first date of the rule on or after `at`.
 * - With a record, the task is on the first date of the rule after that record. A date before `at` is a late task.
 * - A rule with no more dates gives no task.
 *
 * It throws a `RangeError` when `routineProblems` gives a problem.
 */
export function routineTasks(at: IsoDate, routines: readonly Routine[], lastDone: Readonly<Record<string, IsoDate>> = {}): Task[] {
  dayOf(at);
  const problems = routineProblems(routines);
  if (problems.length > 0) throw new RangeError(problems.join("; "));
  const tasks: Task[] = [];
  for (const r of routines) {
    const done = lastDone[r.id];
    const due = nextOccurrence(r.rule, done === undefined ? at : addDays(done, 1));
    if (due === undefined) continue;
    tasks.push({ id: `${r.kind}:${r.id}`, kind: r.kind, due, ref: r.ref, title: r.title });
  }
  return sortTasks(tasks);
}

/** This function gives the tasks sorted by due date, then by id. Use it to merge the rotation tasks and the routine tasks. */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => dayOf(a.due) - dayOf(b.due) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
