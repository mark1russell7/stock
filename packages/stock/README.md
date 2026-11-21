# @mark1russell7/stock

Stock with due dates. A lot is an amount of one product at one place, with its date of purchase and its due date. The core names no kind of item. The products, places and sources of a user are input data.

## What the package gives

- `dueDate(rule, bought, label)` gives the due date of a lot from its rule. The rule `label` uses the date on the label. The rule `days` adds a count of days to the date of purchase, and cites its source.
- `isUsable(lot, at)` and `amounts(lots, yields, at)` give the usable lots and the amount of each resource at a date. A lot gives nothing on its due date and after it.
- `drawFirstExpiring(lots, product, units, at)` gives the draws of first expiring, first out for one use.
- `foldLog(events)` gives the current stock from an append-only log. The fold removes copies of an event by `id`, so each order of arrival gives the same stock. The order of the keys of an event has no effect.
- `stockLog(storage)` keeps the log on a collection storage, one item for each event. Two copies of the log merge as a union, so a sync has no conflict.
- `rotationDate(lot, useRate, leadDays)` gives the date to start to use a lot: `due - units / useRate - leadDays`.
- `rotationTasks(at, lots, useRates, leadDays)` gives a task for each lot that the use does not finish before its due date, and for each lot past its due date.

## Example

```ts
import { amounts, rotationTasks, tasksWithin } from "@mark1russell7/stock";

const lots = [{ id: "a", product: "can", place: "shelf-1", units: 12, bought: "2026-10-01", due: "2028-10-01" }];
const yields = [{ product: "can", resource: "food.ready", perUnit: 400, due: { kind: "label" } }] as const;

amounts(lots, yields, "2026-12-01"); // Map { "food.ready" => 4800 }
tasksWithin(rotationTasks("2026-12-01", lots, { can: 0 }, 7), "2026-12-01", 30); // []
```

## Planned

The roadmap of the repository (`docs/ROADMAP.md`) has the next items. The first item is the tasks of checks and drills, on the recurrence rule of `@mark1russell7/algebra/clock`. Then come the FoodKeeper defaults as an add-on dataset, and the inventory records on the log.
