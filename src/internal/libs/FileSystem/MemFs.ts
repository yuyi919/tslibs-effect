/**
 * @since 4.0.0
 */

import * as SharedNodePath from "@effect/platform-node-shared/NodePath";
import { lazy } from "@yuyi919/shared-proto/Functions";
import { layer } from "effect/Path";
import type { IFs, Volume } from "memfs";
import * as Context from "../../../core/context";
import * as Layer from "../../../core/layer";
import * as Eff from "../../../effect-next";
import { makeOfficialFileSystem } from "./factory";
import { BackendPlatformProvider } from "./Platform";

/**
 * @category Layers
 */
export const layerMem = (deps: {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
}) =>
  layerMemWithoutBackend().pipe(Layer.provide(Layer.succeed(Backend, deps)));

/**
 * @category Layers
 */
export const layerMemWith = (deps: {
  fs: IFs;
  vol: Volume;
  tmpdir?: () => string;
  path?: "win32" | "posix";
}): Eff.Layer.Layer<Eff.FileSystem.FileSystem | Eff.Path.Path, never, never> =>
  makeOfficialFileSystem().pipe(
    Layer.provide(layerMemWithoutBackend()),
    Layer.provide(Layer.succeed(Backend, deps)),
    Layer.provideMerge(layer)
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
