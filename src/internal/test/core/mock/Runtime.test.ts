import { describe, expect } from "bun:test";
import { Cause, Effect, Exit, Fiber } from "effect";
import { it } from "../../../../BunTester";
import * as Context from "../../../../core/context";
import {
  runCallback,
  runFork,
  runPromise,
  runPromiseExit,
  runSync,
  runSyncExit,
} from "../../../../core/mock/Runtime";

describe("Runtime Polyfills", () => {
  interface Config {
    value: number;
  }
  const Config = Context.GenericTag<Config>("Config");
  const ctx = Context.make(Config, { value: 42 });

  describe("runPromise", () => {
    it("executes effect and returns promise (direct call)", async () => {
      const effect = Effect.map(
        Effect.context<never>(),
        (c) => Context.get(c as any, Config).value * 2
      );
      const result = await runPromise(ctx, effect);
      expect(result).toBe(84);
    });

    it("executes effect and returns promise (curried)", async () => {
      const effect = Effect.map(
        Effect.context<never>(),
        (c) => Context.get(c as any, Config).value * 2
      );
      const result = await runPromise(ctx)(effect);
      expect(result).toBe(84);
    });
  });

  describe("runPromiseExit", () => {
    it("returns Exit.Success for successful effect", async () => {
      const effect = Effect.succeed(10);
      const exit = await runPromiseExit(ctx, effect);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe(10);
      }
    });

    it("returns Exit.Failure for failed effect", async () => {
      const effect = Effect.fail("error");
      const exit = await runPromiseExit(ctx)(effect);
      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe("runSync", () => {
    it("executes synchronous effect (direct call)", () => {
      const effect = Effect.map(
        Effect.context<never>(),
        (c) => Context.get(c as any, Config).value
      );
      const result = runSync(ctx, effect);
      expect(result).toBe(42);
    });

    it("executes synchronous effect (curried)", () => {
      const effect = Effect.map(
        Effect.context<never>(),
        (c) => Context.get(c as any, Config).value
      );
      const result = runSync(ctx)(effect);
      expect(result).toBe(42);
    });

    it("throws error for async boundaries", () => {
      const effect = Effect.promise(() => Promise.resolve(1));
      expect(() => runSync(ctx, effect)).toThrow();
    });
  });

  describe("runSyncExit", () => {
    it("returns Exit.Success", () => {
      const effect = Effect.succeed(1);
      const exit = runSyncExit(ctx, effect);
      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it("returns Exit.Failure on fail", () => {
      const effect = Effect.fail("err");
      const exit = runSyncExit(ctx)(effect);
      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe("runFork", () => {
    it("returns a fiber (direct call)", async () => {
      const effect = Effect.succeed(10);
      const fiber = runFork(ctx, effect);
      const result = await Fiber.join(fiber).pipe(Effect.runPromise);
      expect(result).toBe(10);
    });

    it("returns a fiber (curried)", async () => {
      const effect = Effect.succeed(10);
      const fiber = runFork(ctx)(effect);
      const result = await Fiber.join(fiber).pipe(Effect.runPromise);
      expect(result).toBe(10);
    });
  });

  describe("runCallback", () => {
    it("calls callback with Exit (direct)", () => {
      return new Promise<void>((resolve) => {
        const effect = Effect.succeed(5);
        const cancel = runCallback(ctx, effect, {
          onExit: (exit) => {
            expect(Exit.isSuccess(exit)).toBe(true);
            resolve();
          },
        });
      });
    });

    it("calls callback with Exit (curried)", () => {
      return new Promise<void>((resolve) => {
        const effect = Effect.fail("err");
        runCallback(ctx)(effect, {
          onExit: (exit) => {
            expect(Exit.isFailure(exit)).toBe(true);
            resolve();
          },
        });
      });
    });
  });
});
