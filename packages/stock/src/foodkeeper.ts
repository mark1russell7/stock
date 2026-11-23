// The FoodKeeper defaults: an add-on dataset of the pantry time of each food, from the FoodKeeper data of USDA FSIS
// (CC0 1.0). The core of the stock names no food. This entry gives a due rule for a lot whose label has no date.

import { FOODKEEPER_PRODUCTS, FOODKEEPER_VERSION } from "./foodkeeper-data.ts";
import type { DueRule } from "./types.ts";

/** The citation of a dataset: its id, its title, its address, its license and its version. */
export interface FoodKeeperSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly version: number;
  readonly versionDate: string;
}

/** The source of the dataset, for each citation of a due rule. */
export const FOODKEEPER_SOURCE: FoodKeeperSource = {
  id: "usda-fsis-foodkeeper",
  title: "FoodKeeper data, USDA Food Safety and Inspection Service",
  url: "https://catalog.data.gov/dataset/fsis-foodkeeper-data",
  license: "CC0-1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  version: FOODKEEPER_VERSION.number,
  versionDate: FOODKEEPER_VERSION.date,
};

/**
 * The fields of each food of the FoodKeeper data.
 * The basis `purchase` counts from the date of purchase. The basis `stored` counts from the start of the storage.
 */
export interface FoodKeeperBase {
  /** The `ID` of the product in the FoodKeeper data. */
  readonly id: number;
  readonly name: string | null;
  readonly subtitle: string | null;
  readonly category: string | null;
  readonly keywords: string | null;
  readonly basis: "purchase" | "stored";
}

/** A food with a pantry time. The times are for quality, not for safety. */
export interface FoodKeeperTimed extends FoodKeeperBase {
  readonly min: number;
  readonly max: number;
  readonly unit: "day" | "week" | "month" | "year";
}

/** A food whose pantry time in the data is `Indefinitely`, for example granulated sugar or salt. */
export interface FoodKeeperIndefinite extends FoodKeeperBase {
  readonly unit: "indefinitely";
  readonly min?: never;
  readonly max?: never;
}

/** A food of the FoodKeeper data: a food with a pantry time, or a food that keeps with no limit. */
export type FoodKeeperProduct = FoodKeeperTimed | FoodKeeperIndefinite;

export { FOODKEEPER_PRODUCTS };

/** The days of one unit. A month is 30 days and a year is 365 days, thus a time in days is not longer than the time of the source. */
const DAYS: Readonly<Record<FoodKeeperTimed["unit"], number>> = { day: 1, week: 7, month: 30, year: 365 };

/**
 * This function gives the pantry time of a product in days: the low end of its range (`min`), or the high end (`max`).
 * A product that keeps with no limit gives `undefined`.
 */
export function shelfLifeDays(product: FoodKeeperTimed, end?: "min" | "max"): number;
export function shelfLifeDays(product: FoodKeeperProduct, end?: "min" | "max"): number | undefined;
export function shelfLifeDays(product: FoodKeeperProduct, end: "min" | "max" = "min"): number | undefined {
  return product.unit === "indefinitely" ? undefined : product[end] * DAYS[product.unit];
}

/**
 * This function gives the due rule of a product, with the citation of the dataset. The low end of the range is the default.
 * A product that keeps with no limit gives the rule `none`, with the citation.
 */
export function foodKeeperRule(product: FoodKeeperProduct, end: "min" | "max" = "min"): DueRule {
  const source = `${FOODKEEPER_SOURCE.id}#${product.id}`;
  if (product.unit === "indefinitely") return { kind: "none", source };
  return { kind: "days", days: shelfLifeDays(product, end), source };
}

/**
 * This function gives the products that have each word of `query` in their name, subtitle or keywords. The case
 * has no effect. A query with no word gives no product.
 */
export function findFoodKeeper(query: string): FoodKeeperProduct[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];
  return FOODKEEPER_PRODUCTS.filter((p) => {
    const text = [p.name, p.subtitle, p.keywords].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
