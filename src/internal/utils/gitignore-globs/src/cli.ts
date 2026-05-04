#!/usr/bin/env bun
import { groupBy } from "es-toolkit";
import { collectGitignoreGlobs } from "./collect";

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const rootDir = process.cwd();

const results = await collectGitignoreGlobs({
  rootDir,
  dot: true,
  skipGitDir: true,
});

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const groups = Object.entries(groupBy(results, (r) => r.file));
  for (const [file, group] of groups) {
    console.log("# " + file);
    for (const r of group) {
      console.log(`${r.negated ? "!" : ""}${r.glob}`);
    }
    console.log("");
  }
}
