// The model of the demo: sample products, a sample log and the view of the stock at a date. It has no DOM, so the tests use it.
// Each view comes from a fold of the event log, as in a real app of the package.

import { addDays as clockAddDays, dayNumber } from "@mark1russell7/algebra/clock";
import {
  amounts,
  dueDate,
  foldLog,
  isUsable,
  rotationTasks,
  tasksWithin,
  type IsoDate,
  type Lot,
  type ProductYield,
  type StockEvent,
  type Task,
} from "@mark1russell7/stock";
import { FOODKEEPER_PRODUCTS, FOODKEEPER_SOURCE, foodKeeperRule } from "@mark1russell7/stock/foodkeeper";

/** A product of the demo: its unit, what one unit gives, and the FoodKeeper product of its default due date. */
export interface DemoProduct {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  /** The resource that the product fills: calories of food or gallons of water. */
  readonly resource: "food.kcal" | "water.gal";
  readonly perUnit: number;
  /** The FoodKeeper product id. A product with none uses the date on the label. */
  readonly foodkeeper?: number;
}

/** The sample products. The calories of one unit are approximate values of USDA FoodData Central. */
export const PRODUCTS: readonly DemoProduct[] = [
  { id: "rice", name: "White rice", unit: "lb", resource: "food.kcal", perUnit: 1656, foodkeeper: 338 },
  { id: "beans", name: "Dried beans", unit: "lb", resource: "food.kcal", perUnit: 1574, foodkeeper: 333 },
  { id: "pasta", name: "Dry pasta", unit: "lb", resource: "food.kcal", perUnit: 1683, foodkeeper: 335 },
  { id: "canned", name: "Canned soup", unit: "can", resource: "food.kcal", perUnit: 400, foodkeeper: 372 },
  { id: "pb", name: "Peanut butter", unit: "lb", resource: "food.kcal", perUnit: 2667, foodkeeper: 387 },
  { id: "flour", name: "White flour", unit: "lb", resource: "food.kcal", perUnit: 1651, foodkeeper: 222 },
  { id: "water", name: "Bottled water", unit: "gal", resource: "water.gal", perUnit: 1 },
];

/** This function adds days to a calendar date. The demo makes only real dates, so a bad date is a bug. */
function addDays(date: IsoDate, days: number): IsoDate {
  const out = clockAddDays(date, days);
  if (out === undefined) throw new RangeError(`not a real calendar date: ${date}`);
  return out;
}

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

/** This function gives the product with the id. It throws a `RangeError` for an unknown id. */
export function product(id: string): DemoProduct {
  const p = byId.get(id);
  if (p === undefined) throw new RangeError(`the demo has no product ${id}`);
  return p;
}

/** The yields of the sample products, for `amounts`. A product with no FoodKeeper id uses the label rule. */
export const YIELDS: readonly ProductYield[] = PRODUCTS.map((p) => {
  const food = p.foodkeeper === undefined ? undefined : FOODKEEPER_PRODUCTS.find((f) => f.id === p.foodkeeper);
  return { product: p.id, resource: p.resource, perUnit: p.perUnit, due: food ? foodKeeperRule(food) : { kind: "label" } };
});

/** This function gives the due date of a new lot: the label date when there is one, else the rule of the product. */
export function dueOf(productId: string, bought: IsoDate, label?: IsoDate): IsoDate {
  if (label) return label;
  const rule = YIELDS.find((y) => y.product === productId)?.due ?? { kind: "label" as const };
  return dueDate(rule, bought, label);
}

/** This function gives the source of the due date of a lot, in words. */
export function dueSource(lot: Lot): string {
  const p = byId.get(lot.product);
  const food = p?.foodkeeper === undefined ? undefined : FOODKEEPER_PRODUCTS.find((f) => f.id === p.foodkeeper);
  if (food && dueDate(foodKeeperRule(food), lot.bought) === lot.due) return `FoodKeeper #${food.id}: ${food.name.replace(/ (.*$/, "")}${food.subtitle ? `, ${food.subtitle}` : ""}`;
  return "the label";
}

/** The source of the FoodKeeper data, for the page. */
export const SOURCE = FOODKEEPER_SOURCE;

/**
 * This function gives an add event for a new lot. The id of the event and of the lot come from `n`, a count of the log.
 * The time `at` is an ISO 8601 time, or a date: a date gets the time 12:00 UTC.
 */
export function addEvent(n: number, at: string, productId: string, units: number, bought: IsoDate, label?: IsoDate): StockEvent {
  const lot: Lot = { id: `lot-${n}`, product: productId, place: "pantry", units, bought, due: dueOf(productId, bought, label) };
  return { id: `e${n}`, kind: "add", at: at.length === 10 ? `${at}T12:00:00Z` : at, lot };
}

/** This function gives the sample log at the day of the visit: a pantry that a household bought over the last three years. */
export function sampleLog(today: IsoDate): StockEvent[] {
  const ago = (days: number): IsoDate => addDays(today, -days);
  const rows: readonly [string, number, number, IsoDate?][] = [
    ["rice", 50, 400],
    ["rice", 25, 40],
    ["beans", 20, 600],
    ["beans", 10, 90],
    ["pasta", 10, 200],
    ["canned", 24, 300],
    ["canned", 12, 30],
    ["pb", 6, 150],
    ["flour", 10, 170],
    ["water", 14, 60, addDays(today, 300)],
  ];
  const events = rows.map(([p, units, days, label], i) => addEvent(i + 1, ago(days), p, units, ago(days), label));
  events.push({ id: "e11", kind: "use", at: `${ago(20)}T18:00:00Z`, lot: "lot-1", units: 10 });
  return events;
}

/** A lot of the view, with its state at the date of the view. */
export interface LotView {
  readonly lot: Lot;
  readonly name: string;
  readonly unit: string;
  readonly usable: boolean;
  readonly daysLeft: number;
  readonly source: string;
}

/** The view of the stock at a date. */
export interface View {
  readonly at: IsoDate;
  readonly lots: readonly LotView[];
  readonly kcal: number;
  readonly gallons: number;
  readonly foodDays: number;
  readonly waterDays: number;
  readonly tasks: readonly Task[];
  readonly problems: readonly string[];
}

/** The need of a household: people, calories for each person each day, and gallons of water for each person each day. */
export interface Household {
  readonly people: number;
  readonly kcal: number;
  readonly gallons: number;
}

/** The household of the demo: 2 people, 2,000 calories each day (the FDA Daily Value) and 1 gallon of water each day (Ready.gov). */
export const HOUSEHOLD: Household = { people: 2, kcal: 2000, gallons: 1 };

const daysBetween = (a: IsoDate, b: IsoDate): number => (dayNumber(b) ?? 0) - (dayNumber(a) ?? 0);

/** This function gives the view of the log at the date: the lots, the amounts and the tasks of the next 30 days. */
export function view(events: readonly StockEvent[], at: IsoDate, hh: Household = HOUSEHOLD): View {
  const state = foldLog(events);
  const totals = amounts(state.lots, YIELDS, at);
  const kcal = totals.get("food.kcal") ?? 0;
  const gallons = totals.get("water.gal") ?? 0;
  const lots = [...state.lots]
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id < b.id ? -1 : 1))
    .map((lot) => {
      const p = byId.get(lot.product);
      return { lot, name: p?.name ?? lot.product, unit: p?.unit ?? "unit", usable: isUsable(lot, at), daysLeft: daysBetween(at, lot.due), source: dueSource(lot) };
    });
  return {
    at,
    lots,
    kcal,
    gallons,
    foodDays: kcal / (hh.people * hh.kcal),
    waterDays: gallons / (hh.people * hh.gallons),
    tasks: tasksWithin(rotationTasks(at, state.lots, {}, 30), at, 30),
    problems: state.problems,
  };
}

/** A point of the curve: the days of food and of water at a date, if the household uses nothing. */
export interface CurvePoint {
  readonly at: IsoDate;
  readonly foodDays: number;
  readonly waterDays: number;
}

/** This function gives the days of food and water at each step from the date. A drop shows a lot that reaches its due date. */
export function curve(events: readonly StockEvent[], from: IsoDate, steps: number, stepDays: number, hh: Household = HOUSEHOLD): CurvePoint[] {
  const state = foldLog(events);
  const out: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const at = addDays(from, i * stepDays);
    const t = amounts(state.lots, YIELDS, at);
    out.push({ at, foodDays: (t.get("food.kcal") ?? 0) / (hh.people * hh.kcal), waterDays: (t.get("water.gal") ?? 0) / (hh.people * hh.gallons) });
  }
  return out;
}
