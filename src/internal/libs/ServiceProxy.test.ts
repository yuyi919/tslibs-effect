import { describe, vi } from "bun:test";
import * as Path from "effect/Path";
import { expect, it } from "../../BunTester.js";
import { Console, Effect, GlobalScope, Layer } from "../../effect-next.js";
import {
  makeServiceProxy,
  makeServiceProxyPromise,
  proxyWithDefaultLayer,
} from "./ServiceProxy.js";

it.layer([GlobalScope.Default()])("proxyWithDefaultLayer", (it) => {
  it.effect("正常工作", () =>
    Effect.gen(function* () {
      const proxy = proxyWithDefaultLayer(Path.Path, Path.layer);
      expect(yield* proxy.join("a", "b")).toBe("a/b");
    })
  );
  const callCreate = vi.fn(Console.log);
  const testLayer = Layer.unwrap(
    Effect.suspend(() => callCreate("Path.layer")).pipe(
      Effect.zipRight(Effect.succeed(Path.layer))
    )
  );
  it.effect("只创建了一次", () =>
    Effect.gen(function* () {
      const proxy = proxyWithDefaultLayer(Path.Path, testLayer);
      yield* proxy.join("a", "b");
      yield* proxy.join("a", "b");
      yield* proxy.normalize("a\\b");
      expect(callCreate).toBeCalledTimes(1);
    }).pipe(Effect.provide(Layer.mergeAll(testLayer)))
  );
});

describe("makeServiceProxy", () => {
  it.effect("正常工作", () =>
    Effect.gen(function* () {
      // makeServiceProxyPromise(Path.Path).fromFileUrl;
      const proxy = makeServiceProxy(Path.Path);
      expect(yield* proxy.join("a", "b")).toBe("a/b");
    }).pipe(Effect.provide(Path.layer))
  );

  const msg = "Service not found: effect/Path";
  it("抛出：" + msg, async () => {
    const catchDefect = vi.fn(Console.log);
    await (
      Effect.gen(function* () {
        const proxy = makeServiceProxy(Path.Path);
        yield* proxy.join("a", "b");
        yield* proxy.join("a", "b");
      }) as Effect.Effect<void, never, never>
    ).pipe(
      Effect.catchDefect(() => Effect.sync(() => catchDefect(msg))),
      Effect.runPromise
    );
    expect(catchDefect).toBeCalledTimes(1);
    expect(catchDefect).toBeCalledWith(msg);
  });
});

describe("makeServiceProxyPromise", () => {
  const factory = makeServiceProxyPromise(Path.Path, {
    join: true,
    sep: true,
    basename: true,
    dirname: true,
    extname: true,
    format: true,
    fromFileUrl: true,
    isAbsolute: true,
    normalize: true,
    parse: true,
    relative: true,
    resolve: true,
    toFileUrl: true,
    toNamespacedPath: true,
  });
  it("正常工作", async () => {
    const path = await factory.pipe(Effect.provide(Path.layer), (_) =>
      Effect.runPromise(_)
    );
    expect(await path.dirname("a/b/c")).toBe("a/b");
  });

  const msg = "Service not found: effect/Path";
  it("抛出：" + msg, async () => {
    const catchDefect = vi.fn(Console.log);
    await (
      Effect.gen(function* () {
        const proxy = yield* factory;
        yield* Effect.promise(() => proxy.join("a", "b"));
      }) as Effect.Effect<void, never, never>
    ).pipe(
      Effect.catchDefect(() => Effect.sync(() => catchDefect(msg))),
      Effect.runPromise
    );
    expect(catchDefect).toBeCalledTimes(1);
    expect(catchDefect).toBeCalledWith(msg);
  });
});
