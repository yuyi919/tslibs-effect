import { flow, Layer } from "effect";
import * as Context from "../../../core/context.js";
import * as Eff from "../../../core/effect.js";
import { Path } from "./Path.js";

export declare namespace BackendPlatformProvider {
  export interface Interface {
    readonly Os: BackendPlatformProvider.Os;
    readonly path: Path;
    readonly fs: typeof import("node:fs");
  }
  export type Os = {
    tmpdir: () => string;
    homedir: () => string;
  };
}

export class BackendPlatformProvider extends Context.Service<
  BackendPlatformProvider,
  BackendPlatformProvider.Interface
>()("@backend-adapter/providers", {
  make: Eff.fn(function* (options?: {
    fs?: typeof import("node:fs");
    Os?: BackendPlatformProvider.Os;
  }) {
    return {
      Os: options?.Os ?? (yield* Eff.promise(() => import("node:os"))),
      path: yield* Path,
      fs: options?.fs ?? (yield* Eff.promise(() => import("node:fs"))),
    };
  }),
}) {
  static makeSharedNodeLayer = (
    self: Layer.Layer<Path, never, never> = Path.layer
  ) =>
    Layer.provideMerge(
      Layer.effect(BackendPlatformProvider, BackendPlatformProvider.make()),
      self
    );

  static makeLayer = flow(
    BackendPlatformProvider.make,
    Layer.effect(BackendPlatformProvider)
  );

  static Real = this.makeSharedNodeLayer(Path.layer);
}
