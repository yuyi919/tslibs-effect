import { collectGitignoreGlobs } from "./collect";
import { joinPosix } from "./path";

const groupBy = <A, K extends string>(
  self: Iterable<A>,
  f: (a: A) => K
): Record<K, Array<A>> => {
  const out: Record<string, Array<A>> = {};
  for (const a of self) {
    const k = f(a);
    if (Object.hasOwn(out, k)) {
      out[k].push(a);
    } else {
      out[k] = [a];
    }
  }
  return out;
};
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
if (asJson) {
  args.delete("--json");
}
const argsArray = [...args];
const entry = argsArray[0] ?? "";
const cwd = process.cwd();
const rootDir = joinPosix(cwd, entry);
// console.log("rootDir", rootDir);
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
