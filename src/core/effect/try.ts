import { Exit, Result } from "effect";
import { UnknownError } from "effect/Cause";
import * as Effect from "effect/Effect";

export interface TryCatchExt<A, E, R> {
  catchSync: (f: (e: E) => A, eager?: boolean) => Evaluate<A, never, R>;
  catch: <E2, R2>(
    f: (e: E) => Evaluate<A, E2, R2>,
    eager?: boolean
  ) => Evaluate<A, E2, R | R2>;
  catchAltSync: <A2>(
    f: (e: E) => A2,
    eager?: boolean
  ) => Evaluate<A | A2, never, R>;
  catchAlt: <A2, E2, R2>(
    f: (e: E) => Effect.Effect<A2, E2, R2>,
    eager?: boolean
  ) => Evaluate<A | A2, E2, R | R2>;
  mapError: <E2>(f: (e: E) => E2, eager?: boolean) => Evaluate<A, E2, R>;
  tapError: {
    <A2, E2, R2>(f: (e: E) => Effect.Effect<A2, E2, R2>): Evaluate<A, E, R>;
    <A2>(f: (e: E, signal: AbortSignal) => Promise<A2>): Evaluate<A, E, R>;
    (f: (e: E) => unknown): Evaluate<A, E, R>;
  };
  catchDefect: {
    (): Evaluate<A, E | UnknownError, R>;
    <A2, E2, R2>(
      f: (e: unknown) => Effect.Effect<A2, E2, R2>
    ): Evaluate<A | A2, E | E2, R | R2>;
  };
}

export interface ToExt<A, E, R> {
  toExit: () => Evaluate<Exit.Exit<A, E>, never, R>;
  toResult: () => Evaluate<Result.Result<A, E>, never, R>;
  toUnion: () => Evaluate<A | E, never, R>;
  as: <A2 extends A>() => Evaluate<A2, E, R>;
  tap: {
    <A2, E2, R2>(f: (e: A) => Effect.Effect<A2, E2, R2>): Evaluate<A, E, R>;
    <A2>(f: (e: A, signal: AbortSignal) => Promise<A2>): Evaluate<A, E, R>;
    (f: (e: A) => unknown): Evaluate<A, E, R>;
  };
}

export interface FunctorExt<A, E, R> {
  map: <A2>(f: (a: A) => A2, eager?: boolean) => Evaluate<A2, E, R>;
  flatMap: <A2, E2, R2>(
    f: (a: A) => Effect.Effect<A2, E2, R2>,
    eager?: boolean
  ) => Evaluate<A2, E | E2, R | R2>;
}

export interface Evaluate<A, E = never, R = never>
  extends Effect.Effect<A, E, R>,
    TryCatchExt<A, E, R>,
    FunctorExt<A, E, R>,
    ToExt<A, E, R> {}

export function withEvaluate<A, E, R>(
  effect: Effect.Effect<A, E, R>
): Evaluate<A, E, R> {
  const catchAltSync: TryCatchExt<A, E, R>["catchAltSync"] = (
    f,
    eager = false
  ) =>
    withEvaluate(
      (eager ? Effect.catchEager : Effect.catch)(effect, (e) =>
        Effect.succeed(f(e))
      )
    );
  const catchAlt: TryCatchExt<A, E, R>["catchAlt"] = (f, eager = false) =>
    withEvaluate((eager ? Effect.catchEager : Effect.catch)(effect, f));
  const ext: TryCatchExt<A, E, R> & ToExt<A, E, R> & FunctorExt<A, E, R> = {
    toExit: () => withEvaluate(Effect.exit(effect)),
    toResult: () => withEvaluate(Effect.result(effect)),
    toUnion: () => withEvaluate(catchAltSync((_) => _, true)),
    as: <A2 extends A>() => withEvaluate(effect as Evaluate<A2, E, R>),

    map(this: Effect.Effect<A, E, R>, f, eager) {
      return withEvaluate((eager ? Effect.mapEager : Effect.map)(this, f));
    },

    flatMap(this: Effect.Effect<A, E, R>, f, eager) {
      return withEvaluate(
        (eager ? Effect.flatMapEager : Effect.flatMap)(this, f)
      );
    },

    mapError: (f, eager = false) =>
      withEvaluate((eager ? Effect.mapErrorEager : Effect.mapError)(effect, f)),
    tap: (f: any) =>
      withEvaluate(
        Effect.tap(effect, (e) => {
          return Effect.ignoreCause(tryEvaluate((_) => f(e) as Promise<any>));
        })
      ),
    tapError: (f: any) =>
      withEvaluate(
        Effect.tapError(effect, (e) => {
          return Effect.ignoreCause(tryEvaluate((_) => f(e) as Promise<any>));
        })
      ),
    catchSync: catchAltSync,
    catchAltSync: catchAltSync,
    catch: catchAlt,
    catchAlt: catchAlt,
    catchDefect: (f?: any) =>
      withEvaluate(
        Effect.catchDefect(
          effect,
          f ? f : (e) => Effect.fail(new UnknownError(e))
        )
      ) as any,
  };
  return Object.assign(effect, ext);
}

export function tryEvaluate<A = never>(
  evaluate: (signal: AbortSignal) => never
): Evaluate<A, UnknownError>;
export function tryEvaluate<A, E = never, E2 = never, R = never>(
  evaluate: (signal: AbortSignal) => Effect.Effect<A, E, R>,
  catchE: (e: E) => E2
): Evaluate<A, E2, R>;
export function tryEvaluate<A = never, E = never, R = never>(
  evaluate: (signal: AbortSignal) => Effect.Effect<A, E, R>
): Evaluate<A, E, R>;
export function tryEvaluate<A, E = never>(
  evaluate: (signal: AbortSignal) => PromiseLike<A>,
  catchE: (e: unknown) => E
): Evaluate<A, E>;
export function tryEvaluate<A>(
  evaluate: (signal: AbortSignal) => PromiseLike<A>
): Evaluate<A, UnknownError>;
export function tryEvaluate<A, E = never, R = never>(
  evaluate: (signal: AbortSignal) => A | PromiseLike<A> | Effect.Effect<A, E, R>
): Evaluate<A, E | UnknownError, R>;
export function tryEvaluate<A>(
  evaluate: (signal: AbortSignal) => A
): Evaluate<A, UnknownError>;
export function tryEvaluate<A, E, E2, R>(
  evaluate: (
    signal: AbortSignal
  ) => A | PromiseLike<A> | Effect.Effect<A, E, R>,
  catchE?: (e: E) => E2
): Evaluate<A, E | E2 | UnknownError, R> {
  const fail = (e: E): Effect.Effect<never, UnknownError | E2> =>
    catchE
      ? Effect.failSync(() => catchE(e))
      : Effect.fail(
          e instanceof UnknownError
            ? e
            : new UnknownError(e, "An unknown error occurred in *tryEvaluate*")
        );

  const value: Effect.Effect<A, UnknownError | E | E2, R> = Effect.callback(
    (resolve, signal) => {
      try {
        const result = evaluate(signal);
        if (Effect.isEffect(result)) {
          return resolve(result);
        }
        if (result instanceof Promise) {
          result.then(
            (a) =>
              resolve(Effect.isEffect(a) ? (a as never) : Effect.succeed(a)),
            (e) => resolve(fail(e))
          );
          return;
        }
        return resolve(Effect.succeed(result as A));
      } catch (e) {
        resolve(fail(e as E));
      }
    }
  );
  return withEvaluate(value);
}
