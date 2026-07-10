import { unsafeCoerce } from "@yuyi919/shared-proto/Functions";
import { isFn } from "@yuyi919/shared-proto/JsTypes";
import * as Effect from "effect/Effect";
import * as O from "effect/Option";
import * as Context from "../../Context.js";
import type * as t from "../../Types.js";

export function serviceOr<
  K extends Context.Key<any, any>,
  A extends Context.Service.Shape<K>,
  E = never,
  R = never,
>(
  key: K,
  or: t.Effect<A, E, R> | ((_: K) => t.Effect<A, E, R>)
): t.Effect<A, E, R> {
  return pipe(
    Effect.serviceOption(key),
    Effect.flatMapEager(
      flow(
        O.map(Effect.succeed),
        O.getOrElse(isFn(or) ? () => or(key) : () => or)
      )
    )
  );
}

export function serviceOrMake<
  K extends Context.Key<any, any> & { make: t.Effect<any, any, any> },
>(
  keyWithMake: K
): t.Effect.Success<K["make"]> extends Context.Service.Shape<K>
  ? K["make"]
  : "arguments is invalid";
export function serviceOrMake<
  K extends Context.Key<any, any> & { make: t.Effect<any, any, any> },
>(
  keyWithMake: K
): t.Effect.Success<K["make"]> extends Context.Service.Shape<K>
  ? K["make"]
  : "arguments is invalid";
export function serviceOrMake<
  K extends Context.Key<any, any> & { make: t.Effect<any, any, any> },
>(
  keyWithMake: K
): t.Effect.Success<K["make"]> extends Context.Service.Shape<K>
  ? K["make"]
  : "arguments is invalid" {
  return unsafeCoerce(
    serviceOr(keyWithMake, () => keyWithMake.make) satisfies K["make"]
  );
}
