# Migrating from @effect/vitest to BunTester

This guide covers the full migration path from `@effect/vitest` to `BunTester`.

## Import Changes

```typescript
// Before (@effect/vitest)
import { it, describe, expect, layer } from "@effect/vitest";

// After (BunTester)
import { it, describe, expect, layer, waitFor } from "@yuyi919/tslibs-effect/BunTester";
```

## 1. TestContext (`ctx`) Is a Stub

Vitest provides a rich `TestContext` (`ctx`) object. BunTester stubs it as `{}` because `bun:test` has limited context support.

**Do not write:**

```ts
// ❌ Vitest pattern — does NOT work in BunTester
it.effect("context test", (ctx) =>
  Effect.gen(function* () {
    ctx.skip(); // FAILS: ctx is {}
  }),
);
```

**Instead:** Use `it.effect.skip` directly, or control flow with `Effect` combinators.

## 2. `addEqualityTesters` Removed

Bun's `expect` does not support dynamic equality testers. If you customized `expect` comparisons for custom types, you must inline the comparison logic.

**Do not write:**

```ts
// ❌ Removed in BunTester
import { addEqualityTesters } from "@effect/vitest";
addEqualityTesters(MyCustomEquality);
```

**Instead:** Use explicit comparisons in assertions:

```ts
it.gen("custom compare", function* () {
  const a = yield* makeCustom();
  const b = yield* makeCustom();
  expect(a.equals(b)).toBe(true); // or custom comparator
});
```

## 3. `describeWrapped` Removed

Use `layer()` (top-level) or `it.layer()` (nested) to compose test contexts.

**Do not write:**

```ts
// ❌ Removed in BunTester
import { describeWrapped } from "@effect/vitest";
describeWrapped(LayerA, LayerB)("suite", () => { ... });
```

**Instead:**

```ts
// ✅ BunTester pattern
import { layer } from "@yuyi919/tslibs-effect/BunTester";

layer(LayerA.pipe(Layer.provide(LayerB)))("suite", (it) => {
  it.effect("test", () => Effect.succeed(true));
});
```

## 4. Assertion Modifier Renames

| Vitest | BunTester |
|--------|-----------|
| `it.effect.for(cases)` | `it.effect.each(cases)` |
| `it.fails()` | `it.fails` |

```ts
// ❌ Vitest
it.effect.for([1, 2, 3])("测试", (n) => ...);

// ✅ BunTester
it.effect.each([1, 2, 3])("测试", (n) => ...);
```

## 5. Property Testing (`it.prop`) Schema Limitation

The global `it.prop` fallback throws `"Schemas are not supported yet"`. Use the Effect-bound variant which supports Schema-to-Arbitrary conversion.

```ts
// ❌ Global fallback — throws
it.prop("property test", Schema.Number, (n) => ...);

// ✅ Effect-bound — works with Schema
it.effect.prop("property test", Schema.Number, (n) => ...);
```

## 6. `it.gen` and `it.scopedGen` Migration

If you previously wrote verbose `it.effect(() => Effect.gen(function* () { ... }))`, you can simplify:

```ts
// Before
it.effect("old style", () =>
  Effect.gen(function* () {
    expect(yield* Effect.succeed(1)).toBe(1);
  }),
);

// After
it.gen("new style", function* () {
  expect(yield* Effect.succeed(1)).toBe(1);
});
```
