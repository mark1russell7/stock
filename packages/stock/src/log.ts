// The fold of the stock log. The log is a grow-only set of events, so the fold is the same for each order of arrival:
// it removes the copies of an event by `id`, then it applies the events in the order of `at`, then `id`.

import type { Lot, RemoveReason, StockEvent } from "./types.ts";

/** A lot that a `remove` event took out of the stock. */
export interface RemovedLot {
  readonly lot: Lot;
  readonly at: string;
  readonly why: RemoveReason;
}

/** The current stock: a fold of the log. */
export interface StockState {
  /** The lots with units, in the order of their `add` events. */
  readonly lots: readonly Lot[];
  readonly removed: readonly RemovedLot[];
  /** Each event that the fold cannot apply, with the reason. The fold continues after a problem. */
  readonly problems: readonly string[];
}

const order = (a: StockEvent, b: StockEvent): number =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** This function gives the current stock from the events of the log, in any order. */
export function foldLog(events: Iterable<StockEvent>): StockState {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const unique: StockEvent[] = [];
  for (const e of events) {
    const text = JSON.stringify(e);
    const before = seen.get(e.id);
    if (before === undefined) {
      seen.set(e.id, text);
      unique.push(e);
    } else if (before !== text) problems.push(`the event ${e.id} has two different bodies: the fold keeps the first`);
  }
  unique.sort(order);

  const live = new Map<string, Lot>();
  const removed: RemovedLot[] = [];
  const gone = new Set<string>();
  for (const e of unique) {
    if (e.kind === "add") {
      if (live.has(e.lot.id) || gone.has(e.lot.id)) problems.push(`the event ${e.id} adds the lot ${e.lot.id} a second time`);
      else if (!(e.lot.units > 0)) problems.push(`the event ${e.id} adds the lot ${e.lot.id} with ${e.lot.units} units`);
      else live.set(e.lot.id, e.lot);
      continue;
    }
    const lot = live.get(e.lot);
    if (!lot) {
      problems.push(`the event ${e.id} names the lot ${e.lot}, which is not in the stock`);
      continue;
    }
    if (e.kind === "remove") {
      live.delete(e.lot);
      gone.add(e.lot);
      removed.push({ lot, at: e.at, why: e.why });
      continue;
    }
    if (!(e.units > 0)) {
      problems.push(`the event ${e.id} uses ${e.units} units`);
      continue;
    }
    if (e.units > lot.units) problems.push(`the event ${e.id} uses ${e.units} units of the lot ${e.lot}, which has ${lot.units}: the lot is now empty`);
    const units = Math.max(0, lot.units - e.units);
    if (units === 0) {
      live.delete(e.lot);
      gone.add(e.lot);
    } else live.set(e.lot, { ...lot, units });
  }
  return { lots: [...live.values()], removed, problems };
}
