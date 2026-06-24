# Effect Pitfalls & Conventions

## Effect.gen Conventions (beta.68+)

```typescript
// ✅ Correct: function* () without parameter
Effect.gen(function* () {
  const data = yield* someEffect
  return process(data)
})

// ❌ Wrong: beta.68+ does not support $ parameter
Effect.gen(function* ($) { /* ... */ })

// ❌ Wrong: exactOptionalPropertyTypes may conflict with satisfies
const report = { /* ... */ } satisfies Report

// ✅ Correct: use as for forced cast
const report = { /* ... */ } as Report
```

## Known Pitfalls

1. **`function* ($)` not supported** — beta.68+ `Effect.gen` uses parameterless `function* ()`
2. **`Effect.dieMessage` does not exist** — use `Effect.die(new UnimplementedError(...))` instead
3. **`satisfies` does not narrow** — use `as` for forced casts under exactOptionalPropertyTypes
4. **Ref type is `Ref.Ref<T>`** — not `Effect.Ref.Ref<T>`
5. **`Effect.service` is not `Effect.service`** — actually `Effect.service(Tag)`, no trailing `s`
6. **Smart quote issue** — Windows Edit tool may convert `"` to Chinese quotes, causing TS1127
7. **Effect.gen return type** — explicit `Effect.Effect<T, E, R>` return annotation may conflict with inference; prefer no explicit return type
8. **`getHasher()` Promise cache** — replace with `Layer.effect` + `Tag`; Promise appears only once inside Layer
9. **Legacy Effect APIs** — `Effect.zipRight`/`zipLeft` → `Effect.zipWith`; `Effect.catchAll` → `Effect.catch`; `Effect.fork` → `Effect.forkChild`; `Effect.forkDaemon` → `Effect.forkDetach`

## Context.Reference Deep Dive

### Why no `R` channel

`Context.Reference<Shape>` extends `Service<never, Shape>`. Because Identifier is `never`, the type system treats this dependency as "always satisfied" and it does not appear in `Effect.Effect<A, E, R>`.

### Applicability

| Use | Do Not Use |
|-----|-----------|
| Utility / cross-cutting services (Clock, Random, Logger) | Core service dependencies (engines, repos, API clients) |
| Reasonable defaults, 80% cases need no override | Must be explicitly provided by caller |
| Occasional test override | Different mock needed per test |

If unsure whether to use Reference, the answer is: **don't**. Default to `Tag`.
