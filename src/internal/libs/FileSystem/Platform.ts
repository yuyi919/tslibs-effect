import { flow, Layer } from "effect";
import * as Context from "../../../core/context.js";
import * as Eff from "../../../core/effect.js";

export declare namespace BackendPlatformProvider {
  export interface Interface {
    readonly Os: Eff.Effect<BackendPlatformProvider.Os>;
    readonly fs: Eff.Effect<typeof import("node:fs")>;
  }
  export type Os = {
    tmpdir: () => string;
    homedir: () => string;
  };
}

export class BackendPlatformProvider extends Context.Reference<BackendPlatformProvider.Interface>(
  "@backend-adapter/providers",
  {
    defaultValue: () => ({
      Os: Eff.promise(() => import("node:os")),
      fs: Eff.promise(() => import("node:fs")),
    }),
  }
) {
  static make = Eff.fn(function* (options?: {
    fs?: typeof import("node:fs");
    Os?: BackendPlatformProvider.Os;
  }) {
    return {
      Os: options?.Os
        ? Eff.succeed(options.Os)
        : Eff.promise(() => import("node:os")),
      fs: options?.fs
        ? Eff.succeed(options.fs)
        : Eff.promise(() => import("node:fs")),
    };
  });

  static makeLayer = flow(
    BackendPlatformProvider.make,
    Layer.effect(BackendPlatformProvider)
  );

  /**
   * @deprecated 不再使用
   */
  static Real = Layer.empty;
}
