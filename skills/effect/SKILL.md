---
name: effect
description: >
  (Most important) Write Effect v4 / effect-smol TypeScript code in this repo.
  Covers contract interface pattern, Layer composition, Context.Reference, tagged errors,
  testing mocks, Effect.gen conventions, serviceOption, and known pitfalls.
  Use when writing any Effect service, handler, schema, layer, or test in this project.
  Also covers: BunTester testing (Bun + bun:test), Promise to Effect migration,
  async code migration to Effect.
  Trigger: Effect, Layer, Tag, Context, TaggedError, Effect.gen, service mock, contract interface,
  Context.Reference, Promise cache, Ref, Effect.all, fail vs die, surface pipeline,
  BunTester, effect test, bun:test, it.effect, Promise to Effect, migrate async to Effect.
---

# Effect

This codebase uses Effect v4 / effect-smol for typed, composable TypeScript services, schemas, and workflows.

## Source Of Truth

Use the current Effect v4 / effect-smol source, not memory or older Effect v2/v3 examples.

1. If `.agents/references/effect-smol` is missing, clone `https://github.com/Effect-TS/effect-smol` there. Do this in the project, not in the skill folder.
2. Search `.agents/references/effect-smol` for exact APIs, examples, tests, and naming patterns before answering or implementing Effect-specific code.
3. Also inspect existing repo code for local house style before introducing new patterns.
4. Prefer answers and implementations backed by specific source files or nearby repo examples.

## Core Guidelines

- Prefer current Effect v4 APIs and project-local patterns over old blog posts, examples, or package-memory guesses.
- Use `Effect.gen(function* () { ... })` for multi-step workflows.
- Use `Effect.fn("Name")` or `Effect.fnUntraced(...)` for named effects when adding reusable service methods or important workflows.
- Prefer Effect `Schema` for API and domain data shapes. Use branded schemas for IDs and `Schema.TaggedErrorClass` for typed domain errors when modeling new error surfaces.
- Keep HTTP handlers thin: decode input, read request context, call services, and map transport errors. Put business rules in services.
- In Effect service code, prefer Effect-aware platform abstractions and dependencies over ad hoc promises where the surrounding code already does so.
- Keep layer composition explicit. Avoid broad hidden provisioning that makes missing dependencies hard to see.
- Do not introduce `any`, non-null assertions, unchecked casts, or older Effect APIs just to satisfy types.
- Do not answer from memory. Verify against `.agents/references/effect-smol` or nearby code first.

## Architecture Patterns

For deep explanations of `Context.Reference` internals, the Promise cache → Layer migration pattern, and the Surface Pipeline pattern, see [references/patterns.md](references/patterns.md).
For `Effect.gen` conventions and all known pitfalls, see [references/pitfalls.md](references/pitfalls.md).

### Contract Interface Triple Pattern

All engine services follow the same structure: contract defines interface → engine implements → Live Layer assembles.

**Contract side:**

```typescript
// packages/contract/src/Xxx.ts
import { Tag } from "./Context"
import type { Effect } from "effect"

export namespace Xxx {
  export interface Interface {
    /** Method docs — bilingual, visible to callers via LSP */
    method: (param: Type) => Effect.Effect<ReturnType, ErrorType, Requirements>
  }
}

export class Xxx extends Tag("@namespace.contract.Xxx")<
  Xxx, Xxx.Interface
>() {}
```

Rules:
- Use `namespace.Interface` + `Tag`, do not use deprecated `export type XxxImpl`
- Tag key uses `"@namespace.contract.Xxx"` namespace
- JSDoc lives on contract side (not implementation side), bilingual
- Method signatures use `readonly` arrow properties

**Engine side:**

```typescript
// packages/xxx/src/Xxx.ts
export class XxxImpl implements Xxx.Interface {
  private state: XxxState = { /* ... */ }

  method(param: Type): Effect.Effect<ReturnType, ErrorType, Requirements> {
    const self = this
    return Effect.gen(function* () {
      // ...
    })
  }
}
```

Rules:
- Explicit `implements Xxx.Interface`
- Inside `Effect.gen`, use `const self = this` to capture reference (generator `this` does not point to instance)
- Implementation side only keeps `SIMPLE IMPLEMENTATION` / `NON-PARITY` / `UNIMPLEMENTED` / `TODO` markers, no duplicate JSDoc

### Layer Composition

| Scenario | Solution |
|----------|----------|
| Service has no initialization side effects | `Layer.succeed(Xxx, Xxx.of({...}))` |
| Service needs Ref.make / async initialization | `Layer.effect(Xxx, Effect.gen(function* () { ... }))` |
| Merge multiple Layers | `Layer.mergeAll(LayerA, LayerB, LayerC)` |

```typescript
// Layer.effect example — when Ref initialization is needed
export const EpistemicRuntimeLive = Layer.effect(
  EpistemicRuntime,
  Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    return new EpistemicRuntimeImpl(counter)
  })
)
```

### Context.Reference Pattern (Services with Defaults)

`Context.Reference` creates a service Tag with built-in defaults, so it does not appear in the `R` requirement channel, while still allowing DI override.

```typescript
import { Context } from "effect"

export class Clock extends Context.Reference<{
  nowSeconds: () => number
}>("@namespace.contract.Clock", {
  defaultValue() {
    return { nowSeconds: nowSecs }  // production default
  },
}) {
  static nowSeconds = () => Clock.useSync((_) => _.nowSeconds())
  static fixed = (nowUnixSec: number) => ({ nowSeconds: () => nowUnixSec })
}
```

Rules:
- Only use `Context.Reference` for utility / cross-cutting services with reasonable defaults (Clock, Random, Logger)
- **Never** use for core service dependencies (engines, repos, API clients) — they must use standard `Tag` + `Layer`, declared explicitly in `R`
- If unsure whether to use Reference, the answer is: **don't**. Default to `Tag`

### Optional Service Injection (serviceOption)

```typescript
// Import from packages/contract/src/Optional.ts
const traceOpt = yield* serviceOption(EpistemicTrace)
if (Option.isSome(traceOpt)) {
  yield* traceOpt.value.event("start", {})
}
// If not provided, silently skips, no error
```

Rules:
- Use `serviceOption` for cross-cutting concerns (trace, rerank, finalize)
- Use `Effect.service()` for core dependencies that must be provided

### Promise Cache → Layer Replacement

Replace `let _cache: Promise<T> | null` module-level patterns with `Layer.effect` + `Tag`. `Promise` appears only once inside `Layer`, everything else goes through `Tag` + `yield*`. For full migration example and rules, see [references/patterns.md](references/patterns.md).

## Error Handling

For `Effect.gen` conventions and full known pitfalls list, see [references/pitfalls.md](references/pitfalls.md).

### TaggedError Definition

```typescript
import { Data } from "effect"

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string
  readonly cause: unknown
}>() {}

export class UnimplementedError extends Data.TaggedError("UnimplementedError")<{
  readonly feature: string
}>() {}
```

### fail vs die Boundary

```typescript
// Recoverable business error → fail (type-safe, in E channel)
Effect.fail(new FileReadError({ path, cause: err }))

// Unrecoverable defect → die (not in E channel)
Effect.die(new UnimplementedError({ feature: "NGramIndex" }))

// External exception to TaggedError
Effect.try({
  try: () => JSON.parse(raw),
  catch: (cause) => new JsonParseError({ path, cause })
})
```

Rules:
- All recoverable errors use `Data.TaggedError` subclasses
- Do not use `UnimplementedError` on main write/recall paths — prioritize getting it working
- `UnimplementedError` is acceptable for non-main flow placeholders

### Precise Error Catching

```typescript
effect.pipe(
  Effect.catchTag("FileReadError", (err) => Effect.succeed(defaultValue)),
  Effect.catchTag("JsonParseError", (err) => Effect.fail(new DomainError({ ... })))
)
```

## Ref Usage

```typescript
import { Ref } from "effect"

const counter = yield* Ref.make(0)
const value = yield* Ref.get(counter)
yield* Ref.update(counter, (n) => n + 1)

// Type annotation
const ref: Ref.Ref<number> = yield* Ref.make(0)
// ❌ Not Effect.Ref.Ref<number> — does not exist in beta.68+
```

## Effect.all Concurrency

```typescript
// Parallel execution (equivalent to Rust rayon::join)
yield* Effect.all(
  { concept: conceptEngine.discover(records), causal: causalEngine.discover(records) },
  { concurrency: 2 }
)
```

## Test Mock Pattern

```typescript
function mockBeliefEngine(opts: MockOptions = {}): BeliefEngine.Interface {
  const state = { version: 1 as const, beliefs: opts.beliefs ?? {}, /* ... */ } as BeliefEngineState
  return {
    update: () => Effect.succeed(emptyReport),
    stats: () => Effect.succeed(state),
    belief_for_record: (id: string) => Effect.succeed(opts.recordToBelief?.[id] ?? null),
    // Unneeded methods → Effect.void
    deprecate_belief: () => Effect.void,
  }
}

// Inject
const layer = Layer.succeed(BeliefEngine, mockBeliefEngine({ /* ... */ }))
program.pipe(Effect.provide(layer))
```

Rules:
- Mock return type declared as `Xxx.Interface`, not `XxxImpl`
- Default behavior uses `Effect.succeed()` / `Effect.void`
- Use `as` for forced casts (mock does not need to fully match type shape)

## Testing Patterns

- Use `it.effect(...)` or `it.layer(_ => _.effect(...))` for tests that exercise Effect services, layers, runtime context, scoped resources, or platform integrations.
- Use `it.live(...)` for filesystem, git repositories, HTTP servers, sockets, child processes, locks, real time, and other live platform behavior.
- Prefer explicit test layers over ad hoc managed runtimes. Keep dependency provisioning visible in the test file.
- Use scoped fixtures and finalizers for resources that must be cleaned up, including temporary directories, flags, databases, fibers, servers, and global state.

For detailed BunTester usage and migration from `@effect/vitest`, see [references/buntester.md](references/buntester.md).

For migrating Promise/async code to Effect, see [references/promise-to-effect.md](references/promise-to-effect.md).
