// The fold of the stock log. The log is a grow-only set of events, so the fold is the same for each order of arrival:
// it removes the copies of an event by `id`, then it applies the events in the order of `at`, then `id`.

import { canonicalJson } from "@mark1russell7/rigor-generators";
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
  // The canonical form ignores the order of the keys. Of two different bodies, the fold keeps the body with the
  // smaller canonical form, thus the result is the same for each order of arrival.
  const seen = new Map<string, { readonly text: string; readonly event: StockEvent }>();
  const clashes = new Set<string>();
  for (const e of events) {
    const text = canonicalJson(e);
    const before = seen.get(e.id);
    if (before === undefined) seen.set(e.id, { text, event: e });
    else if (before.text !== text) {
      clashes.add(e.id);
      if (text < before.text) seen.set(e.id, { text, event: e });
    }
  }
  for (const id of [...clashes].sort()) problems.push(`the event ${id} has two different bodies: the fold keeps the body with the smaller canonical form`);
  const unique = [...seen.values()].map((s) => s.event).sort(order);

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
    if (e.kind === "correct") {
      if (!live.has(e.lot.id)) problems.push(`the event ${e.id} corrects the lot ${e.lot.id}, which is not in the stock`);
      else if (!(e.lot.units > 0)) problems.push(`the event ${e.id} corrects the lot ${e.lot.id} to ${e.lot.units} units: use a remove event`);
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
