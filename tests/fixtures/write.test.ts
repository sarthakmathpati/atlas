// Writes the fixture owners as backup data for screenshots and timing runs in a real browser:
//   ATLAS_FIXTURES_DIR=<dir> TZ=Asia/Kolkata npx vitest run tests/fixtures/write.test.ts
// Skipped in normal test runs.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { scenario, yearOfData } from "./scenarios";

const dir = process.env.ATLAS_FIXTURES_DIR;

it.skipIf(!dir)("writes the fixture owners as JSON", () => {
  mkdirSync(dir!, { recursive: true });
  for (const name of ["new", "mid", "week"] as const)
    writeFileSync(join(dir!, `${name}.json`), JSON.stringify(scenario(name)));
  writeFileSync(join(dir!, "year.json"), JSON.stringify(yearOfData()));
});
