# Roadmap

This file is the plan of stock. The Status page of the site reads it, and the tracker of the project mirrors it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| R1 | The first package | done | The package `@mark1russell7/stock`: lots, due rules, the usable amount at a date, first expiring first out, the fold of the log, rotation tasks. |
| S2 | The first npm release | done | The owner bootstrapped the package `@mark1russell7/stock` at 0.1.0. Each release after it goes through `release.yml`. |
| S3 | The contract types move here | done | The shared contract of the prep program imports `DueRule`, `ProductYield`, `Lot`, `StockEvent` and `Task` from this package. |
| S4 | The recurrence rule | done | `@mark1russell7/algebra` 0.9.10 has calendar dates and a recurrence rule (systems PR 636). The stock uses them, and `dates.ts` keeps only the error contract. |
| S5 | Checks, drills, reviews and buys | done | `routineTasks` gives the next task of each routine (check, drill, review, buy) from the recurrence rule of `algebra/clock`, with late tasks. |
| S6 | The FoodKeeper defaults | done | The entry `@mark1russell7/stock/foodkeeper` gives the pantry time of 290 foods from the USDA FoodKeeper data (CC0), version 128. Each due rule cites its product. |
| S7 | The log on the sync engine | active | `stockLog(storage)` keeps the log on a collection storage of `client-store`, one item for each event, with no second store. A `correct` event (0.2.0) gives new fields to a lot after a count. Next: the inventory records move onto the log. |
| S8 | The demo site | done | The home page folds a sample log at a date that you select. It shows the days of food and water, the next 30 days and each lot. |
| S9 | A lot with no due date | open | Tools, gear and some foods have no due date. Today a `Lot` must have a due date, so these lots stay off the log. |
