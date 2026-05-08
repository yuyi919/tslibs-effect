import { unsafeCoerce } from "@yuyi919/shared-proto/Functions";
import { isFn, isNotNil } from "@yuyi919/shared-proto/JsTypes";
import {
  Effect,
  Fiber,
  FiberHandle,
  identity,
  type ManagedRuntime,
  Ref,
  type Schedule,
} from "effect";
import { dual } from "effect/Function";
import { LogLevel, Severity } from "effect/LogLevel";
import { isPromiseLike } from "effect/Predicate";
import type { Scope } from "effect/Scope";
import type { NoSuchElementException } from "./cause.js";
import type * as Context from "./context.js";
import * as Duration from "./duration.js";
import { scopedCacheWith } from "./effect/scopedCache.js";
import * as Layer from "./layer.js";
import type { RunForkOptions, Runtime } from "./mock/Runtime.js";

export interface T<out A, out E = never, out R = never>
  extends Effect.Effect<A, E, R> {}
export type { T as t };

export declare namespace T {
  export type Success<T> = Effect.Success<T>;
  export type Error<T> = Effect.Error<T>;
  export type Context<T> = Effect.Services<T>;
}

export type Any<A> = T<A, any, any>;
export type AnyT = T<any, any, any>;

// filter
export const __unsafe_coerce =
  <A>(_: void) =>
  <A1, E, R>(e: T<A1, E, R>): T<A, E, R> =>
    unsafeCoerce(e);

// filter
export function filterNil<A>(
  _: void
): <E, R>(
  self: Effect.Effect<A, E, R>
) => Effect.Effect<NonNullable<A>, E | NoSuchElementException, R> {
  return Effect.filterOrFail<A, NonNullable<A>>(isNotNil<A>);
}

export function filterNilWith<A, E>(
  onElse: (e: NoInfer<A>) => E
): <E2, R>(
  self: Effect.Effect<A, E2, R>
) => Effect.Effect<NonNullable<A>, E | E2, R> {
  return Effect.filterOrFail<A, E, NonNullable<A>>(isNotNil<A>, onElse);
}

// from
export function fromFunction<A, E, R>(f: () => T<A, E, R>): T<A, E, R>;
export function fromFunction<A>(f: () => Promise<A> | A): T<A, never, never>;
export function fromFunction(f: () => any) {
  return Effect.sync(f).pipe(Effect.flatMap(fromSomething));
}

export function fromSomething<A, E = never, R = never>(
  a: T<A, E, R> | Promise<A> | A
): T<A, E, R> {
  return isPromiseLike(a)
    ? Effect.promise(() => a)
    : Effect.isEffect(a)
      ? (a as unknown as T<A, E, R>)
      : Effect.succeed(a);
}
export function from<A, E, R>(f: T<A, E, R> | (() => T<A, E, R>)): T<A, E, R>;
export function from<A>(
  f:
    | (Promise<A> | Context.Tag<any, A> | Exclude<A, T<any, any, any>>)
    | (() => Promise<A> | Context.Tag<any, A> | A)
): T<A, never, never>;
export function from(f: any) {
  return isFn(f) ? fromFunction(f) : fromSomething(f);
}

export function fromAll<A>(f: () => Promise<A>[]): T<A[]> {
  return fromFunction(() => Promise.all(f()));
}

// duration
/**
 * 记录耗时
 * @param label 时间标签（日志输出用）
 * @param f
 */
export function logElapsed<A, E = never, R = never>(
  label: string,
  f: () => T<A, E, R> | Promise<A> | A,
  level?: Severity
): T<A, E, R>;
export function logElapsed(
  label: string,
  duration: Duration.DurationInput,
  level?: Severity
): T<void>;
export function logElapsed(
  label: string,
  durOrF: Duration.DurationInput | (() => any),
  level?: Severity
): T<any> {
  if (isFn(durOrF)) {
    return Effect.timed(fromFunction(durOrF)).pipe(
      Effect.flatMap(([dur, v]) =>
        Effect.succeed(v).pipe(Effect.tap(() => logElapsed(label, dur, level)))
      )
    );
  }
  return Effect.logWithLevel(level ?? "Debug")(
    `${label} elapsed: ${Duration.format(Duration.fromInputUnsafe(durOrF))}`
  );
}

export function withLogElapsed<A, E, R>(
  label: string,
  level?: Severity
): (e: T<A, E, R>) => T<A, E, R> {
  return (e) => logElapsed(label, () => e, level);
}

export function tapBefore<A, E, R, A2, E2, R2>(
  f: () => T<A, E, R>
): (eff: T<A2, E2, R2>) => T<A2, E | E2, R | R2> {
  return (eff) => f().pipe(Effect.flatMap(() => eff));
}

export function retryWith<A, E, R, B, R1>(
  f: (retryCount: number) => Effect.Effect<A, E, R>,
  options?: Schedule.Schedule<B, E, R1>
): Effect.Effect<A, E, R>;
export function retryWith<A, E, R>(
  f: (retryCount: number) => Effect.Effect<A, E, R>,
  options?: Effect.Retry.Options<E>
): Effect.Effect<A, E, R>;
export function retryWith<A, E, R>(
  f: (retryCount: number) => Effect.Effect<A, E, R>,
  options: Effect.Retry.Options<E> | Schedule.Schedule<any, E, any> = {}
): Effect.Effect<A, E, R> {
  return Effect.gen(function* () {
    const retryCount = yield* Ref.make(0);
    return yield* Ref.get(retryCount).pipe(
      Effect.flatMap((i) => f(i)),
      Effect.tapError(() => Ref.update(retryCount, (x) => x + 1)),
      Effect.retry(options as Effect.Retry.Options<E>)
    );
  });
}

// export { effFn as fn } from "@server/effect/helper";

/**
 * 提供Effect<Layer|Context|Runtime|ManagedRuntime>
 */
export const provideEffect: {
  <C, E2, R2, E3>(
    ctx: Effect.Effect<ManagedRuntime.ManagedRuntime<C, E3>, E2, R2>
  ): <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | E2 | E3, Exclude<R, C> | R2>;
  <C, E2, R2, E3, R3>(
    ctx: Effect.Effect<Layer.Layer<C, E3, R3>, E2, R2>
  ): <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | E2 | E3, Exclude<R, C> | R2 | R3>;
  <C, E2, R2>(
    ctx: Effect.Effect<Context.Context<C>, E2, R2>
  ): <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | E2, Exclude<R, C> | R2>;
  <A, E, R, C, E2, R2>(
    eff: Effect.Effect<A, E, R>,
    ctx: Effect.Effect<
      Context.Context<C> | ManagedRuntime.ManagedRuntime<C, any>,
      E2,
      R2
    >
  ): Effect.Effect<A, E | E2, Exclude<R, C> | R2>;
} = /*@__PURE__*/ dual(
  2,
  <A, E, R, C, E2, R2>(
    eff: Effect.Effect<A, E, R>,
    effCtx: Effect.Effect<
      Context.Context<C> | Runtime<C> | Layer.Layer<A, never, never>,
      E2,
      R2
    >
  ): Effect.Effect<A, E | E2, Exclude<R, C> | R2 | Scope> => {
    // Effect.flatMap(
    //   effCtx,
    //   (ctx) => Effect.provide(eff, ctx as Context.Context<C>),
    // )
    const layer = Layer.unwrapEffect(
      scopedCacheWith(
        effCtx.pipe(
          Effect.map(
            (ctx) =>
              (Layer.isLayer(ctx)
                ? ctx
                : Layer.succeedContext(
                    ctx as Context.Context<C>
                  )) as Layer.Layer<C, E2, R2>
          )
        ),
        effCtx
      )
    );
    return eff.pipe(Effect.provide(layer));
  }
);

/**
 * 提供层，该层将通过MemoMap在Scope中记忆缓存
 */
export const provideWithScope: {
  /**
   * 提供层，该层将通过MemoMap在Scope中记忆缓存，无需在根部provide
   */
  <C, E2, R2>(
    ctx: Layer.Layer<C, E2, R2>,
    id: any
  ): <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | E2, Exclude<R, C> | R2 | Scope>;
  <A, E, R, C, E2, R2>(
    eff: Effect.Effect<A, E, R>,
    ctx: Layer.Layer<C, E2, R2>,
    id: any
  ): Effect.Effect<A, E | E2, Exclude<R, C> | R2 | Scope>;
} = /*@__PURE__*/ dual(
  3,
  <A, E, R, C, E2, R2>(
    eff: Effect.Effect<A, E, R>,
    effCtx: Layer.t<C, E2, R2>,
    id: any
  ): Effect.Effect<A, E | E2, Exclude<R, C> | R2 | Scope> =>
    eff.pipe(provideEffect(Layer.buildMemoized<C, E2, R2>(effCtx, id)))
);

export function fiberHandle<R, E = unknown, A = unknown>() {
  return FiberHandle.makeRuntime<R, E, A>();
}

export function fiberHandleScope<R, E = unknown, A = unknown>() {
  return FiberHandle.makeRuntime<Scope | R, E, A>();
}

export function runtimeHandleScope<
  R = never,
  E = unknown,
  A = unknown,
>(): Effect.Effect<RuntimeHandle<Scope | R, E, A>, never, Scope | R> {
  return runtimeHandle<R | Scope, E, A>();
}

export interface RuntimeHandle<R, E = unknown, A = unknown> {
  fork: <XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>,
    options?: RunForkOptions & {
      readonly onlyIfMissing?: boolean | undefined;
    }
  ) => Fiber.Fiber<XA, XE>;
  forkPromise: <XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>,
    options?: RunForkOptions & {
      readonly propagateInterruption?: boolean | undefined;
    }
  ) => Promise<XA>;
  forkAwait: <XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>,
    options?: RunForkOptions & {
      readonly onlyIfMissing?: boolean | undefined;
    }
  ) => Effect.Effect<XA, XE, never>;
}

export function runtimeHandle<
  R = never,
  E = unknown,
  A = unknown,
>(): Effect.Effect<RuntimeHandle<R, E, A>, never, R | Scope> {
  return Effect.all({
    handle: FiberHandle.make<A, E>(),
  }).pipe(
    Effect.bind("fork", (self) => FiberHandle.runtime(self.handle)<R>()),
    Effect.bind("forkPromise", (self) =>
      FiberHandle.runtimePromise(self.handle)<R>()
    ),
    Effect.let(
      "forkAwait",
      (self): RuntimeHandle<R, E, A>["forkAwait"] =>
        (effect, options?) =>
          Fiber.await(self.fork(effect, options)).pipe(Effect.flatMap(identity))
    )
  );
}

export * from "effect/Effect";
export * from "./effect/batched.js";
export * from "./effect/funcs.js";
export * from "./effect/persisted.js";
export * from "./effect/scopedCache.js";
export * from "./effect/shared.js";
export * from "./mock/Effect.js";
