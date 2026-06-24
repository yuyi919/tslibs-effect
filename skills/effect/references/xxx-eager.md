# Effect Eager Functions

The `xxxEager` variants of core Effect functions optimize performance for **already-resolved effects** (i.e., `Exit` of `Success` or `Failure`).

## Core Difference

When an effect is already resolved to an `Exit`, the Eager version immediately applies the transformation function. The standard version always defers through the effect pipeline (fiber scheduling).

| Function | Eager Behavior | Standard Behavior |
|----------|---------------|-------------------|
| `matchEager` | If `effectIsExit`, apply handler immediately, return `exitSucceed` | Always defers through `match` |
| `matchCauseEager` | Same as above, but handles full `Cause` | Always defers through `matchCause` |
| `mapErrorEager` | If `effectIsExit`, uses `exitMapError`; otherwise `mapError` | Always defers through `mapError` |
| `mapBothEager` | If `effectIsExit`, uses `exitMapBoth`; otherwise `mapBoth` | Always defers through `mapBoth` |
| `catchEager` | If `effectIsExit` and `Failure`, immediately applies catch function | Always defers through `catch_` |
| `fnUntracedEager` | Attempts synchronous loop resolution; returns immediately on `Success`/`Failure` | Defers through `fromIteratorUnsafe` |

## Use Cases

Eager versions are suitable for scenarios that **frequently handle already-computed values**, avoiding fiber scheduling overhead. For unresolved effects, Eager versions automatically fall back to standard behavior.

## Special Notes

- `fnUntracedEager` synchronously executes the generator until the first async effect is encountered (from `.agents/references/effect-smol/packages/effect/test/EffectEager.test.ts` L36-57)
- HTTP modules use `flatMapEager` and `matchCauseEffectEager` to optimize response handling
- All Eager functions were introduced in v4.0.0

## Source References

From `.agents/references/effect-smol/packages/effect/src/internal/effect.ts` (L1233-1248, L1703-1734, L1751-1756, L3461-3490, L3514-3518) and `.agents/references/effect-smol/packages/effect/test/EffectEager.test.ts` (L36-57, L200-207).