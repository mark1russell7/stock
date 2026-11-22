import { describe, expect, it } from "vitest";
import { dueDate } from "./index.ts";
import { FOODKEEPER_PRODUCTS, FOODKEEPER_SOURCE, findFoodKeeper, foodKeeperRule, shelfLifeDays } from "./foodkeeper.ts";

const byId = (id: number) => {
  const p = FOODKEEPER_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`no product ${id}`);
  return p;
};

describe("the FoodKeeper dataset", () => {
  it("has a valid pantry time for each product, and one entry for each id", () => {
    expect(FOODKEEPER_PRODUCTS.length).toBe(290);
    const ids = FOODKEEPER_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
    for (const p of FOODKEEPER_PRODUCTS) {
      expect(Number.isInteger(p.min) && p.min > 0 && p.min <= p.max).toBe(true);
      expect(p.name).not.toBeNull();
    }
  });

  it("cites its source and its license", () => {
    expect(FOODKEEPER_SOURCE.license).toBe("CC0-1.0");
    expect(FOODKEEPER_SOURCE.version).toBe(128);
    expect(FOODKEEPER_SOURCE.versionDate).toBe("2018-09-06");
  });

  it("keeps the values of the source for the staples", () => {
    // The values of foodkeeper.json version 128: white rice 2 years, dried beans 1 to 2 years, peanut butter 6 to 24 months.
    expect(byId(338)).toMatchObject({ name: "Rice", subtitle: "white or wild", basis: "purchase", min: 2, max: 2, unit: "year" });
    expect(byId(333)).toMatchObject({ name: "Beans", subtitle: "dried", min: 1, max: 2, unit: "year" });
    expect(byId(387)).toMatchObject({ name: "Peanut butter", min: 6, max: 24, unit: "month" });
    expect(byId(618)).toMatchObject({ name: "Tuna", basis: "stored", min: 3, max: 3, unit: "year" });
  });
});

describe("the due rules of the dataset", () => {
  it("give the days of the range, and never more days than the source", () => {
    expect(shelfLifeDays(byId(333))).toBe(365);
    expect(shelfLifeDays(byId(333), "max")).toBe(730);
    expect(shelfLifeDays(byId(387))).toBe(180);
    expect(shelfLifeDays(byId(372), "max")).toBe(5 * 365);
  });

  it("give a rule that cites the product, and that dueDate applies", () => {
    const rule = foodKeeperRule(byId(338));
    expect(rule).toEqual({ kind: "days", days: 730, source: "usda-fsis-foodkeeper#338" });
    expect(dueDate(rule, "2026-11-21")).toBe("2028-11-20");
  });
});

describe("the search", () => {
  it("finds the products that have each word", () => {
    expect(findFoodKeeper("rice white").map((p) => p.id)).toContain(338);
    expect(findFoodKeeper("PEANUT butter").map((p) => p.id)).toEqual(expect.arrayContaining([387, 488]));
    expect(findFoodKeeper("canned low acid").map((p) => p.id)).toContain(372);
  });

  it("gives no product for an empty query or an unknown word", () => {
    expect(findFoodKeeper("  ")).toEqual([]);
    expect(findFoodKeeper("zzzz")).toEqual([]);
  });
});
