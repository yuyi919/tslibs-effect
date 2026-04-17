import { describe, expect } from "bun:test";
import { Effect } from "effect";
import { it } from "../../../BunTester";
import { from, orElse, tapBoth, tryMap, zipRight } from "../../../core/effect";

describe("Effect Polyfills and Flow Control", () => {
  describe("from", () => {
    it.effect("lifts a sync value", () =>
      Effect.gen(function* () {
        const result = yield* from(42);
        expect(result).toBe(42);
      })
    );

    it.effect("lifts a promise", () =>
      Effect.gen(function* () {
        const result = yield* from(Promise.resolve(42));
        expect(result).toBe(42);
      })
    );

    it.effect("lifts an effect", () =>
      Effect.gen(function* () {
        const result = yield* from(Effect.succeed(42));
        expect(result).toBe(42);
      })
    );

    it.effect("lifts a sync function", () =>
      Effect.gen(function* () {
        const result = yield* from(() => 42);
        expect(result).toBe(42);
      })
    );

    it.effect("lifts an async function", () =>
      Effect.gen(function* () {
        const result = yield* from(async () => 42);
        expect(result).toBe(42);
      })
    );
  });

  describe("tryMap", () => {
    it.effect("maps value if success", () =>
      Effect.gen(function* () {
        const effect = Effect.succeed(10);
        const mapped = yield* tryMap(effect, {
          try: (n) => n * 2,
          catch: () => "error",
        });
        expect(mapped).toBe(20);
      })
    );

    it.effect("catches error if try throws", () =>
      Effect.gen(function* () {
        const effect = Effect.succeed(10);
        const mapped = yield* tryMap(effect, {
          try: () => {
            throw new Error("fail");
          },
          catch: (e) => "caught error",
        }).pipe(Effect.flip);
        expect(mapped).toBe("caught error");
      })
    );
  });

  describe("orElse", () => {
    it.effect("returns original result if success (direct)", () =>
      Effect.gen(function* () {
        const effect = Effect.succeed(1);
        const fallback = Effect.succeed(2);
        const result = yield* orElse(effect, () => fallback);
        expect(result).toBe(1);
      })
    );

    it.effect("returns original result if success (curried)", () =>
      Effect.gen(function* () {
        const effect = Effect.succeed(1);
        const fallback = Effect.succeed(2);
        const result = yield* orElse(() => fallback)(effect);
        expect(result).toBe(1);
      })
    );

    it.effect("returns fallback result if failure", () =>
      Effect.gen(function* () {
        const effect = Effect.fail("err");
        const fallback = Effect.succeed(2);
        const result = yield* orElse(effect, () => fallback);
        expect(result).toBe(2);
      })
    );
  });

  describe("zipRight", () => {
    it.effect("executes both and returns right result", () =>
      Effect.gen(function* () {
        let leftExecuted = false;
        const left = Effect.sync(() => {
          leftExecuted = true;
          return 1;
        });
        const right = Effect.succeed(2);
        const result = yield* zipRight(left, right);
        expect(leftExecuted).toBe(true);
        expect(result).toBe(2);
      })
    );

    it.effect("supports concurrent zipRight", () =>
      Effect.gen(function* () {
        let leftExecuted = false;
        const left = Effect.sync(() => {
          leftExecuted = true;
          return 1;
        });
        const right = Effect.succeed(2);
        const result = yield* zipRight(left, right, { concurrent: true });
        expect(leftExecuted).toBe(true);
        expect(result).toBe(2);
      })
    );
  });

  describe("tapBoth", () => {
    it.effect("calls onSuccess when successful", () =>
      Effect.gen(function* () {
        let tappedValue = 0;
        const effect = Effect.succeed(10);
        const result = yield* tapBoth(effect, {
          onSuccess: (v) =>
            Effect.sync(() => {
              tappedValue = v;
            }),
          onFailure: () => Effect.void,
        });
        expect(result).toBe(10);
        expect(tappedValue).toBe(10);
      })
    );

    it.effect("calls onFailure when failed", () =>
      Effect.gen(function* () {
        let tappedError = "";
        const effect = Effect.fail("err");
        const result = yield* tapBoth(effect, {
          onSuccess: () => Effect.void,
          onFailure: (e) =>
            Effect.sync(() => {
              tappedError = e;
            }),
        }).pipe(Effect.flip);
        expect(result).toBe("err");
        expect(tappedError).toBe("err");
      })
    );
  });
});
