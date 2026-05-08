import { describe, expect, test } from "bun:test";
import { collectGitignoreGlobs } from "../../src/collect.js";
import { fsFromVolume } from "../_helpers/memfs.js";
import { createEdgecasesFixtureVolume } from "./fixtures.memfs.js";

describe("integration: edgecases fixtures (memfs)", () => {
  test("case-bom-escapes：应读到根 .gitignore，但不应读到 ignored-dir/.gitignore", async () => {
    const vol = await createEdgecasesFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/cases/case-bom-escapes",
      fs,
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has(".gitignore")).toBeTrue();
    expect(files.has("ignored-dir/.gitignore")).toBeFalse();

    const globs = res.map((x) => x.glob);
    expect(globs).toContain("**/#not-a-comment.txt");
    expect(globs).toContain("**/!not-a-negation.txt");
    expect(globs).toContain("**/foo bar.txt");
    expect(globs).toContain("**/ignored-dir/**");
  });

  test("case-anchored：/build/ 只应剪枝根 build，不应剪枝 sub/build", async () => {
    const vol = await createEdgecasesFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/cases/case-anchored",
      fs,
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has("sub/build/.gitignore")).toBeTrue();
    expect(files.has("build/.gitignore")).toBeFalse();
  });

  test("case-hidden：应剪枝 .cache，但应读取 .config/.gitignore", async () => {
    const vol = await createEdgecasesFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/cases/case-hidden",
      fs,
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has(".cache/.gitignore")).toBeFalse();
    expect(files.has(".config/.gitignore")).toBeTrue();
  });

  test("case-charclass：dist[0-9]/ 应剪枝 dist1，但不剪枝 distA", async () => {
    const vol = await createEdgecasesFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/cases/case-charclass",
      fs,
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has("dist1/.gitignore")).toBeFalse();
    expect(files.has("distA/.gitignore")).toBeTrue();
  });

  test("case-negation-prune：展示剪枝优先策略的限制（不会进入 vendor/keep）", async () => {
    const vol = await createEdgecasesFixtureVolume();
    const fs = fsFromVolume(vol);

    const res = await collectGitignoreGlobs({
      rootDir: "/cases/case-negation-prune",
      fs,
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has("vendor/keep/.gitignore")).toBeFalse();

    // 但根 .gitignore 的规则仍会被解析出来
    const rootRules = res.filter((x) => x.file === ".gitignore");
    expect(rootRules.some((x) => x.glob === "**/vendor/**")).toBeTrue();
    expect(
      rootRules.some((x) => x.glob === "vendor/keep/**" && x.negated)
    ).toBeTrue();
  });
});
