# Effect Patterns

## Surface Pipeline Pattern

Convert engine internal state to public view types through a unified pipeline:

```
filter → sort → limit → map
```

```typescript
function surfaceXxx(state: XxxState, limit = 20): SurfacedXxx[] {
  return Object.values(state.items)
    .filter(item => item.state === XxxState.Stable)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(toSurfaced)
}
```

## Promise Cache → Layer Replacement (Minimal Promise Pattern)

### Problem

Projects often have `function getHasher(): Promise<...>` lazy-load cache patterns using module-level `let`:

```typescript
// ❌ Anti-pattern: Promise cache module loading
let _hasher: Promise<Hasher> | null = null
export function getHasher(): Promise<{ h64: (input: string) => bigint }> {
  if (!_hasher) _hasher = createHasher()
  return _hasher
}
// Caller must await, escaping Effect pipeline
```

Issues:
- Implicit global state, cannot be replaced in tests
- Promise cache lifecycle uncontrolled (no teardown)
- Breaks Effect pipeline — caller must use `await`

### Solution

```typescript
// ✅ Layer replacement: Effect-native cacheable initialization
export class Hasher extends Tag("@namespace.Hasher")<Hasher, {
  h64: (input: string) => Effect.Effect<bigint>
  unsafeH64: (input: string) => bigint
}>() {}

export const HasherLive = Layer.effect(
  Hasher,
  Effect.gen(function* () {
    const _ = yield* Effect.promise(() => createHasher())
    return Hasher.of({
      h64: (input) => Effect.sync(() => _.h64(input)),
      unsafeH64: (input) => _.h64(input),
    })
  })
)
// Caller: yield* Hasher; yield* hasher.h64("input")
```

Rules:
- **Encapsulate `Promise` only once inside `Layer.effect`**, all other code goes through `Tag` + `yield*`
- `Layer` caches natively: same `Layer` initializes only once per `Runtime`
- In tests, replace directly with `Layer.succeed(Hasher, mock)`, no module-level variable hacks
- If `Promise` returns functions with sync paths, wrap with `Effect.sync(() => raw.fn(input))` to avoid `Effect.promise` microtask overhead
