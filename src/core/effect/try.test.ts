import assert from "node:assert";
import { UnknownError } from "effect/Cause";
import { expect, it } from "@/BunTester.js";
import * as Effect from "@/Effect.js";

it.gen("tryEvaluate(Promise.reject)", function* () {
  const effect = Effect.tryEvaluate(() => Promise.reject("test"));
  const result = yield* effect.toUnion();
  expect(result.cause).toBe("test");
  expect(result.message).toBe("An unknown error occurred in *tryEvaluate*");
  expect(result).toMatchInlineSnapshot(
    `[UnknownError: An unknown error occurred in *tryEvaluate*]`
  );
});

it.gen("tryEvaluate(Promise.resolve(Error))", function* () {
  const err = new Error("test");
  const effect = Effect.tryEvaluate(() => Promise.resolve(err));
  const result = yield* effect.toUnion();
  expect(result).toBe(err);
});

it.gen("tryEvaluate(throw Error)", function* () {
  const err = new Error("test");
  const effect = Effect.tryEvaluate(() => {
    throw err;
  });
  const result = yield* effect.toUnion();
  assert(result instanceof UnknownError);
  expect(result.cause).toEqual(err);
});

it.gen("tryEvaluate(async throw Error)", function* () {
  const err = new Error("test");
  const effect = Effect.tryEvaluate(async () => {
    throw err;
  });
  const result = yield* effect.toUnion();
  assert(result instanceof UnknownError);
  expect(result.cause).toEqual(err);
});

it.gen("tryEvaluate(async succeed)", function* () {
  const effect = Effect.tryEvaluate(async () => {
    return "test";
  });
  const result = yield* effect;
  assert(result === "test");
});

it.gen("tryEvaluate(Effect.die)", function* () {
  const effect = Effect.tryEvaluate(() => Effect.die("test"));
  const result = yield* effect.catchDefect().toUnion();
  assert(result instanceof UnknownError);
  expect(result.cause).toEqual("test");
  const result2 = yield* effect
    .catchDefect((test) => Effect.succeed(test))
    .as<string>()
    .toUnion()
    .map((test) => test.toUpperCase());
  expect(result2).toEqual("TEST");
});
