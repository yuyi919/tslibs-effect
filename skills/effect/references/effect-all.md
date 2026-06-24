# Effect.all Concurrency Behavior

`Effect.all` defaults to **sequential** execution, not concurrent.

## Default Behavior

When `concurrency` is not provided, `Effect.all` executes each effect sequentially:

```typescript
// Default sequential execution
Effect.all([effect1, effect2, effect3])
```

## Enable Concurrency

Explicitly specify `concurrency` to enable parallel execution:

```typescript
// Concurrent execution (unbounded)
Effect.all([effect1, effect2, effect3], { concurrency: "unbounded" })

// Limit concurrency to 2
Effect.all([effect1, effect2, effect3], { concurrency: 2 })
```

## Internal Logic

In the effect-smol source, `concurrencyIsSequential` is used to determine sequential vs concurrent execution (from `.agents/references/effect-smol/packages/effect/src/Channel.ts` L1843-1845):

```typescript
const concurrencyIsSequential = (
  concurrency: number | "unbounded" | undefined
) => concurrency === undefined || (concurrency !== "unbounded" && concurrency <= 1)
```

`zipWith` and related functions explicitly use `concurrent: true` internally, which calls `all` with `{ concurrency: 2 }` (from `.agents/references/effect-smol/packages/effect/src/internal/effect.ts` L2159-2165):

```typescript
// From zipWith internal implementation
options?: { readonly concurrent?: boolean | undefined }
// ...
options?.concurrent
  ? map(all([self, that], { concurrency: 2 }), ([a, a2]) => internalCall(() => f(a, a2)))
  : map(...)
```

## Notes

- `concurrency` accepts `number | "unbounded" | undefined`
- Default is `undefined` → sequential
- `concurrency: "unbounded"` → unlimited parallelism
- `concurrency: n` (n > 1) → at most n effects run concurrently

## Source

From `.agents/references/effect-smol/packages/effect/src/Effect.ts` (L512-526) and `.agents/references/effect-smol/packages/effect/src/Channel.ts` (L1843-1845) and `.agents/references/effect-smol/packages/effect/src/internal/effect.ts` (L2159-2165).

**`Effect.ts` L512-514 (JSDoc):**
```typescript
 * Use `concurrency` to control sequential or concurrent execution. Use
 * `mode: "result"` to run every effect and collect each success or failure as a
 * `Result` in the same output shape. Use `discard: true` to ignore successful
```

**`Effect.ts` L514-526 (Function signature):**
```typescript
export const all: <
  const Arg extends
    | Iterable<Effect<any, any, any>>
    | Record<string, Effect<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly discard?: boolean | undefined
    readonly mode?: "default" | "result" | undefined
  }
>(
  arg: Arg,
  options?: O
) => All.Return<Arg, O> = internal.all
```

**`Channel.ts` L1843-1845:**
```typescript
const concurrencyIsSequential = (
  concurrency: number | "unbounded" | undefined
) => concurrency === undefined || (concurrency !== "unbounded" && concurrency <= 1)
```

**`internal/effect.ts` L2159-2165:**
```typescript
    options?.concurrent
      // Use `all` exclusively for concurrent cases, as it introduces additional overhead due to the management of concurrency
      ? map(all([self, that], { concurrency: 2 }), ([a, a2]) => internalCall(() => f(a, a2)))
```