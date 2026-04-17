import { describe, expect } from "bun:test";
import { Effect, RequestResolver } from "effect";
import { it } from "../../../../BunTester";
import { batched, batchedOrSingle } from "../../../../core/effect/batched";

describe("batched", () => {
  it.effect("batches multiple requests into a single execution", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const batchFn = batched((ids: number[]) => {
        executionCount++;
        return Effect.succeed(ids.map((id) => id * 2));
      });

      const results = yield* Effect.all([batchFn(1), batchFn(2), batchFn(3)], {
        concurrency: 3,
      });

      expect(results).toEqual([2, 4, 6]);
      // Wait, the requests are batched into a single resolver call
      expect(executionCount).toBe(1);
    })
  );

  it.effect("deduplicates identical requests", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const batchFn = batched((ids: number[]) => {
        executionCount++;
        return Effect.succeed(ids.map((id) => id * 2));
      });

      const results = yield* Effect.all([batchFn(1), batchFn(1), batchFn(1)], {
        concurrency: 3,
      });

      expect(results).toEqual([2, 2, 2]);
      expect(executionCount).toBe(1);
    })
  );
});

describe("batchedOrSingle", () => {
  it.effect("executes single request directly without batching", () =>
    Effect.gen(function* () {
      let executionCount = 0;
      const fn = batchedOrSingle(
        (id: number) => {
          executionCount++;
          return Effect.succeed(id * 2);
        },
        (ids: number[]) => {
          executionCount++;
          return Effect.succeed(
            ids.map((id) => id * 2) as [number, ...number[]]
          );
        }
      );

      const result = yield* fn(5);
      expect(result).toBe(10);
      // Execution count should be 1 because single is called
      expect(executionCount).toBe(1);
    })
  );

  it.effect("batches multiple requests", () =>
    Effect.gen(function* () {
      let batchCount = 0;
      let singleCount = 0;
      const fn = batchedOrSingle(
        (id: number) => {
          singleCount++;
          return Effect.succeed(id * 2);
        },
        (ids: number[]) => {
          batchCount++;
          return Effect.succeed(
            ids.map((id) => id * 2) as [number, ...number[]]
          );
        }
      );

      const results = yield* Effect.all([fn(1), fn(2), fn(3)], {
        concurrency: 3,
      });

      expect(results).toEqual([2, 4, 6]);
      expect(batchCount).toBe(1);
      expect(singleCount).toBe(0);
    })
  );
});
