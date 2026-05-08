import { describe, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { it } from "../../../BunTester.js";
import * as Context from "../../../core/context.js";
import { buildMemoized, withHelper } from "../../../core/layer.js";

describe("Layer Helpers", () => {
  interface ServiceA {
    value: number;
  }
  const ServiceA = Context.Tag("ServiceA")<ServiceA, ServiceA>();

  interface ServiceB {
    value: number;
  }
  const ServiceB = Context.Tag("ServiceB")<ServiceB, ServiceB>();

  describe("withHelper", () => {
    it.effect("provides layer via provide()", () =>
      Effect.gen(function* () {
        const layerA = Layer.succeed(ServiceA, { value: 10 });
        const helper = withHelper(layerA);

        const effect = Effect.map(
          Effect.context<never>(),
          (ctx) => Context.get(ctx as any, ServiceA).value
        );

        // Using helper.provide(effect)
        const result1 = yield* helper.provide(effect);
        expect(result1).toBe(10);

        // Using effect.pipe(helper.provide())
        const result2 = yield* effect.pipe(helper.provide());
        expect(result2).toBe(10);
      })
    );

    it.effect("merges layers via provideMerge()", () =>
      Effect.gen(function* () {
        const layerA = Layer.succeed(ServiceA, { value: 10 });
        const helperA = withHelper(layerA);

        const layerB = Layer.effect(
          ServiceB,
          Effect.map(Effect.context<never>(), (ctx) => ({
            value: Context.get(ctx as any, ServiceA).value * 2,
          }))
        );

        // layerB requires ServiceA, we provide it via helperA and keep both
        const mergedLayer = helperA.provideMerge(layerB);

        const effect = Effect.map(Effect.context<never>(), (ctx) => {
          const a = Context.get(ctx as any, ServiceA).value;
          const b = Context.get(ctx as any, ServiceB).value;
          console.log("a =", a, "b =", b);
          return a + b;
        });

        const result = yield* Effect.provide(effect, mergedLayer);
        expect(result).toBe(30); // 10 + 20
      })
    );

    it.effect("returns empty layer via optional() when failing", () =>
      Effect.gen(function* () {
        const failingLayer = Layer.effectDiscard(Effect.fail("error"));
        const helper = withHelper(failingLayer);
        const optionalLayer = helper.optional();

        // Providing an empty layer shouldn't fail the effect execution
        // But since it provides nothing, we can't extract the service
        // So we just test that providing the layer itself doesn't fail
        const result = yield* Effect.succeed(42).pipe(
          Effect.provide(optionalLayer)
        );
        expect(result).toBe(42);
      })
    );
  });

  describe("buildMemoized", () => {
    it.effect("builds a layer into context and caches it in scope", () =>
      Effect.gen(function* () {
        let initCount = 0;
        const layer = Layer.effect(
          ServiceA,
          Effect.sync(() => {
            initCount++;
            return { value: 42 };
          })
        );

        const id = "test-id";

        yield* Effect.scoped(
          Effect.gen(function* () {
            const memoMap = yield* Layer.makeMemoMap;

            const ctx1 = yield* buildMemoized(layer, id).pipe(
              Effect.provideService(Layer.CurrentMemoMap, memoMap)
            );
            const ctx2 = yield* buildMemoized(layer, id).pipe(
              Effect.provideService(Layer.CurrentMemoMap, memoMap)
            );

            const a1 = Context.get(ctx1, ServiceA);
            const a2 = Context.get(ctx2, ServiceA);

            expect(a1.value).toBe(42);
            expect(a2.value).toBe(42);
            expect(initCount).toBe(1); // Should only initialize once per scope due to memoization
          })
        );
      })
    );
  });
});
