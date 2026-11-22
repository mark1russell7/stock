import { describe, expect, it } from "vitest";
import { addDays, dayOf, isoOf } from "./dates.ts";
import { amounts, byDue, drawFirstExpiring, dueDate, foldLog, isUsable, rotationDate, rotationTasks, stockLog, tasksWithin } from "./index.ts";
import type { LogStorage, Lot, ProductYield, StockEvent } from "./index.ts";

// The invented household of the shared contract of the prep program (fixtures/example.ts). Its values are invented.
const AT = "2026-12-01";
const YIELDS: readonly ProductYield[] = [
  { product: "water-jug-1gal", resource: "water.stored", perUnit: 3.785, due: { kind: "label" } },
  { product: "water-filled-1l", resource: "water.stored", perUnit: 1, due: { kind: "days", days: 182, source: "ready-water" } },
  { product: "beans-can-400kcal", resource: "food.ready", perUnit: 400, due: { kind: "label" } },
  { product: "rice-dry-1kg", resource: "food.grain-dry", perUnit: 1, due: { kind: "days", days: 3650, source: "fixture" } },
  { product: "battery-bank-1000wh", resource: "energy.battery", perUnit: 1000, due: { kind: "label" } },
];
const LOTS: readonly Lot[] = [
  { id: "lot-jugs", product: "water-jug-1gal", place: "home", units: 20, bought: "2026-06-01", due: "2028-06-01", price: 1.5 },
  { id: "lot-filled", product: "water-filled-1l", place: "home", units: 20, bought: "2026-04-01", due: "2026-09-30" },
  { id: "lot-beans", product: "beans-can-400kcal", place: "home", units: 12, bought: "2026-10-01", due: "2028-10-01", price: 1.25 },
  { id: "lot-rice", product: "rice-dry-1kg", place: "home", units: 9, bought: "2026-10-01", due: "2036-09-28", price: 2 },
  { id: "lot-battery", product: "battery-bank-1000wh", place: "home", units: 1, bought: "2026-10-01", due: "2031-10-01", price: 300 },
];
const lot = (id: string): Lot => {
  const l = LOTS.find((x) => x.id === id);
  if (!l) throw new Error(id);
  return l;
};

describe("the calendar dates", () => {
  it("go to day numbers and back", () => {
    expect(dayOf("1970-01-01")).toBe(0);
    expect(isoOf(dayOf("2028-02-29"))).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoOf(10.9)).toBe("1970-01-11");
  });
  it("refuse a text that is not a real date", () => {
    expect(() => dayOf("2026-02-30")).toThrow(RangeError);
    expect(() => dayOf("2026-2-3")).toThrow(RangeError);
  });
});

describe("the due rules", () => {
  it("give the date of the label", () => {
    expect(dueDate({ kind: "label" }, "2026-06-01", "2028-06-01")).toBe("2028-06-01");
    expect(() => dueDate({ kind: "label" }, "2026-06-01")).toThrow(RangeError);
  });
  it("add the days of the rule to the date of purchase", () => {
    // The filled water of the fixture: 182 days after 2026-04-01.
    expect(dueDate({ kind: "days", days: 182, source: "ready-water" }, "2026-04-01")).toBe("2026-09-30");
    expect(() => dueDate({ kind: "days", days: -1, source: "x" }, "2026-04-01")).toThrow(RangeError);
  });
});

describe("the amounts", () => {
  it("give each resource from the usable lots: the filled water is past due, so it gives nothing", () => {
    const got = amounts(LOTS, YIELDS, AT);
    expect(got.get("water.stored")).toBeCloseTo(75.7, 9);
    expect(got.get("food.ready")).toBe(4800);
    expect(got.get("food.grain-dry")).toBe(9);
    expect(got.get("energy.battery")).toBe(1000);
  });
  it("give nothing on the due date", () => {
    expect(isUsable(lot("lot-jugs"), "2028-05-31")).toBe(true);
    expect(isUsable(lot("lot-jugs"), "2028-06-01")).toBe(false);
  });
  it("refuse a lot with no yield", () => {
    expect(() => amounts([{ ...lot("lot-jugs"), product: "x" }], YIELDS, AT)).toThrow(/no yield/);
  });
});

describe("first expiring, first out", () => {
  const cans: Lot[] = [
    { id: "b", product: "can", place: "home", units: 5, bought: "2026-01-01", due: "2027-06-01" },
    { id: "a", product: "can", place: "home", units: 3, bought: "2026-01-01", due: "2027-01-01" },
    { id: "c", product: "can", place: "home", units: 4, bought: "2026-01-01", due: "2026-11-01" },
  ];
  it("draws from the first due usable lot first", () => {
    expect(drawFirstExpiring(cans, "can", 6, AT)).toEqual({ draws: [{ lot: "a", units: 3 }, { lot: "b", units: 3 }], short: 0 });
  });
  it("gives the units that the stock cannot give", () => {
    expect(drawFirstExpiring(cans, "can", 10, AT).short).toBe(2);
  });
  it("sorts by due date, then by id", () => {
    expect(byDue(cans).map((l) => l.id)).toEqual(["c", "a", "b"]);
  });
});

describe("the log", () => {
  const add = (id: string, at: string, l: Lot): StockEvent => ({ id, kind: "add", at, lot: l });
  const events: StockEvent[] = [
    add("e1", "2026-10-01T10:00:00Z", lot("lot-beans")),
    add("e2", "2026-10-01T10:01:00Z", lot("lot-rice")),
    { id: "e3", kind: "use", at: "2026-10-05T18:00:00Z", lot: "lot-beans", units: 2 },
    { id: "e4", kind: "use", at: "2026-10-06T18:00:00Z", lot: "lot-rice", units: 9 },
    { id: "e5", kind: "remove", at: "2026-10-07T09:00:00Z", lot: "lot-beans", why: "moved" },
  ];

  it("folds to the current stock", () => {
    const s = foldLog(events.slice(0, 4));
    expect(s.lots).toEqual([{ ...lot("lot-beans"), units: 10 }]);
    expect(s.problems).toEqual([]);
  });

  it("gives the same stock for each order of the events, and for copies of an event", () => {
    const want = foldLog(events);
    const perms = (xs: StockEvent[]): StockEvent[][] =>
      xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
    const all = perms(events);
    expect(all).toHaveLength(120);
    for (const p of all) expect(foldLog([...p, p[0] as StockEvent])).toEqual(want);
    expect(want.lots).toEqual([]);
    expect(want.removed).toEqual([{ lot: { ...lot("lot-beans"), units: 10 }, at: "2026-10-07T09:00:00Z", why: "moved" }]);
  });

  it("tells each event that it cannot apply, and continues", () => {
    const bad: StockEvent[] = [
      add("e1", "2026-10-01T10:00:00Z", lot("lot-beans")),
      add("e1", "2026-10-01T10:00:00Z", lot("lot-rice")),
      { id: "e2", kind: "use", at: "2026-10-02T00:00:00Z", lot: "lot-x", units: 1 },
      { id: "e3", kind: "use", at: "2026-10-03T00:00:00Z", lot: "lot-beans", units: 20 },
    ];
    const s = foldLog(bad);
    expect(s.problems).toHaveLength(3);
    expect(s.problems[0]).toMatch(/the event e1 has two different bodies/);
    // Of two bodies of one id, the fold keeps the same body for each order of arrival.
    expect(foldLog([...bad].reverse())).toEqual(s);
    expect(foldLog([bad[1] as StockEvent, bad[0] as StockEvent, bad[3] as StockEvent, bad[2] as StockEvent])).toEqual(s);
  });

  it("applies a correction to the lot with the same id, at its place in the list, for each order of the events", () => {
    const fixed: Lot = { ...lot("lot-beans"), units: 30, due: "2029-01-01" };
    const log: StockEvent[] = [
      add("e1", "2026-10-01T10:00:00Z", lot("lot-beans")),
      add("e2", "2026-10-01T10:01:00Z", lot("lot-rice")),
      { id: "e3", kind: "use", at: "2026-10-02T18:00:00Z", lot: "lot-beans", units: 2 },
      { id: "e4", kind: "correct", at: "2026-10-03T09:00:00Z", lot: fixed },
      { id: "e5", kind: "use", at: "2026-10-04T18:00:00Z", lot: "lot-beans", units: 1 },
    ];
    const want = foldLog(log);
    expect(want.lots).toEqual([{ ...fixed, units: 29 }, lot("lot-rice")]);
    expect(want.problems).toEqual([]);
    expect(foldLog([...log].reverse())).toEqual(want);
  });

  it("refuses a correction of a lot that is not in the stock, and a correction to no units", () => {
    const s = foldLog([
      add("e1", "2026-10-01T10:00:00Z", lot("lot-beans")),
      { id: "e2", kind: "correct", at: "2026-10-02T00:00:00Z", lot: lot("lot-rice") },
      { id: "e3", kind: "correct", at: "2026-10-03T00:00:00Z", lot: { ...lot("lot-beans"), units: 0 } },
    ]);
    expect(s.lots).toEqual([lot("lot-beans")]);
    expect(s.problems).toEqual([
      "the event e2 corrects the lot lot-rice, which is not in the stock",
      "the event e3 corrects the lot lot-beans to 0 units: use a remove event",
    ]);
  });

  it("sees a copy with its keys in another order as the same event", () => {
    const e = add("e1", "2026-10-01T10:00:00Z", lot("lot-beans"));
    const { bought, due, id, place, price, product, units } = lot("lot-beans");
    const copy = JSON.parse(JSON.stringify({ lot: { price, units, product, place, id, due, bought }, at: e.at, kind: e.kind, id: e.id })) as StockEvent;
    expect(foldLog([e, copy]).problems).toEqual([]);
  });
});

describe("the log on a storage", () => {
  const memory = (): LogStorage & { readonly items: Map<string, StockEvent> } => {
    const items = new Map<string, StockEvent>();
    return {
      items,
      get: async (id) => items.get(id),
      getAll: async () => [...items.values()],
      set: async (id, value) => {
        items.set(id, value);
      },
    };
  };
  const e1: StockEvent = { id: "e1", kind: "add", at: "2026-10-01T10:00:00Z", lot: lot("lot-beans") };
  const e2: StockEvent = { id: "e2", kind: "use", at: "2026-10-05T18:00:00Z", lot: "lot-beans", units: 2 };

  it("adds each event one time, with its id as the key", async () => {
    const storage = memory();
    const log = stockLog(storage);
    expect(await log.append(e1)).toBe("added");
    expect(await log.append(e2)).toBe("added");
    expect(await log.append({ ...e1 })).toBe("present");
    expect([...storage.items.keys()]).toEqual(["e1", "e2"]);
    expect((await log.state()).lots).toEqual([{ ...lot("lot-beans"), units: 10 }]);
    expect(await log.events()).toHaveLength(2);
  });

  it("refuses an id with a different body, and an event with no id", async () => {
    const log = stockLog(memory());
    await log.append(e1);
    await expect(log.append({ ...e1, at: "2026-10-02T00:00:00Z" })).rejects.toThrow(RangeError);
    await expect(log.append({ ...e1, id: "" })).rejects.toThrow(RangeError);
  });

  it("merges two copies of the log as a union, with no conflict", async () => {
    const a = memory();
    const b = memory();
    await stockLog(a).append(e1);
    await stockLog(b).append(e1);
    await stockLog(b).append(e2);
    // A sync copies the items of each copy into the other. The fold of the union is the same on the two sides.
    for (const [id, v] of b.items) a.items.set(id, v);
    for (const [id, v] of a.items) b.items.set(id, v);
    expect(await stockLog(a).state()).toEqual(await stockLog(b).state());
    expect((await stockLog(a).state()).problems).toEqual([]);
  });
});

describe("the rotation", () => {
  it("gives the rotation date of the contract: the beans at 1 can each day and 7 days of lead time", () => {
    // ROTATE_BEANS of the expected values of the contract: 2028-10-01 less 19 days.
    expect(rotationDate(lot("lot-beans"), 1, 7)).toBe("2028-09-12");
    expect(rotationDate(lot("lot-beans"), 0, 7)).toBe("2028-09-24");
  });

  it("gives no task for a lot that the use finishes in time, and a task for each other lot", () => {
    const tasks = rotationTasks(AT, LOTS, { "beans-can-400kcal": 1 }, 7);
    expect(tasks.map((t) => [t.ref, t.due])).toEqual([
      ["lot-filled", AT],
      ["lot-jugs", "2028-05-25"],
      ["lot-battery", "2031-09-24"],
      ["lot-rice", "2036-09-21"],
    ]);
    expect(tasks[0]?.title).toMatch(/Remove/);
  });

  it("gives a task to a later lot that the first expiring lots hold back", () => {
    const cans: Lot[] = [
      { id: "old", product: "can", place: "home", units: 30, bought: "2026-01-01", due: "2027-01-01" },
      { id: "new", product: "can", place: "home", units: 30, bought: "2026-01-01", due: "2027-01-15" },
    ];
    // At 1 can each day, the old lot ends on 2026-12-31 and the new lot on 2027-01-30: past its due date.
    const tasks = rotationTasks(AT, cans, { can: 1 }, 0);
    expect(tasks.map((t) => [t.ref, t.due])).toEqual([["new", "2026-12-16"]]);
  });

  it("gives the tasks of the next days", () => {
    const tasks = rotationTasks(AT, LOTS, {}, 7);
    expect(tasksWithin(tasks, AT, 30).map((t) => t.ref)).toEqual(["lot-filled"]);
  });
});
