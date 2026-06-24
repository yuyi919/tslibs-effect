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

When `concurrency` is `undefined` or `<= 1`, it is treated as sequential:

```typescript
const concurrencyIsSequential = (
  concurrency: number | "unbounded" | undefined
) => concurrency === undefined || (concurrency !== "unbounded" && concurrency <= 1)
```

`zipWith` and related functions explicitly use `concurrent: true` internally, which calls `all` with `{ concurrency: 2 }`:

```typescript
// From internal implementation
options?.concurrent
  ? map(all([self, that], { concurrency: 2 }), ([a, a2]) => internalCall(() => f(a, a2)))
```

## Notes

- `concurrency` accepts `number | "unbounded" | undefined`
- Default is `undefined` → sequential
- `concurrency: "unbounded"` → unlimited parallelism
- `concurrency: n` (n > 1) → at most n effects run concurrently

## Source

From `.agents/references/effect-smol/packages/effect/src/Effect.ts` (L464-469, L581-593) and `.agents/references/effect-smol/packages/effect/src/internal/effect.ts` (L2189-2191).