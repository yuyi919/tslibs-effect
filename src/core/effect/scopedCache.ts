import { globalValue } from "@yuyi919/shared-proto/GlobalValue";
import { Scope } from "effect";
import * as Eff from "../effect.js";

const globalMap = globalValue(
  Symbol.for("@yui9/globalMap"),
  () => new WeakMap<Scope.Scope, Map<any, any>>()
);

export function scopedCacheWith<A, E, R>(
  eff: Eff.Effect<A, E, R>,
  id: any
): Eff.Effect<A, E, Scope.Scope | R> {
  return Eff.gen(function* () {
    const scope = yield* Scope.Scope;
    let map = globalMap.get(scope);
    if (!map) {
      globalMap.set(scope, (map = new Map()));
      yield* Scope.addFinalizer(
        scope,
        Eff.sync(() => {
          if (map) {
            map.clear();
            map = null!;
          }
          globalMap.delete(scope);
        })
      );
    }
    let value = (map as Map<string, A>).get(id);
    if (!map.has(id)) {
      value = yield* eff;
      yield* Eff.logTrace("scopedCacheWith: init", id);
      // console.log("scopedCacheWith", id);
      map.set(id, value);
    } else {
    }
    return value!;
  });
}
