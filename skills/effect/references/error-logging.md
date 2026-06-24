# Error Logging in Practice

## Pattern 1: `Effect.catch` + `Effect.logError`

The standard pattern recommended in LLMS.md for handling known tagged errors:

```typescript
Effect.catch((error) => Effect.logError(`An error occurred: ${error}`))
```

## Pattern 2: `Effect.catchCause(Effect.logError)`

The idiomatic pattern used extensively inside the Effect source — pass the full `Cause` directly to `Effect.logError`. The logger internally calls `causePretty(cause)` to render the complete stack trace, nested cause chain, etc.:

```typescript
Effect.catchCause(Effect.logError)
```

From `.agents/references/effect-smol/packages/effect/src/unstable/rpc/RpcClient.ts` (L791-793):
```typescript
  }).pipe(
    Effect.catchCause(Effect.logError),
    Effect.interruptible,
  )
```

## Comparison

| | `Effect.catch` | `Effect.catchCause` |
|---|---|---|
| Receives | tagged error `E` | full `Cause<E>` (includes defect, interrupt) |
| Use case | Known business errors | Any failure, including defects |
| Rendering | Manual `${error}` | Logger auto `causePretty` |

## Logger Internal Rendering

The logger's `Options` includes a dedicated `cause` field. All built-in formatters (`formatSimple`, `formatStructured`, `consolePretty`, etc.) automatically render it as `causePretty(cause)`:

```
ErrorName: message
    at ...
    at ... {
  [cause]: NestedError: message
      at ...
}
```

Source: `.agents/references/effect-smol/packages/effect/src/Logger.ts` (L415-417) and `.agents/references/effect-smol/packages/effect/src/internal/effect.ts` (L460-477).

## Summary

- Tagged error → `Effect.catch((e) => Effect.logError("msg", e))`
- Any failure (including defects) → `Effect.catchCause(Effect.logError)`, let the logger render the full Cause