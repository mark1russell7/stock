// The stock log on a collection storage. Each event is one item, with its `id` as the key. The log only adds items,
// thus two copies of the log merge as a union, and a sync of the storage has no conflict.

import { canonicalJson } from "@mark1russell7/rigor-generators";
import { foldLog, type StockState } from "./log.ts";
import type { StockEvent } from "./types.ts";

/**
 * The part of a collection storage that the log uses. A `CollectionStorage<StockEvent>` of the client ecosystem has
 * it, for example a storage with a local copy and a remote copy. Thus the stock imports no storage package.
 */
export interface LogStorage {
  get(id: string): Promise<StockEvent | undefined>;
  getAll(): Promise<StockEvent[]>;
  set(id: string, value: StockEvent): Promise<void>;
}

/** The result of an append: `added` for a new event, `present` for an event that the log has with the same body. */
export type AppendResult = "added" | "present";

/** The stock log on a storage. */
export interface StockLog {
  /** This method adds an event. It throws a `RangeError` when the log has the `id` with a different body. */
  append(event: StockEvent): Promise<AppendResult>;
  /** This method gives each event of the log, in the order of the storage. */
  events(): Promise<StockEvent[]>;
  /** This method gives the current stock: the fold of each event. */
  state(): Promise<StockState>;
}

/**
 * This function gives the stock log on `storage`. The log does not change or delete an item.
 * Two writers that add the same `id` with different bodies at the same time both succeed. Then `state` names the clash.
 */
export function stockLog(storage: LogStorage): StockLog {
  return {
    async append(event) {
      if (typeof event?.id !== "string" || event.id.length === 0) throw new RangeError("an event of the stock log needs a nonempty id");
      const before = await storage.get(event.id);
      if (before !== undefined) {
        if (canonicalJson(before) === canonicalJson(event)) return "present";
        throw new RangeError(`the stock log has the event ${event.id} with a different body`);
      }
      await storage.set(event.id, event);
      return "added";
    },
    events: () => storage.getAll(),
    async state() {
      return foldLog(await storage.getAll());
    },
  };
}
