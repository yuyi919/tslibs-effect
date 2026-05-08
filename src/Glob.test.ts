import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner";
import { Layer } from "effect";
import { memfs } from "memfs";
import { Effect, FsUtils } from ".";
import * as BunTester from "./BunTester";
import { describe } from "./BunTester";
import { Glob } from "./Glob";
import { collectGitignoreGlobs } from "./internal/utils/gitignore-globs/src";
import { createMemfs } from "./internal/utils/gitignore-globs/src/fs/memfs";

describe("Glob", () => {
  BunTester.it.layer(
    [
      Glob.Default,
      BunChildProcessSpawner.layer.pipe(
        Layer.provideMerge(FsUtils.FsUtilsLive)
      ),
    ],
    { excludeTestServices: true }
  )((it) =>
    it.effect("should glob files", () =>
      Effect.gen(function* () {
        const fs = memfs({
          "/root/package.json": "{}",
          "/root/.gitignore": "node_modules/",
          "/root/packages/lib-a/node_modules/lib/package.json": "{}",
          "/root/packages/lib-a/src/package.json": "{}",
          "/root/packages/lib-a/.gitignore": "src/",
          "/root/packages/lib-a/package.json": "{}",
          "/root/node_modules/lib/package.json": "{}",
        });
        const globs = yield* Effect.tryPromise(() =>
          collectGitignoreGlobs({
            rootDir: "/root",
            fs: createMemfs(fs.vol),
          })
        );
        const files = yield* Glob.glob(["**/package.json"], {
          posix: true,
          dot: true,
          ignore: [...globs.map((_) => _.glob)],
          withFileTypes: false,
          includeChildMatches: true,
          fs: fs.fs as never,
          cwd: "/root",
        });
        BunTester.expect(files.slice(0, 50)).toEqual([
          "package.json",
          "packages/lib-a/package.json",
        ]);
      })
    )
  );
});
