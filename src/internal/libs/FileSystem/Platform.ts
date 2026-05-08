import * as SharedNodePath from "@effect/platform-node-shared/NodePath";
import { flow, Layer } from "effect";
import { Path } from "effect/Path";
import * as Context from "../../../core/context.js";
import * as Eff from "../../../core/effect.js";

export interface BackendPlatform {
  readonly Os: {
    tmpdir: () => string;
  };
  readonly path: Path;
  readonly fs: typeof import("node:fs");
}
export class BackendPlatformProvider extends Context.Service<
  BackendPlatformProvider,
  BackendPlatform
>()("@backend-adapter/providers", {
  make: Eff.fn(function* (options?: {
    fs?: typeof import("node:fs");
    Os?: { tmpdir: () => string };
  }) {
    return {
      Os: options?.Os ?? (yield* Eff.promise(() => import("node:os"))),
      path: yield* Path,
      fs: options?.fs ?? (yield* Eff.promise(() => import("node:fs"))),
    };
  }),
}) {
  static makeSharedNodeLayer = (
    self: Layer.Layer<Path, never, never> = SharedNodePath.layer
  ) =>
    Layer.provideMerge(
      Layer.effect(BackendPlatformProvider, BackendPlatformProvider.make()),
      self
    );

  static makeLayer = flow(
    BackendPlatformProvider.make,
    Layer.effect(BackendPlatformProvider)
  );

  static Real = this.makeSharedNodeLayer(SharedNodePath.layer);
  static RealPosix = this.makeSharedNodeLayer(SharedNodePath.layerPosix);
  static RealWin32 = this.makeSharedNodeLayer(SharedNodePath.layerWin32);
}
