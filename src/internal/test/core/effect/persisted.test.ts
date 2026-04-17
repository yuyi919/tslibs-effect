import { describe, expect } from "bun:test";
import { Effect, Layer } from "effect";
import { KeyValueStore, Persistence } from "effect/unstable/persistence";
import { it } from "../../../../BunTester";
import { persisted, persistedBatch } from "../../../../core/effect/persisted";

const TestPersistenceLayer = Persistence.layerKvs.pipe(
  Layer.provideMerge(KeyValueStore.layerMemory)
);

describe("persisted", () => {
  it.effect("persists the result and uses cache on subsequent calls", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const fn = persisted(
        (id: string) => {
          executionCount++;
          return Effect.succeed(`value-${id}`);
        },
        { storeId: "test-key", timeToLive: () => "1 minute" }
      );

      const r1 = yield* fn("1");
      const r2 = yield* fn("1");

      expect(r1).toBe("value-1");
      expect(r2).toBe("value-1");
      // Should only execute once due to caching
      expect(executionCount).toBe(1);
    }).pipe(Effect.provide(TestPersistenceLayer))
  );

  it.effect("executes again for different keys", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const fn = persisted(
        (id: string) => {
          executionCount++;
          return Effect.succeed(`value-${id}`);
        },
        { storeId: "test-key-2", timeToLive: () => "1 minute" }
      );

      yield* fn("1");
      yield* fn("2");

      // Should execute twice since arguments are different
      expect(executionCount).toBe(2);
    }).pipe(Effect.provide(TestPersistenceLayer))
  );
});

describe("persistedBatch", () => {
  it.effect("batches and persists results", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const fn = persistedBatch(
        (ids: string[]) => {
          executionCount++;
          return Effect.succeed(ids.map((id) => `value-${id}`));
        },
        { storeId: "test-batch-key", timeToLive: () => "1 minute" }
      );

      // Concurrent calls should be batched
      const results = yield* Effect.all([fn("1"), fn("2"), fn("1")], {
        concurrency: 3,
      });

      expect(results).toEqual(["value-1", "value-2", "value-1"]);
      // Single batch execution
      expect(executionCount).toBe(1);

      // Subsequent call should hit cache
      const r = yield* fn("1");
      expect(r).toBe("value-1");
      // Execution count should still be 1
      expect(executionCount).toBe(1);
    }).pipe(Effect.provide(TestPersistenceLayer))
  );
});
