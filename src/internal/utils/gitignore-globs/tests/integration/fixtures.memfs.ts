import { Volume } from "memfs";
import { join } from "pathe";
import { collectNestedDirectoryJSON } from "../../src/collectNestedDirectoryJSON";

/**
 * 说明：
 * - 这些 fixture 是把你之前在本地创建的测试目录“完整迁移”为 memfs 的 nested JSON 形式。
 * - 每个 fixture 返回一个 Volume；测试时用 rootDir 指向对应子树根目录即可。
 */

export async function createMonorepoFixtureVolume(): Promise<Volume> {
  return Volume.fromNestedJSON(
    {
      repo: await collectNestedDirectoryJSON({
        rootDir: join(__dirname, "../fixtures/gitignore-test-monorepo"),
        skipGitDir: true,
      }),
    },
    "/"
  );
  return Volume.fromNestedJSON(
    {
      repo: {
        ".gitignore": [
          "############################################",
          "# gitignore-test-monorepo (fixture)",
          "############################################",
          "",
          "# 常见 monorepo 忽略",
          "node_modules/",
          "dist/",
          ".turbo/",
          ".cache/",
          "",
          "# 环境变量（但保留示例）",
          ".env",
          "!.env.example",
          "",
          "# 包级产物/依赖（示例）",
          "packages/*/dist/",
          "packages/*/node_modules/",
          "",
        ].join("\n"),
        ".env.example": "DEMO_ENV=1\n",
        packages: {
          "pkg-a": {
            ".gitignore": [
              "############################################",
              "# packages/pkg-a",
              "############################################",
              "",
              "dist/",
              "coverage/",
              "*.log",
              "",
            ].join("\n"),
            src: {},
            node_modules: {
              "should-not-read": {
                ".gitignore": [
                  "# 这个文件位于 packages/pkg-a/node_modules/ 之下",
                  "# 由于 root .gitignore / packages/*/node_modules/ 会剪枝，这里也不应该被读到",
                  "ignored-from-packages-node_modules/",
                  "",
                ].join("\n"),
              },
            },
          },
          "pkg-b": {
            ".gitignore": [
              "############################################",
              "# packages/pkg-b",
              "############################################",
              "",
              "dist/",
              "apps/**/build/",
              "",
            ].join("\n"),
            apps: {
              "app-x": {
                ".gitignore": [
                  "############################################",
                  "# packages/pkg-b/apps/app-x",
                  "############################################",
                  "",
                  ".next/",
                  ".env.local",
                  "",
                ].join("\n"),
              },
            },
            dist: {
              ".gitignore": [
                "# 这个文件位于 packages/pkg-b/dist/ 之下",
                "# 由于 packages/pkg-b/.gitignore 忽略了 dist/，遍历应剪枝，不应该读取到这里",
                "should-not-appear-from-dist/",
                "",
              ].join("\n"),
            },
          },
        },
        node_modules: {
          "also-ignored": {
            ".gitignore": [
              "# 这个文件位于被 root .gitignore 忽略的 node_modules/ 之下",
              "# 正确行为：遍历应剪枝，不应该再读取到这里",
              "should-not-appear-from-node_modules/",
              "",
            ].join("\n"),
          },
        },
      },
    },
    "/"
  );
}

export async function createEdgecasesFixtureVolume(): Promise<Volume> {
  return Volume.fromNestedJSON(
    {
      cases: await collectNestedDirectoryJSON({
        rootDir: join(__dirname, "../fixtures/gitignore-test-edgecases"),
        skipGitDir: true,
      }),
    },
    "/"
  );
  const bom = "\ufeff";
  return Volume.fromNestedJSON(
    {
      cases: {
        "case-bom-escapes": {
          ".gitignore": [
            `${bom}############################################`,
            "# 注意：本文件第一字符为 BOM（用于测试脚本的 BOM 处理）",
            "############################################",
            "",
            "# 注释行应被忽略",
            "",
            "\\#not-a-comment.txt",
            "\\!not-a-negation.txt",
            "",
            "# 带空格：gitignore 里通常用反斜杠转义空格",
            "foo\\ bar.txt",
            "",
            "# 忽略一个目录：其下 .gitignore 不应再被扫描/读取",
            "ignored-dir/",
            "",
          ].join("\n"),
          "ignored-dir": {
            ".gitignore": [
              "# 位于被 ignore 的 ignored-dir/ 之下",
              "# 正确行为：遍历应剪枝，不应读取到这里",
              "should-not-appear-from-ignored-dir/",
              "",
            ].join("\n"),
            sub: {},
          },
        },
        "case-anchored": {
          ".gitignore": [
            "############################################",
            "# anchored vs unanchored",
            "############################################",
            "",
            "# 只忽略“根目录的 build/”",
            "/build/",
            "",
            "# 非锚定：任意层级的 cache/",
            "cache/",
            "",
            "# 仅忽略根目录某文件",
            "/exact.txt",
            "",
          ].join("\n"),
          sub: {
            build: {
              ".gitignore": [
                "# 该 .gitignore 位于 sub/build/ 下",
                "# 因为 root 里忽略的是 /build/（仅根 build），不应剪枝到 sub/build",
                "sub-build-should-appear/",
                "",
              ].join("\n"),
            },
          },
          // 根 build/ 被 /build/ ignore，因此其下就算有 .gitignore 也不应被读取
          build: {
            ".gitignore": "should-not-appear-from-root-build/\n",
          },
        },
        "case-hidden": {
          ".gitignore": [
            "############################################",
            "# hidden directories",
            "############################################",
            "",
            ".cache/",
            "",
          ].join("\n"),
          ".cache": {
            ".gitignore": [
              "# 位于被 ignore 的 .cache/ 之下",
              "# 正确行为：遍历应剪枝，不应读取到这里",
              "cache-should-not-appear/",
              "",
            ].join("\n"),
            inner: {},
          },
          ".config": {
            ".gitignore": [
              "# 位于未 ignore 的 .config/ 之下：应被读取",
              "config-should-appear/",
              "",
            ].join("\n"),
          },
        },
        "case-charclass": {
          ".gitignore": [
            "############################################",
            "# char class / single-char patterns",
            "############################################",
            "",
            "# 字符类：dist0 dist1 ... dist9（目录）",
            "dist[0-9]/",
            "",
            "# 单字符通配：file1.tmp, fileA.tmp 等",
            "file?.tmp",
            "",
          ].join("\n"),
          dist1: {
            ".gitignore": [
              "# 位于 dist1/（应被 dist[0-9]/ ignore）之下",
              "# 正确行为：遍历应剪枝，不应读取到这里",
              "dist1-should-not-appear/",
              "",
            ].join("\n"),
          },
          distA: {
            ".gitignore": [
              "# 位于 distA/（不匹配 dist[0-9]/）之下",
              "# 应该会被扫描到",
              "distA-should-appear/",
              "",
            ].join("\n"),
          },
        },
        "case-negation-prune": {
          ".gitignore": [
            "############################################",
            "# negation inside ignored dir (展示剪枝策略限制)",
            "############################################",
            "",
            "vendor/",
            "!vendor/keep/",
            "",
          ].join("\n"),
          vendor: {
            keep: {
              ".gitignore": [
                "# 语义上这里是“被否定包含”的目录（!vendor/keep/）",
                "# 但当前脚本为了“父目录 ignore 就剪枝”，会直接跳过 vendor/，因此不会读取到本文件",
                "this-would-be-missed-due-to-prune-strategy/",
                "",
              ].join("\n"),
            },
          },
        },
      },
    },
    "/"
  );
}
