// The stock with due dates: lots, due rules as data, first expiring first out, rotation dates, and a fold of an append-only log.
// The core names no kind of item. The products, places and sources of a user are input data.

export type { DueRule, IsoDate, Lot, PlaceId, ProductYield, RemoveReason, SourceId, StockEvent, Task } from "./types.ts";
export { amounts, byDue, drawFirstExpiring, dueDate, isUsable } from "./stock.ts";
export type { Draw, DrawPlan } from "./stock.ts";
export { foldLog } from "./log.ts";
export type { RemovedLot, StockState } from "./log.ts";
export { rotationDate, rotationTasks, tasksWithin } from "./schedule.ts";
export { routineProblems, routineTasks, sortTasks } from "./routines.ts";
export type { Recurrence, Routine } from "./routines.ts";
export { stockLog } from "./store.ts";
export type { AppendResult, LogStorage, StockLog } from "./store.ts";
