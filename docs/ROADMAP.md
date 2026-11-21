# Roadmap

This file is the plan of stock. The Status page of the site reads it, and the tracker of the project mirrors it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| R1 | The first package | done | The package `@mark1russell7/stock`: lots, due rules, the usable amount at a date, first expiring first out, the fold of the log, rotation tasks. |
| S2 | The first npm release | open | The owner bootstraps the new package `@mark1russell7/stock` at 0.1.0. |
| S3 | The contract types move here | open | The shared contract of the prep program imports `DueRule`, `ProductYield`, `Lot`, `StockEvent` and `Task` from this package. |
| S4 | The recurrence rule | open | A pull request adds calendar dates and a recurrence rule to `@mark1russell7/algebra/clock`. Then the private date file of this package goes. |
| S5 | Checks, drills, reviews and buys | open | The schedule also gives a task for each device check, drill, source review and purchase, from the recurrence rule. |
| S6 | The FoodKeeper defaults | open | An add-on dataset gives the default shelf life of each food from the USDA FoodKeeper data (CC0), with its license. |
| S7 | The log on the sync engine | open | The log is a collection of `client-store`, with no second store. |
| S8 | The demo site | open | Replace the first site with a demo: add lots, see the amounts and the rotation tasks of the next 30 days. |
