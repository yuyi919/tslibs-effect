# Promise to Effect Migration Guide

This guide provides established conventions and layered patterns for migrating from TypeScript `Promise` and `async` patterns to Effect-TS.

> **Related Q&A references:**
> - [effect-all.md](effect-all.md) — `Effect.all` concurrency semantics
> - [xxx-eager.md](xxx-eager.md) — `Effect.fnUntracedEager` and Eager variants
> - [error-logging.md](error-logging.md) — Error logging in practice

## 1. Core Mapping

| Promise Concept | Effect Equivalent |
|-----------------|-------------------|
| `Promise<A>` | `Effect<A, E, R>` where `E` is TaggedError and `R` is a Service dependency |
| `async function` | `Effect.fn` or `Effect.gen` |
| `await` | `yield*` (inside `Effect.gen`) or `flatMap` |
| `try/catch` | `Effect.catchTag`, `Effect.catchAll`, `Effect.either` |
| `Promise.all` | `Effect.all` (sequential by default; add `concurrency` for parallelism) |
| `Promise.allSettled` | `Effect.all(..., { mode: "result" })` |
| `Promise.race` | `Effect.race`, `Effect.raceAll` |
| `.then()` | `Effect.flatMap` or `Effect.map` |
| `.catch()` | `Effect.catchAll`, `Effect.catchTag` |
| `.finally()` | `Effect.ensuring` |
| `new Promise(...)` | `Effect.callback` / `Effect.tryPromise` |
| `setTimeout` | `Effect.sleep` |
| `AbortController` | `Effect.interruptible`, `Fiber` |
| Error type definitions | `Schema.TaggedErrorClass` (recommended) or `Data.TaggedError` |
| Service key | `Context.Service` (`Context.Tag` removed) |
| Synchronous, no DI | `Effect.sync(fn)` / `Effect.succeed(value)` |

## 2. Layered Conventions

Migrated code follows three layers: **Service Definition → Service Implementation → Program Composition**. Do not mix business logic, side effects, and dependencies.

### 2.1 Service Definition (Shape & Tag)

```typescript
import { Context, Schema, Data, Effect, Layer } from "effect"

declare namespace FileSystem {
  export interface Interface {
    readonly readFile: (path: string) => Effect.Effect<string, FileError, never>
    readonly writeFile: (path: string, content: string) => Effect.Effect<void, FileError, never>
  }
}

class FileSystem extends Context.Service<
  FileSystem,
  FileSystem.Interface
>()("FileSystem") {}

class FileError extends Schema.TaggedErrorClass<FileError>()("FileError", {
  message: Schema.String,
  cause: Schema.Defect()
}) {}
```

### 2.2 Service Implementation (Layer)

```typescript
const readFileEffect = (path: string): Effect.Effect<string, FileError, never> =>
  Effect.tryPromise({
    try: () => fs.promises.readFile(path, "utf-8"),
    catch: (err) => new FileError({ message: `Failed to read ${path}`, cause: err })
  })

const writeFileEffect = (path: string, content: string): Effect.Effect<void, FileError, never> =>
  Effect.tryPromise({
    try: () => fs.promises.writeFile(path, content),
    catch: (err) => new FileError({ message: `Failed to write ${path}`, cause: err })
  })

const FileSystemLive = Layer.succeed(FileSystem, {
  readFile: readFileEffect,
  writeFile: writeFileEffect
})
```

### 2.3 Program Composition

```typescript
const program = Effect.gen(function* () {
  const fs = yield* FileSystem
  const content = yield* fs.readFile("./input.txt")
  const processed = content.toUpperCase()
  yield* fs.writeFile("./output.txt", processed)
  return processed
}).pipe(
  Effect.catchTag("FileError", (e) =>
    Effect.logError(`File operation failed: ${e.message}`).pipe(
      Effect.flatMap(() => Effect.succeed("fallback"))
    )
  )
)

const runnable = program.pipe(Effect.provide(FileSystemLive))
Effect.runPromise(runnable)
```

## 3. Migration Steps (Promise → Effect)

Follow this order strictly. Do not skip steps.

1. **Identify side effects**: Extract all `fetch`, `fs`, `db` I/O calls.
2. **Define ServiceKey and Interface**: Create `Context.Service` for each category.
3. **Define error types**: Create tagged errors (`Schema.TaggedErrorClass`) for fallible operations.
4. **Implement service functions**: Wrap Promise with `Effect.tryPromise` or `Effect.callback`.
5. **Write business logic**: Use services in `Effect.gen` via `yield*`.
6. **Error handling**: Handle defined errors with `catchTag`/`catchAll`.
7. **Provide dependencies**: Compose via `Layer` and `provide`.
8. **Execute**: Call `Effect.runPromise` or `Effect.runFork` only at application boundaries.

For detailed `Effect.all` concurrency semantics, see [effect-all.md](effect-all.md).

## 4. Promise/async to Effect Function Comparison

| Strategy | When to Use | Notes |
|----------|-------------|-------|
| `Effect.gen` | Complex multi-await `async` migration | Most readable, closest to async/await. **Do not annotate return type as `Effect.Effect<A,E,R>`; let inference handle it.** |
| `Effect.fn` | Application entry points, request handlers | Adds execution traces. Overhead for simple wrappers. |
| `Effect.fnUntraced` | Internal utilities, high-frequency helpers | Default for simple Promise wrappers. No traces. |
| `Effect.fnUntracedEager` | Need eager/synchronous start | Executes immediately until first async Effect. |

**Pitfalls**: `Effect.fnEager` and `Effect.genEager` do not exist. `Effect.promise`/`Effect.tryPromise` return an Effect directly, not a function definition. For details on `Eager` variants and their performance optimization for resolved effects, see [xxx-eager.md](xxx-eager.md).

## 5. Common Promise Pattern Translations

### Sequential Execution

```typescript
// Promise
async function fetchAndProcess(url: string) {
  const res = await fetch(url)
  const data = await res.json()
  return process(data)
}

// Effect
const fetchAndProcess = (url: string) =>
  Effect.gen(function* () {
    const res = yield* fetchEffect(url)
    const data = yield* jsonEffect(res)
    return process(data)
  })
```

### Parallel Execution

```typescript
// Promise.all
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)])

// Effect.all
const [user, posts] = yield* Effect.all(
  [fetchUser(id), fetchPosts(id)],
  { concurrency: "unbounded" }
)
```

### Timeout

```typescript
// Effect
const result = yield* fetchData().pipe(Effect.timeout("5 seconds"))
```

### Retry

```typescript
const fetchWithRetry = (url: string) =>
  fetchEffect(url).pipe(Effect.retry({ times: 3 }))
```

### Resource Cleanup

```typescript
const withDb = <A, E, R>(
  connectionString: string,
  use: (db: DB) => Effect.Effect<A, E, R>
) => Effect.acquireUseRelease(
  openDbEffect(connectionString),
  use,
  (db) => db.closeEffect()
)
```

## 6. Type & Dependency Rules

- Explicitly declare error channel types. Do not use `never` to hide real errors unless the Effect truly never fails.
- Do not reference global `fetch`, `process.env`, etc. inside service implementations. Inject via `ServiceKey`.
- Configuration (API URL, timeouts) should be injected via `Config` module or dedicated `ServiceKey`.

## 7. Execution Boundary

Application entry should have a single `runPromise` or `runFork`, typically in `main.ts`. Do not call `runPromise` inside library code.

## 8. Checklist

- [ ] All async operations converted to Effect
- [ ] Error types defined and properly caught
- [ ] Dependencies injected via ServiceKey/Layer, not direct imports of side-effect modules
- [ ] Functions converted to Effect, dependencies extracted to service layer
- [ ] No `any` or `unknown` left in error channels
- [ ] Resource management uses `acquireUseRelease` or `Scope`
- [ ] Concurrency uses `Effect.all`, not `Promise.all` wrapped around Effect
