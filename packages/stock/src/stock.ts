// The queries over the lots: the due date of a rule, the usable lots at a date, the amount of each resource, and the draws
// of first expiring, first out.

import { addDays, dayOf } from "./dates.ts";
import type { DueRule, IsoDate, Lot, ProductYield } from "./types.ts";

/**
 * This function gives the due date of a lot from its rule.
 * The rule `label` needs the date of the label. The rule `days` adds its days to the date of purchase.
 * The rule `none` gives no due date. The rules `days` and `none` do not use the date of the label.
 */
export function dueDate(rule: Exclude<DueRule, { readonly kind: "none" }>, bought: IsoDate, label?: IsoDate): IsoDate;
export function dueDate(rule: DueRule, bought: IsoDate, label?: IsoDate): IsoDate | undefined;
export function dueDate(rule: DueRule, bought: IsoDate, label?: IsoDate): IsoDate | undefined {
  if (rule.kind === "none") {
    dayOf(bought);
    return undefined;
  }
  if (rule.kind === "label") {
    if (label === undefined) throw new RangeError("the due rule `label` needs the date of the label");
    dayOf(label);
    return label;
  }
  if (!Number.isInteger(rule.days) || rule.days < 0) throw new RangeError(`the days of a due rule must be a whole number of 0 or more: ${rule.days}`);
  return addDays(bought, rule.days);
}

/**
 * This function gives true when the lot gives to its resource at the date. Then the lot has units, and the date is before
 * the due date. A lot with no due date is usable at each date.
 */
export function isUsable(lot: Lot, at: IsoDate): boolean {
  const today = dayOf(at);
  return lot.units > 0 && (lot.due === undefined || today < dayOf(lot.due));
}

/**
 * This function gives the amount of each resource at the date: the sum of `units * perUnit` of each usable lot.
 * It throws when a lot has a product with no yield.
 */
export function amounts(lots: readonly Lot[], yields: readonly ProductYield[], at: IsoDate): Map<string, number> {
  const byProduct = new Map(yields.map((y) => [y.product, y]));
  const out = new Map<string, number>();
  for (const lot of lots) {
    if (!isUsable(lot, at)) continue;
    const y = byProduct.get(lot.product);
    if (!y) throw new RangeError(`the product ${lot.product} of the lot ${lot.id} has no yield`);
    out.set(y.resource, (out.get(y.resource) ?? 0) + lot.units * y.perUnit);
  }
  return out;
}

/**
 * This function sorts lots by their due date, the first due first. The lots with no due date come last.
 * Lots with the same due date, or with no due date, sort by `id`.
 */
export function byDue(lots: readonly Lot[]): Lot[] {
  const day = (lot: Lot): number => (lot.due === undefined ? Number.POSITIVE_INFINITY : dayOf(lot.due));
  return [...lots].sort((a, b) => {
    const da = day(a);
    const db = day(b);
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** One draw from one lot. */
export interface Draw {
  readonly lot: string;
  readonly units: number;
}

/** The draws for one use, and the units that the stock cannot give. */
export interface DrawPlan {
  readonly draws: readonly Draw[];
  readonly short: number;
}

/**
 * This function gives the draws of first expiring, first out for a use of `units` of one product at the date.
 * It uses only the usable lots. When the stock has too few units, `short` gives the units that are missing.
 */
export function drawFirstExpiring(lots: readonly Lot[], product: string, units: number, at: IsoDate): DrawPlan {
  if (!(units >= 0)) throw new RangeError(`the units of a use must be 0 or more: ${units}`);
  const draws: Draw[] = [];
  let left = units;
  for (const lot of byDue(lots.filter((l) => l.product === product && isUsable(l, at)))) {
    if (left <= 0) break;
    const take = Math.min(left, lot.units);
    draws.push({ lot: lot.id, units: take });
    left -= take;
  }
  return { draws, short: left };
}
