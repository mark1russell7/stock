import { occurrencesBetween } from "@mark1russell7/algebra/clock";
import { describe, expect, it } from "vitest";
import { addDays } from "./dates.ts";
import { rotationTasks, routineProblems, routineTasks, sortTasks, tasksWithin } from "./index.ts";
import type { Lot, Routine } from "./index.ts";

// Invented routines of a household. The values are invented.
const ROUTINES: readonly Routine[] = [
  { id: "smoke-alarm", kind: "check", ref: "device-smoke-1", title: "Test the smoke alarm", rule: { start: "2026-01-05", every: 1, unit: "month" } },
  { id: "fire-drill", kind: "drill", ref: "plan-fire", title: "Do the fire drill", rule: { start: "2026-03-01", every: 6, unit: "month" } },
  { id: "water-source", kind: "review", ref: "source-water", title: "Read the water advice again", rule: { start: "2026-01-31", every: 1, unit: "year" } },
  { id: "batteries", kind: "buy", ref: "battery-aa", title: "Buy AA batteries", rule: { start: "2026-02-01", every: 4, unit: "week", count: 3 } },
];
const AT = "2026-12-01";

describe("the routine tasks", () => {
  it("give the next date of each rule on or after the date, the first due first", () => {
    expect(routineTasks(AT, ROUTINES).map((t) => [t.id, t.due])).toEqual([
      ["check:smoke-alarm", "2026-12-05"],
      ["review:water-source", "2027-01-31"],
      ["drill:fire-drill", "2027-03-01"],
    ]);
  });

  it("give no task for a rule with no more dates", () => {
    // The batteries: 3 dates, 2026-02-01, 2026-03-01 and 2026-03-29.
    expect(routineTasks("2026-03-30", ROUTINES).some((t) => t.ref === "battery-aa")).toBe(false);
    expect(routineTasks("2026-03-29", ROUTINES).find((t) => t.ref === "battery-aa")?.due).toBe("2026-03-29");
  });

  it("give a late task when the last record is before a date of the rule that is past", () => {
    const tasks = routineTasks(AT, ROUTINES, { "smoke-alarm": "2026-09-05", "fire-drill": "2026-09-01" });
    // The smoke alarm was last tested on 2026-09-05: the test of 2026-10-05 is late.
    expect(tasks.find((t) => t.ref === "device-smoke-1")?.due).toBe("2026-10-05");
    // The drill of 2026-09-01 is done: the next drill is on 2027-03-01.
    expect(tasks.find((t) => t.ref === "plan-fire")?.due).toBe("2027-03-01");
    expect(tasksWithin(tasks, AT, 7).map((t) => t.id)).toEqual(["check:smoke-alarm"]);
  });

  it("give the first date after the last record, for each record date (an oracle from the list of dates)", () => {
    const rule = { start: "2026-01-31", every: 1, unit: "month" } as const;
    const routine: Routine = { id: "r", kind: "check", ref: "d", title: "t", rule };
    const dates = occurrencesBetween(rule, "2026-01-01", "2028-12-31");
    for (let day = 0; day < 700; day += 1) {
      const done = addDays("2026-01-01", day);
      const want = dates.find((d) => d > done);
      expect(routineTasks("2026-01-01", [routine], { r: done })[0]?.due).toBe(want);
    }
  });

  it("refuse a bad list of routines, and tell each problem", () => {
    const bad: Routine[] = [
      { ...(ROUTINES[0] as Routine) },
      { ...(ROUTINES[0] as Routine) },
      { ...(ROUTINES[1] as Routine), id: "x", rule: { start: "2026-02-30", every: 1, unit: "month" } },
      { ...(ROUTINES[1] as Routine), id: "" },
    ];
    const problems = routineProblems(bad);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/smoke-alarm is in the list two times/);
    expect(problems[1]).toMatch(/^the routine x: /);
    expect(() => routineTasks(AT, bad)).toThrow(RangeError);
    expect(routineProblems(ROUTINES)).toEqual([]);
  });
});

describe("the merge of the tasks", () => {
  it("sorts the rotation tasks and the routine tasks together, by date then by id", () => {
    const lots: Lot[] = [{ id: "cans", product: "can", place: "home", units: 30, bought: "2026-01-01", due: "2026-12-10" }];
    const all = sortTasks([...rotationTasks(AT, lots, {}, 7), ...routineTasks(AT, ROUTINES)]);
    expect(all.map((t) => [t.id, t.due])).toEqual([
      ["rotate:cans", "2026-12-03"],
      ["check:smoke-alarm", "2026-12-05"],
      ["review:water-source", "2027-01-31"],
      ["drill:fire-drill", "2027-03-01"],
    ]);
  });
});
