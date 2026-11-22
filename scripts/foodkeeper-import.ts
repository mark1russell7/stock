// This command makes packages/stock/src/foodkeeper-data.ts from the FoodKeeper file of USDA FSIS (CC0 1.0).
// Start it with the path of the file: node scripts/foodkeeper-import.ts <path of foodkeeper.json>

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { foodKeeperImport, foodKeeperModule } from "../packages/stock/src/foodkeeper-import.ts";

const path = process.argv[2];
if (path === undefined) throw new Error("give the path of foodkeeper.json");
const bytes = readFileSync(path);
const result = foodKeeperImport(JSON.parse(bytes.toString("utf8")));
const sha256 = createHash("sha256").update(bytes).digest("hex");
writeFileSync(new URL("../packages/stock/src/foodkeeper-data.ts", import.meta.url), foodKeeperModule(result, sha256));
console.log(`products ${result.products.length}, version ${result.version.number} ${result.version.date}, skipped ${JSON.stringify(result.skipped)}`);
