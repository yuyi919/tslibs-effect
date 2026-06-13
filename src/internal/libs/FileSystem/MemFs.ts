/**
 * @since 4.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import * as Context from "effect/Context";
import * as Eff from "effect/Effect";
import { FileSystem } from "effect/FileSystem";
import * as Layer from "effect/Layer";
import type { IFs, Volume } from "memfs";
import { makeOfficialFileSystem } from "./factory.js";
import { Path } from "./Path.js";
import { BackendPlatformProvider } from "./Platform.js";

/**
 * @category Layers
 */
export const layerMem = (deps: {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
  cwd?: string;
}) =>
  makeOfficialFileSystem(deps.cwd).pipe(
    Layer.provide(layerMemWithoutBackend()),
    Layer.provideMerge(Layer.succeed(MemFsBackend, deps)),
    Layer.provideMerge(Path.layer)
  );

/**
 * @category Layers
 */
export const layerMemWith = (deps: {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
  cwd?: string;
}): Layer.Layer<FileSystem | Path, never, never> =>
  makeOfficialFileSystem(
    deps.cwd?.startsWith(".") ? "/" + deps.cwd.slice(1) : deps.cwd
  ).pipe(
    Layer.provide(layerMemWithoutBackend()),
    Layer.provide(Layer.succeed(MemFsBackend, deps)),
    Layer.provideMerge(Path.layer)
  );

export const layerMemWithoutBackend = /**#__PURE__**/ lazy(() =>
  Layer.effect(
    BackendPlatformProvider,
    Eff.gen(function* () {
      const deps = yield* MemFsBackend;
      return yield* BackendPlatformProvider.make({
        fs: deps.fs as never,
        Os: {
          tmpdir:
            deps.tmpdir ??
            (() => deps.vol.mkdtempSync("tmp").toString("utf-8")),
          homedir:
            deps.homedir ??
            (() => deps.vol.mkdtempSync("home").toString("utf-8")),
        },
      });
    })
  )
);

export type MemFsBackend = {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
  homedir?: () => string;
};

/**
 * @since 1.0.0
 * @category Layers
 */
export const MemFsBackend = /**#__PURE__**/ Context.Service<
  MemFsBackend,
  MemFsBackend
>("@providers/MemFsBackend");
