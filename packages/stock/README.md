# @mark1russell7/stock

Stock with due dates. A lot is an amount of one product at one place, with its date of purchase and its due date. The core names no kind of item. The products, places and sources of a user are input data.

## What the package gives

- `dueDate(rule, bought, label)` gives the due date of a lot from its rule. The rule `label` uses the date on the label. The rule `days` adds a count of days to the date of purchase, and cites its source.
- `isUsable(lot, at)` and `amounts(lots, yields, at)` give the usable lots and the amount of each resource at a date. A lot gives nothing on its due date and after it.
- `drawFirstExpiring(lots, product, units, at)` gives the draws of first expiring, first out for one use.
- `foldLog(events)` gives the current stock from an append-only log. The fold removes copies of an event by `id`, so each order of arrival gives the same stock. The order of the keys of an event has no effect.
- `stockLog(storage)` keeps the log on a collection storage, one item for each event. Two copies of the log merge as a union, so a sync has no conflict.
- `rotationDate(lot, useRate, leadDays)` gives the date to start to use a lot: `due - units / useRate - leadDays`.
- `routineTasks(at, routines, lastDone)` gives the next task of each routine: a check, a drill, a review or a purchase on a recurrence rule of `@mark1russell7/algebra/clock`. A record in `lastDone` makes a past date a late task.
- `sortTasks(tasks)` merges the rotation tasks and the routine tasks by due date.
- `rotationTasks(at, lots, useRates, leadDays)` gives a task for each lot that the use does not finish before its due date, and for each lot past its due date.

## Example

```ts
import { amounts, rotationTasks, tasksWithin } from "@mark1russell7/stock";

const lots = [{ id: "a", product: "can", place: "shelf-1", units: 12, bought: "2026-10-01", due: "2028-10-01" }];
const yields = [{ product: "can", resource: "food.ready", perUnit: 400, due: { kind: "label" } }] as const;

amounts(lots, yields, "2026-12-01"); // Map { "food.ready" => 4800 }
tasksWithin(rotationTasks("2026-12-01", lots, { can: 0 }, 7), "2026-12-01", 30); // []
```

## The FoodKeeper defaults

The entry `@mark1russell7/stock/foodkeeper` is an add-on dataset. It gives the pantry time of 290 foods from the FoodKeeper data of USDA FSIS, version 128. The license of the data is CC0 1.0. The root entry names no food.

- `findFoodKeeper(query)` gives the products that have each word of the query.
- `foodKeeperRule(product, end)` gives a due rule of the kind `days` that cites the product. The default end is `min`, the low end of the range.
- A month is 30 days and a year is 365 days. Thus a rule is not longer than the time of the source.
- The times are for quality, not for safety.

```ts
import { findFoodKeeper, foodKeeperRule } from "@mark1russell7/stock/foodkeeper";

const [rice] = findFoodKeeper("rice white");
foodKeeperRule(rice); // { kind: "days", days: 730, source: "usda-fsis-foodkeeper#338" }
```

The command `node scripts/foodkeeper-import.ts <file>` of the repository makes `src/foodkeeper-data.ts` from `foodkeeper.json`. The data file records the SHA-256 of its source.

## Planned

The roadmap of the repository (`docs/ROADMAP.md`) has the next items: the inventory records on the log and the demo site.
