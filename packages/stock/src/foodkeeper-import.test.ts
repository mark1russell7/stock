import { describe, expect, it } from "vitest";
import { foodKeeperImport, foodKeeperModule } from "./foodkeeper-import.ts";

// A small file in the structure of foodkeeper.json: each row is a list of cells, and each cell has one key.
const row = (o: Record<string, unknown>): Record<string, unknown>[] => Object.entries(o).map(([k, v]) => ({ [k]: v }));
const file = {
  fileName: "foodkeeper.json",
  sheets: [
    { name: "Version", data: [row({ Data_Version_Number: 7, Modified_Date: "01-15-2015" }), row({ Data_Version_Number: 9, Modified_Date: "09-06-2018" })] },
    { name: "Category", data: [row({ ID: 1, Category_Name: "Grains", Subcategory_Name: null }), row({ ID: 2, Category_Name: "Meat", Subcategory_Name: "Canned" })] },
    {
      name: "Product",
      data: [
        row({ ID: 5, Category_ID: 2, Name: "Tuna", Name_subtitle: "canned", Keywords: "Tuna", Pantry_Min: 3, Pantry_Max: 3, Pantry_Metric: "Years" }),
        row({ ID: 2, Category_ID: 1, Name: " Rice ", Name_subtitle: "white  or wild", Keywords: "Rice", DOP_Pantry_Min: 2, DOP_Pantry_Max: 2, DOP_Pantry_Metric: "Years", Pantry_Max: 9, Pantry_Metric: "Days" }),
        row({ ID: 3, Category_ID: 1, Name: "Sugar", Pantry_Metric: "Indefinitely" }),
        row({ ID: 4, Category_ID: 1, Name: "Pie", Pantry_Min: 2, Pantry_Max: 2, Pantry_Metric: "Hours" }),
        row({ ID: 6, Category_ID: 9, Name: "Fruit cocktail", Pantry_Min: null, Pantry_Max: 18, Pantry_Metric: "Months" }),
        row({ ID: 7, Category_ID: 1, Name: "Butter" }),
      ],
    },
  ],
};

describe("the import of the FoodKeeper file", () => {
  it("keeps the products with a pantry time in days, weeks, months, years or Indefinitely, sorted by id", () => {
    const got = foodKeeperImport(file);
    expect(got.version).toEqual({ number: 9, date: "2018-09-06" });
    expect(got.products).toEqual([
      // The time from the date of purchase comes before the time of storage. The import cleans the spaces of a text.
      { id: 2, name: "Rice", subtitle: "white or wild", category: "Grains", keywords: "Rice", basis: "purchase", min: 2, max: 2, unit: "year" },
      // A food that keeps with no limit has no range.
      { id: 3, name: "Sugar", subtitle: null, category: "Grains", keywords: null, basis: "stored", unit: "indefinitely" },
      { id: 5, name: "Tuna", subtitle: "canned", category: "Meat / Canned", keywords: "Tuna", basis: "stored", min: 3, max: 3, unit: "year" },
      // A product with no low end gets its high end as the low end. An unknown category gives null.
      { id: 6, name: "Fruit cocktail", subtitle: null, category: null, keywords: null, basis: "stored", min: 18, max: 18, unit: "month" },
    ]);
    expect(got.skipped).toEqual({ Hours: 1 });
  });

  it("refuses a file with a different structure", () => {
    expect(() => foodKeeperImport({})).toThrow(RangeError);
    expect(() => foodKeeperImport({ sheets: [{ name: "Version", data: [row({ Data_Version_Number: 1, Modified_Date: "2018-09-06" })] }] })).toThrow(/MM-DD-YYYY/);
  });

  it("writes a module that names its source, its hash and each count", () => {
    const text = foodKeeperModule(foodKeeperImport(file), "ab".repeat(32));
    expect(text).toContain("version 9 of 2018-09-06, license CC0 1.0");
    expect(text).toContain(`The SHA-256 of the source file: ${"ab".repeat(32)}.`);
    expect(text).toContain("The import keeps 3 products");
    expect(text).toContain('export const FOODKEEPER_VERSION = { number: 9, date: "2018-09-06" } as const;');
  });
});
