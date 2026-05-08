/**
 * @since 4.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import type { IFs, Volume } from "memfs";
import * as Context from "../../../core/context.js";
import * as Layer from "../../../core/layer.js";
import * as Eff from "../../../effect-next.js";
import { makeOfficialFileSystem } from "./factory.js";
import { Pathe } from "./Path.js";
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
    Layer.provideMerge(Layer.succeed(Backend, deps)),
    Layer.provideMerge(Pathe.layer)
  );

/**
 * @category Layers
 */
export const layerMemWith = (deps: {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
  path?: "win32" | "posix";
  cwd?: string;
}): Eff.Layer<Eff.FileSystem | Eff.Path, never, never> =>
  makeOfficialFileSystem(
    deps.cwd?.startsWith(".") ? "/" + deps.cwd.slice(1) : deps.cwd
  ).pipe(
    Layer.provide(layerMemWithoutBackend()),
    Layer.provide(Layer.succeed(Backend, deps)),
    Layer.provideMerge(Pathe.layer)
  );

export const layerMemWithoutBackend = /**#__PURE__**/ lazy(() =>
  Layer.effect(
    BackendPlatformProvider,
    Eff.gen(function* () {
      const deps = yield* Backend;
      return yield* BackendPlatformProvider.make({
        fs: deps.fs as never,
        Os: {
          tmpdir:
            deps.tmpdir ??
            (() => deps.vol.mkdtempSync("tmp").toString("utf-8")),
        },
      });
    })
  )
);

export type Backend = {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
};

/**
 * @since 1.0.0
 * @category Layers
 */
export const Backend = /**#__PURE__**/ Context.Service<Backend, Backend>(
  "@providers/memfs"
);
