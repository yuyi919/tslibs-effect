import { unsafeCoerce } from "@yuyi919/shared-proto/Functions";
import { Schema, Stream } from "effect";
import * as Layer from "effect/Layer";
import type * as GlobLib from "glob";
import * as Effect from "./Effect.js";

/**
 * @since 1.0.0
 * @category errors
 */
export class GlobError extends Schema.TaggedErrorClass<GlobError>()(
  "GlobError",
  {
    pattern: Schema.Union([Schema.String, Schema.Array(Schema.String)]),
    cause: Schema.Unknown,
  }
) {}

export declare namespace Glob {
  export type GlobOptionsWithFileTypesFalse =
    GlobLib.GlobOptionsWithFileTypesFalse;
  export type GlobOptionsWithFileTypesUnset =
    GlobLib.GlobOptionsWithFileTypesUnset;
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly glob: (
      pattern: string | ReadonlyArray<string>,
      options?:
        | GlobLib.GlobOptionsWithFileTypesFalse
        | GlobLib.GlobOptionsWithFileTypesUnset
    ) => Effect.Effect<string[], GlobError>;
    readonly globWithFileTypes: (
      pattern: string | ReadonlyArray<string>,
      options?: Omit<GlobLib.GlobOptions, "withFileTypes">
    ) => Effect.Effect<GlobLib.Path[], GlobError>;
    readonly stream: (
      pattern: string | ReadonlyArray<string>,
      options?: GlobLib.GlobOptions
    ) => Stream.Stream<string, GlobError>;
  }
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Glob extends Effect.Service<Glob>()("@effect/utils/Glob", {
  accessors: true,
  effect: Effect.gen(function* () {
    const loadGlobLayer = Effect.tryPromise(() => import("glob"));
    const backend: Glob.Service = {
      glob: (pattern, options) =>
        loadGlobLayer.pipe(
          Effect.flatMap((_) =>
            Effect.tryPromise(() =>
              _.glob(unsafeCoerce(pattern), options ?? {})
            )
          ),
          Effect.catch(({ cause }) => new GlobError({ pattern, cause }))
        ),
      globWithFileTypes: (pattern, options) =>
        loadGlobLayer.pipe(
          Effect.flatMap((_) =>
            Effect.tryPromise(() =>
              _.glob(unsafeCoerce(pattern), {
                ...options,
                withFileTypes: true,
              } as GlobLib.GlobOptionsWithFileTypesTrue)
            )
          ),
          Effect.catch(({ cause }) => new GlobError({ pattern, cause }))
        ),
      stream: (pattern, options) =>
        loadGlobLayer.pipe(
          Effect.catch(({ cause }) => new GlobError({ pattern, cause })),
          Effect.flatMap((_) =>
            Effect.try({
              try: () =>
                _.globIterate(
                  pattern as string | Array<string>,
                  options ?? {}
                ) as AsyncGenerator<string, void, void>,
              catch: (cause) => new GlobError({ pattern, cause }),
            })
          ),
          Stream.fromEffect,
          Stream.flatMap((_) =>
            Stream.fromAsyncIterable(
              _,
              (cause) => new GlobError({ pattern, cause })
            )
          )
        ),
    };
    return backend;
  }),
}) {}
