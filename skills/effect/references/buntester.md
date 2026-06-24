# BunTester Effect Testing

BunTester is a `bun:test`-native wrapper for testing Effect code. It provides `it.effect`, `it.live`, `it.gen`, `waitFor`, and `layer` helpers that align with `@effect/vitest` but are built for Bun.

## Core Imports

```ts
import { Effect, Context, Layer, TxRef, TestClock } from "@yuyi919/tslibs-effect/effect-next";
import { describe, expect, it, layer, waitFor } from "@yuyi919/tslibs-effect/BunTester";
```

## Writing Tests

### 1. `it.effect` — Standard Effect Test (Recommended)

Provides `TestClock`, `TestConsole`, and `Scope` automatically. Use for almost all Effect tests.

```ts
describe("基础功能", () => {
  it("普通同步测试", () => {
    expect(1 + 1).toBe(2);
  });

  it.effect("测试一个 Effect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(42);
      expect(result).toBe(42);
    }),
  );

  it.effect.skip("跳过这个 Effect 测试", () => Effect.fail("不会执行到这里"));
});
```

**Time control with TestClock:**

```ts
it.effect("时间控制测试", () =>
  Effect.gen(function* () {
    let executed = false;
    const fiber = yield* Effect.sleep("10 seconds").pipe(
      Effect.tap(() => { executed = true; }),
      Effect.fork,
    );

    yield* TestClock.adjust("10 seconds");
    expect(executed).toBe(true);
  }),
);
```

### 2. `it.live` — Real-World Effect Test

No `TestClock` or `TestConsole` interception. Use for real HTTP calls, real delays, etc.

```ts
it.live("真实的延迟测试", () =>
  Effect.gen(function* () {
    const start = Date.now();
    yield* Effect.sleep("100 millis");
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  }),
);
```

### 3. `it.flakyTest` — Retry Flaky Tests

```ts
it.effect("不稳定的测试", () =>
  it.flakyTest(
    Effect.gen(function* () {
      const result = yield* unstableCall();
      expect(result).toBe("ok");
    }),
    "5 seconds", // retry within 5 seconds
  ),
);
```

### 4. `it.gen` / `it.scopedGen` — Sugar Over `it.effect` + `Effect.gen`

```ts
// Standard: it.effect + Effect.gen
it.effect("普通的写法", () =>
  Effect.gen(function* () {
    expect(yield* Effect.succeed(1)).toBe(1);
  }),
);

// Sugar: it.gen (equivalent to above)
it.gen("更清爽的写法", function* () {
  expect(yield* Effect.succeed(1)).toBe(1);
});

// Scoped sugar
it.scopedGen("带作用域的更清爽的写法", function* () {
  // ...
});
```

## Dependency Injection with Layer

Use `layer()` at the top level or `it.layer()` inside a block to inject dependencies.

```ts
class Database extends Context.Tag("Database")<
  Database,
  { query: () => Effect.Effect<string> }
>() {}

const LiveDatabase = Layer.succeed(
  Database,
  Database.of({ query: () => Effect.succeed("data") }),
);

// Top-level layer
layer(LiveDatabase)("测试数据库相关功能", (it) => {
  it.effect("执行查询", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      const result = yield* db.query();
      expect(result).toBe("data");
    }),
  );

  // Nested layers
  it.layer(SomeOtherLayer)("嵌套层", (it) => {
    // use nested (it) here, not the outer one
  });
});
```

**Important:** Inside `layer()`, always use the injected `(it)` parameter, not the imported global `it`.

## Concurrency Testing with `waitFor`

Poll STM/Ref state without busy-waiting. Uses `Effect.txRetry` under the hood.

```ts
it.gen("测试并发事务", function* () {
  const counter = yield* TxRef.make(0);

  yield* Effect.fork(
    Effect.sleep("100 millis").pipe(
      Effect.andThen(TxRef.update(counter, (n) => n + 1)),
    ),
  );

  yield* waitFor(counter, (val) => {
    if (val !== 1) throw new Error("not ready");
  });

  expect(yield* TxRef.get(counter)).toBe(1);
});
```

## Differences from @effect/vitest

If migrating from `@effect/vitest`, see [vitest-migration-guide.md](vitest-migration-guide.md) (same directory) for full details. Key changes:

| Feature | @effect/vitest | BunTester |
|---------|---------------|-----------|
| Property test cases | `it.effect.for` | `it.effect.each` |
| Expected failure | `it.fails()` | `it.fails` |
| TestContext (`ctx`) | Full object | Stub `{}` (do not rely on) |
| `addEqualityTesters` | Supported | Removed |
| `describeWrapped` | Supported | Removed; use `layer()` instead |
| `it.prop` Schema fallback | Supported | Throws `"Schemas are not supported yet"`; use `it.effect.prop` |

## Common Pitfalls

1. **Always use `it.effect` (or `it.gen`) for Effect tests.** Returning a raw Effect from `it()` will not be executed by `bun:test`.
2. **Inside `layer()`, use the injected `it` parameter.** The global `it` is not bound to the Layer context.
3. **Do not rely on TestContext injection.** Bun's `bun:test` provides limited context access; BunTester stubs it as `{}`.
4. **For property testing with Schemas, use `it.effect.prop`.** The global `it.prop` fallback does not support Schema-to-Arbitrary conversion yet.
