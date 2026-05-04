import { describe, expect, test } from "bun:test";
import { collectGitignoreGlobs } from "../../src/collect";
import { fsFromVolume } from "../_helpers/memfs";
import { createMonorepoFixtureVolume } from "./fixtures.memfs";

describe("integration: monorepo fixture (memfs)", () => {
  test("应读取未被剪枝的各层 .gitignore，并跳过 node_modules/dist 下的 .gitignore", async () => {
    const vol = await createMonorepoFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs,
      dot: true,
      skipGitDir: true,
    });
    const files = new Set(res.map((x) => x.file));

    // 应读取到的
    expect(files.has(".gitignore")).toBeTrue();
    expect(files.has("packages/pkg-a/.gitignore")).toBeTrue();
    expect(files.has("packages/pkg-b/.gitignore")).toBeTrue();
    expect(files.has("packages/pkg-b/apps/app-x/.gitignore")).toBeTrue();

    // 不应读取到的（父目录被 ignore 后剪枝）
    expect(files.has("node_modules/also-ignored/.gitignore")).toBeFalse();
    expect(
      files.has("packages/pkg-a/node_modules/should-not-read/.gitignore")
    ).toBeFalse();
    expect(files.has("packages/pkg-b/dist/.gitignore")).toBeFalse();
  });

  test("root 的 node_modules/ 规则应生成可用于剪枝的 glob", async () => {
    const vol = await createMonorepoFixtureVolume();
    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs: fsFromVolume(vol),
      dot: true,
    });
    const globs = res
      .filter((x) => x.file === ".gitignore")
      .map((x) => `${x.glob}${x.negated ? " !" : ""}`);
    expect(globs).toContain("**/node_modules/**");
  });
});
