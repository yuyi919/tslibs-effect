import { describe, expect, test } from "bun:test";
import { Volume } from "memfs";
import { collectGitignoreGlobs } from "../src/collect.js";
import { fsFromVolume } from "./_helpers/memfs.js";

describe("collectGitignoreGlobs (memfs)", () => {
  test("父目录被 ignore 时剪枝：不再读取子目录 .gitignore（node_modules）", async () => {
    const vol = Volume.fromNestedJSON(
      {
        repo: {
          ".gitignore": "node_modules/\n",
          node_modules: { a: { ".gitignore": "should-not-appear/\n" } },
          packages: { p: { ".gitignore": "dist/\n" } },
        },
      },
      "/"
    );

    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs: fsFromVolume(vol),
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has(".gitignore")).toBeTrue();
    expect(files.has("packages/p/.gitignore")).toBeTrue();
    expect(files.has("node_modules/a/.gitignore")).toBeFalse();
  });

  test("锚定规则 /build/ 只影响根 build，不应剪枝 sub/build", async () => {
    const vol = Volume.fromNestedJSON(
      {
        repo: {
          ".gitignore": "/build/\n",
          sub: { build: { ".gitignore": "ok/\n" } },
          build: { ".gitignore": "should-not-appear/\n" },
        },
      },
      "/"
    );

    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs: fsFromVolume(vol),
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has(".gitignore")).toBeTrue();
    expect(files.has("sub/build/.gitignore")).toBeTrue();
    // 根 build/ 被 ignore，因此其 .gitignore 不应出现
    expect(files.has("build/.gitignore")).toBeFalse();
  });

  test("字符类 dist[0-9]/ 能用于剪枝：dist1 下 .gitignore 不应被读取", async () => {
    const vol = Volume.fromNestedJSON(
      {
        repo: {
          ".gitignore": "dist[0-9]/\n",
          dist1: { ".gitignore": "no/\n" },
          distA: { ".gitignore": "yes/\n" },
        },
      },
      "/"
    );

    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs: fsFromVolume(vol),
      dot: true,
    });
    const files = new Set(res.map((x) => x.file));
    expect(files.has("dist1/.gitignore")).toBeFalse();
    expect(files.has("distA/.gitignore")).toBeTrue();
  });

  test("BOM 与转义：\\# / \\! 不应被当作注释/否定", async () => {
    const bom = "\ufeff";
    const vol = Volume.fromNestedJSON(
      {
        repo: {
          ".gitignore": `${bom}\\#not-a-comment.txt\n\\!not-a-negation.txt\n`,
        },
      },
      "/"
    );

    const res = await collectGitignoreGlobs({
      rootDir: "/repo",
      fs: fsFromVolume(vol),
      dot: true,
    });
    const globs = res.map((x) => x.glob);
    expect(globs).toContain("**/#not-a-comment.txt");
    expect(globs).toContain("**/!not-a-negation.txt");
  });
});
