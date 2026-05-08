import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import * as Layer from "effect/Layer";
import { PlatformError } from "effect/PlatformError";
import * as Backend from "./Backend.js";
import * as Effect from "./core/effect.js";
import { Glob } from "./Glob.js";

const make = /*@__PURE__*/ Effect.gen(function* () {
  const fs = yield* Backend.FileSystem;
  const path_ = yield* Backend.Path;
  const globService = yield* Glob;

  const glob = Effect.fn("FsUtils.glob")(
    (
      pattern: string | ReadonlyArray<string>,
      options?: Glob.GlobOptionsWithFileTypesFalse
    ) => globService.glob(pattern, options)
  );

  const globFiles = (
    pattern: string | ReadonlyArray<string>,
    options: Glob.GlobOptionsWithFileTypesFalse = {}
  ) => glob(pattern, { ...options, nodir: true });

  const modifyFile = (path: string, f: (s: string, path: string) => string) =>
    fs.readFileString(path).pipe(
      Effect.bindTo("original"),
      Effect.let("modified", ({ original }) => f(original, path)),
      Effect.flatMap(({ modified, original }) =>
        original === modified
          ? Effect.void
          : fs.writeFile(path, new TextEncoder().encode(modified))
      ),
      Effect.withSpan("FsUtils.modifyFile", { attributes: { path } })
    );

  const modifyGlob = (
    pattern: string | ReadonlyArray<string>,
    f: (s: string, path: string) => string,
    options?: Glob.GlobOptionsWithFileTypesFalse
  ) =>
    globFiles(pattern, options).pipe(
      Effect.flatMap((paths) =>
        Effect.forEach(paths, (path) => modifyFile(path, f), {
          concurrency: "inherit",
          discard: true,
        })
      ),
      Effect.withSpan("FsUtils.modifyGlob", { attributes: { pattern } })
    );

  const rmAndCopy = (from: string, to: string) =>
    fs
      .remove(to, { recursive: true })
      .pipe(
        Effect.ignore,
        Effect.zipRight(fs.copy(from, to)),
        Effect.withSpan("FsUtils.rmAndCopy", { attributes: { from, to } })
      );

  const copyIfExists = (from: string, to: string) =>
    fs.access(from).pipe(
      Effect.zipRight(Effect.ignore(fs.remove(to, { recursive: true }))),
      Effect.zipRight(fs.copy(from, to)),
      Effect.catchTag("PlatformError", (e) =>
        e.reason._tag === "NotFound" ? Effect.void : Effect.fail(e)
      ),
      Effect.withSpan("FsUtils.copyIfExists", { attributes: { from, to } })
    );

  const mkdirCached_ = yield* Effect.cachedFunction((path: string) =>
    fs
      .makeDirectory(path, { recursive: true })
      .pipe(Effect.withSpan("FsUtils.mkdirCached", { attributes: { path } }))
  );
  const mkdirCached = (path: string) => mkdirCached_(path_.resolve(path));

  const copyGlobCached = (baseDir: string, pattern: string, to: string) =>
    globFiles(path_.join(baseDir, pattern)).pipe(
      Effect.flatMap(
        Effect.forEach(
          (path) => {
            const dest = path_.join(to, path_.relative(baseDir, path));
            const destDir = path_.dirname(dest);
            return mkdirCached(destDir).pipe(
              Effect.zipRight(fs.copyFile(path, dest))
            );
          },
          { concurrency: "inherit", discard: true }
        )
      ),
      Effect.withSpan("FsUtils.copyGlobCached", {
        attributes: { baseDir, pattern, to },
      })
    );

  const rmAndMkdir = (path: string) =>
    fs
      .remove(path, { recursive: true })
      .pipe(
        Effect.ignore,
        Effect.zipRight(mkdirCached(path)),
        Effect.withSpan("FsUtils.rmAndMkdir", { attributes: { path } })
      );

  const readJson = (path: string) =>
    Effect.tryMap(fs.readFileString(path), {
      try: (_) => JSON.parse(_),
      catch: (e) => new Error(`readJson failed (${path}): ${e}`),
    });

  function readYaml<A>(path: string) {
    return Effect.tryMap(fs.readFileString(path), {
      try: (_) => Bun.YAML.parse(_) as A,
      catch: (e) => new Error(`readYaml failed (${path}): ${e}`),
    });
  }

  function readJSONL<A>(path: string) {
    return Effect.tryMap(fs.readFileString(path), {
      try: (_) => Bun.JSONL.parse(_) as A[],
      catch: (e) => new Error(`readJSONL failed (${path}): ${e}`),
    });
  }

  const writeJson = Effect.fn(function* (
    path: string,
    json: unknown,
    option: { recursive?: boolean } = {}
  ) {
    if (option.recursive) yield* mkdirCached(path_.dirname(path));
    return yield* fs.writeFileString(
      path,
      JSON.stringify(json, null, 2) + "\n"
    );
  });

  const writeYaml = Effect.fn(function* (
    path: string,
    json: unknown,
    option: { recursive?: boolean } = {}
  ) {
    if (option.recursive) yield* mkdirCached(path_.dirname(path));
    return yield* fs.writeFileString(
      path,
      Bun.YAML.stringify(json, null, 2) + "\n"
    );
  });

  const writeJSONL = Effect.fn(function* (
    path: string,
    json: unknown[],
    option: { recursive?: boolean } = {}
  ) {
    if (option.recursive) yield* mkdirCached(path_.dirname(path));
    return yield* fs.writeFileString(
      path,
      json.map((json) => JSON.stringify(json)).join("\n") + "\n"
    );
  });

  return {
    FileSystem: fs,
    glob,
    globFiles,
    modifyFile,
    modifyGlob,
    copyIfExists,
    rmAndMkdir,
    rmAndCopy,
    mkdirCached,
    copyGlobCached,
    readFileString: fs.readFileString,
    readFile: fs.readFile,
    readDirectory: fs.readDirectory,
    writeFile: fs.writeFile,
    writeFileString: fs.writeFileString,
    readDirectoryWithType: (
      path: string,
      options?: { readonly recursive?: boolean | undefined }
    ) =>
      fs.readDirectory(path, {
        ...options,
        withFileTypes: true,
      } as any) as unknown as Effect.Effect<
        import("node:fs").Dirent[],
        PlatformError,
        never
      >,
    readJson,
    writeJson,
    readYaml,
    writeYaml,
    readJSONL,
    writeJSONL,
  } as const;
});

export class FsUtils extends /*@__PURE__*/ Effect.Service<FsUtils>()(
  "@effect/build-tools/FsUtils",
  {
    accessors: true,
    effect: make,
    dependencies: [
      Glob.Default.pipe(
        Layer.provideMerge(NodeFileSystem.layer),
        Layer.provideMerge(NodePath.layerPosix)
      ),
    ],
  }
) {}

export const FsUtilsLive = FsUtils.Default.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.provideMerge(NodePath.layerPosix)
);
export const FsUtilsLiveWithoutBackend = FsUtils.DefaultWithoutDependencies;
