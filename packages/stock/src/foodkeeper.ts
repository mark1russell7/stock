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
 * The pantry time of one food. The times are for quality, not for safety.
 * The basis `purchase` counts from the date of purchase. The basis `stored` counts from the start of the storage.
 */
export interface FoodKeeperProduct {
  /** The `ID` of the product in the FoodKeeper data. */
  readonly id: number;
  readonly name: string | null;
  readonly subtitle: string | null;
  readonly category: string | null;
  readonly keywords: string | null;
  readonly basis: "purchase" | "stored";
  readonly min: number;
  readonly max: number;
  readonly unit: "day" | "week" | "month" | "year";
}

export { FOODKEEPER_PRODUCTS };

/** The days of one unit. A month is 30 days and a year is 365 days, thus a time in days is not longer than the time of the source. */
const DAYS: Readonly<Record<FoodKeeperProduct["unit"], number>> = { day: 1, week: 7, month: 30, year: 365 };

/** This function gives the pantry time of a product in days: the low end of its range (`min`), or the high end (`max`). */
export function shelfLifeDays(product: FoodKeeperProduct, end: "min" | "max" = "min"): number {
  return product[end] * DAYS[product.unit];
}

/** This function gives the due rule of a product, with the citation of the dataset. The low end of the range is the default. */
export function foodKeeperRule(product: FoodKeeperProduct, end: "min" | "max" = "min"): DueRule {
  return { kind: "days", days: shelfLifeDays(product, end), source: `${FOODKEEPER_SOURCE.id}#${product.id}` };
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
