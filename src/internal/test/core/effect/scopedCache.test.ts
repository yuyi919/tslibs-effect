import { describe, expect } from "bun:test";
import { it } from "../../../../BunTester";
import { Effect, Scope, Ref } from "effect";
import { scopedCacheWith } from "../../../../core/effect/scopedCache";

describe("scopedCacheWith", () => {
	it.effect("caches effect execution within the same scope", () =>
		Effect.gen(function* () {
			let executions = 0;
			const effect = Effect.sync(() => {
				executions++;
				return 42;
			});

			const key = {}; // A unique reference key for caching
			const cachedEffect = scopedCacheWith(effect, key);

			const result = yield* Effect.scoped(
				Effect.gen(function* () {
					const r1 = yield* cachedEffect;
					const r2 = yield* cachedEffect;
					const r3 = yield* cachedEffect;
					return [r1, r2, r3];
				})
			);

			expect(result).toEqual([42, 42, 42]);
			// Should only execute once per scope
			expect(executions).toBe(1);
		})
	);

	it.effect("re-executes in a different scope", () =>
		Effect.gen(function* () {
			let executions = 0;
			const effect = Effect.sync(() => {
				executions++;
				return 42;
			});

			const key = {};
			const cachedEffect = scopedCacheWith(effect, key);

			// First scope
			yield* Effect.scoped(cachedEffect);
			
			// Second scope
			yield* Effect.scoped(cachedEffect);

			// Should execute twice because they are in different scopes
			expect(executions).toBe(2);
		})
	);
});