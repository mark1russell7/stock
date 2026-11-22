import { describe, expect, it } from "vitest";
import { addEvent, curve, dueOf, PRODUCTS, sampleLog, view, YIELDS } from "./demo.ts";

const TODAY = "2026-11-22";

describe("the demo model", () => {
  it("gives each sample product a yield, and a FoodKeeper rule to each food", () => {
    expect(YIELDS.map((y) => y.product)).toEqual(PRODUCTS.map((p) => p.id));
    for (const y of YIELDS) expect(y.due.kind).toBe(y.resource === "water.gal" ? "label" : "days");
  });

  it("uses the label date when there is one, else the FoodKeeper default", () => {
    expect(dueOf("rice", TODAY, "2027-01-01")).toBe("2027-01-01");
    expect(dueOf("rice", TODAY) > "2027-11-22").toBe(true);
    expect(() => dueOf("water", TODAY)).toThrow(RangeError);
  });

  it("folds the sample log with no problem, and the use event takes 10 lb of the first rice lot", () => {
    const v = view(sampleLog(TODAY), TODAY);
    expect(v.problems).toEqual([]);
    expect(v.lots).toHaveLength(10);
    expect(v.lots.find((l) => l.lot.id === "lot-1")?.lot.units).toBe(40);
    expect(v.foodDays).toBeGreaterThan(30);
    expect(v.waterDays).toBe(7);
  });

  it("sorts the lots by due date and shows a lot past its due date as not usable", () => {
    const v = view(sampleLog(TODAY), "2029-11-22");
    const dues = v.lots.map((l) => l.lot.due);
    expect(dues).toEqual([...dues].sort());
    expect(v.lots.some((l) => !l.usable)).toBe(true);
    expect(v.kcal).toBeLessThan(view(sampleLog(TODAY), TODAY).kcal);
  });

  it("lists a task for a lot due within 30 days, and none for a lot due later", () => {
    const log = [addEvent(1, TODAY, "water", 5, TODAY, "2026-12-10"), addEvent(2, TODAY, "water", 5, TODAY, "2027-06-01")];
    const v = view(log, TODAY);
    expect(v.tasks.map((t) => t.ref)).toEqual(["lot-1"]);
  });

  it("gives a curve that never goes up, because the household adds nothing", () => {
    const pts = curve(sampleLog(TODAY), TODAY, 156, 7);
    expect(pts).toHaveLength(157);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.foodDays).toBeLessThanOrEqual(pts[i - 1]!.foodDays);
    expect(pts.at(-1)!.waterDays).toBe(0);
  });
});
