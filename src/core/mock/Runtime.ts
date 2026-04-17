import { Effect, Exit, Fiber } from "effect";
import { dual } from "effect/Function";
import * as Context from "../context";

export interface Runtime<in R> extends Context.Context<R> {}

export declare namespace Runtime {
  export type Context<T extends Runtime<never>> = [T] extends [Runtime<infer R>]
    ? R
    : never;
}

/**
 * Executes the effect using the provided Scheduler or using the global
 * Scheduler if not provided
 *
 * @since 2.0.0
 * @category execution
 */
export const runFork: {
  /**
   * Executes the effect using the provided Scheduler or using the global
   * Scheduler if not provided
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(
    runtime: Runtime<R>
  ): <A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ) => Fiber.Fiber<A, E>;
  /**
   * Executes the effect using the provided Scheduler or using the global
   * Scheduler if not provided
   *
   * @since 2.0.0
   * @category execution
   */
  <R, A, E>(
    runtime: Runtime<R>,
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ): Fiber.Fiber<A, E>;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff, options) => Effect.runForkWith(runtime)(eff, options)
);

/**
 * Executes the effect synchronously returning the exit.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runSyncExit: {
  /**
   * Executes the effect synchronously returning the exit.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <A, E, R>(
    runtime: Runtime<R>,
    effect: Effect.Effect<A, E, R>
  ): Exit.Exit<A, E>;
  /**
   * Executes the effect synchronously returning the exit.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(
    runtime: Runtime<R>
  ): <A, E>(effect: Effect.Effect<A, E, R>) => Exit.Exit<A, E>;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff) => Effect.runSyncExitWith(runtime)(eff)
);

/**
 * Executes the effect synchronously throwing in case of errors or async boundaries.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runSync: {
  /**
   * Executes the effect synchronously throwing in case of errors or async boundaries.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <A, E, R>(runtime: Runtime<R>, effect: Effect.Effect<A, E, R>): A;
  /**
   * Executes the effect synchronously throwing in case of errors or async boundaries.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(runtime: Runtime<R>): <A, E>(effect: Effect.Effect<A, E, R>) => A;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff) => Effect.runSyncWith(runtime)(eff)
);

export type RunForkOptions = Effect.RunOptions;

/**
 * @since 2.0.0
 * @category models
 */
export interface RunCallbackOptions<in A, in E = never> extends RunForkOptions {
  readonly onExit?: ((exit: Exit.Exit<A, E>) => void) | undefined;
}

/**
 * Executes the effect asynchronously, eventually passing the exit value to
 * the specified callback.
 *
 * This method is effectful and should only be invoked at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runCallback: {
  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(
    runtime: Runtime<R>
  ): <A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: RunCallbackOptions<A, E> | undefined
  ) => (interruptor?: number | undefined) => void;
  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R, A, E>(
    runtime: Runtime<R>,
    effect: Effect.Effect<A, E, R>,
    options?: RunCallbackOptions<A, E> | undefined
  ): (interruptor?: number | undefined) => void;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff, options) => Effect.runCallbackWith(runtime)(eff, options)
);

/**
 * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
 * with the value of the effect once the effect has been executed, or will be
 * rejected with the first error or exception throw by the effect.
 *
 * This method is effectful and should only be used at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromise: {
  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(
    runtime: Runtime<R>
  ): <A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ) => Promise<A>;
  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R, A, E>(
    runtime: Runtime<R>,
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ): Promise<A>;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff, options) => Effect.runPromiseWith(runtime)(eff, options)
);

/**
 * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
 * with the `Exit` state of the effect once the effect has been executed.
 *
 * This method is effectful and should only be used at the edges of your
 * program.
 *
 * @since 2.0.0
 * @category execution
 */
export const runPromiseExit: {
  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R>(
    runtime: Runtime<R>
  ): <A, E>(
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ) => Promise<Exit.Exit<A, E>>;
  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   *
   * @since 2.0.0
   * @category execution
   */
  <R, A, E>(
    runtime: Runtime<R>,
    effect: Effect.Effect<A, E, R>,
    options?: Effect.RunOptions | undefined
  ): Promise<Exit.Exit<A, E>>;
} = /*@__PURE__*/ dual(
  (_) => Context.isContext(_[0]),
  (runtime, eff, options) => Effect.runPromiseExitWith(runtime)(eff, options)
);

/**
 * @since 2.0.0
 * @category constructors
 */
export const defaultRuntime: Runtime<never> = Context.empty();

// /**
//  * @since 2.0.0
//  * @category constructors
//  */
// export const make: <R>(options: {
//   readonly context: Context.Context<R>;
//   readonly runtimeFlags: RuntimeFlags.RuntimeFlags;
//   readonly fiberRefs: FiberRefs.FiberRefs;
// }) => Runtime<R> = internal.make;

// /**
//  * @since 2.0.0
//  * @category runtime flags
//  */
// export const updateRuntimeFlags: {
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   (
//     f: (flags: RuntimeFlags.RuntimeFlags) => RuntimeFlags.RuntimeFlags
//   ): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   <R>(
//     self: Runtime<R>,
//     f: (flags: RuntimeFlags.RuntimeFlags) => RuntimeFlags.RuntimeFlags
//   ): Runtime<R>;
// } = internal.updateRuntimeFlags;

// /**
//  * @since 2.0.0
//  * @category runtime flags
//  */
// export const enableRuntimeFlag: {
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   (flag: RuntimeFlags.RuntimeFlag): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   <R>(self: Runtime<R>, flag: RuntimeFlags.RuntimeFlag): Runtime<R>;
// } = internal.enableRuntimeFlag;

// /**
//  * @since 2.0.0
//  * @category runtime flags
//  */
// export const disableRuntimeFlag: {
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   (flag: RuntimeFlags.RuntimeFlag): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category runtime flags
//    */
//   <R>(self: Runtime<R>, flag: RuntimeFlags.RuntimeFlag): Runtime<R>;
// } = internal.disableRuntimeFlag;

// /**
//  * @since 2.0.0
//  * @category context
//  */
// export const updateContext: {
//   /**
//    * @since 2.0.0
//    * @category context
//    */
//   <R, R2>(
//     f: (context: Context.Context<R>) => Context.Context<R2>
//   ): (self: Runtime<R>) => Runtime<R2>;
//   /**
//    * @since 2.0.0
//    * @category context
//    */
//   <R, R2>(
//     self: Runtime<R>,
//     f: (context: Context.Context<R>) => Context.Context<R2>
//   ): Runtime<R2>;
// } = internal.updateContext;

// /**
//  * @since 2.0.0
//  * @category context
//  * @example
//  * ```ts
//  * import { Context, Runtime } from "effect"
//  *
//  * class Name extends Context.Tag("Name")<Name, string>() {}
//  *
//  * const runtime: Runtime.Runtime<Name> = Runtime.defaultRuntime.pipe(
//  *   Runtime.provideService(Name, "John")
//  * )
//  * ```
//  */
// export const provideService: {
//   /**
//    * @since 2.0.0
//    * @category context
//    * @example
//    * ```ts
//    * import { Context, Runtime } from "effect"
//    *
//    * class Name extends Context.Tag("Name")<Name, string>() {}
//    *
//    * const runtime: Runtime.Runtime<Name> = Runtime.defaultRuntime.pipe(
//    *   Runtime.provideService(Name, "John")
//    * )
//    * ```
//    */
//   <I, S>(
//     tag: Context.Tag<I, S>,
//     service: S
//   ): <R>(self: Runtime<R>) => Runtime<I | R>;
//   /**
//    * @since 2.0.0
//    * @category context
//    * @example
//    * ```ts
//    * import { Context, Runtime } from "effect"
//    *
//    * class Name extends Context.Tag("Name")<Name, string>() {}
//    *
//    * const runtime: Runtime.Runtime<Name> = Runtime.defaultRuntime.pipe(
//    *   Runtime.provideService(Name, "John")
//    * )
//    * ```
//    */
//   <R, I, S>(
//     self: Runtime<R>,
//     tag: Context.Tag<I, S>,
//     service: S
//   ): Runtime<R | I>;
// } = internal.provideService;

// /**
//  * @since 2.0.0
//  * @category fiber refs
//  */
// export const updateFiberRefs: {
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    */
//   (
//     f: (fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
//   ): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    */
//   <R>(
//     self: Runtime<R>,
//     f: (fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
//   ): Runtime<R>;
// } = internal.updateFiberRefs;

// /**
//  * @since 2.0.0
//  * @category fiber refs
//  * @example
//  * ```ts
//  * import { Effect, FiberRef, Runtime } from "effect"
//  *
//  * const ref = FiberRef.unsafeMake(0)
//  *
//  * const updatedRuntime = Runtime.defaultRuntime.pipe(
//  *   Runtime.setFiberRef(ref, 1)
//  * )
//  *
//  * // returns 1
//  * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//  * ```
//  */
// export const setFiberRef: {
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    * @example
//    * ```ts
//    * import { Effect, FiberRef, Runtime } from "effect"
//    *
//    * const ref = FiberRef.unsafeMake(0)
//    *
//    * const updatedRuntime = Runtime.defaultRuntime.pipe(
//    *   Runtime.setFiberRef(ref, 1)
//    * )
//    *
//    * // returns 1
//    * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//    * ```
//    */
//   <A>(
//     fiberRef: FiberRef.FiberRef<A>,
//     value: A
//   ): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    * @example
//    * ```ts
//    * import { Effect, FiberRef, Runtime } from "effect"
//    *
//    * const ref = FiberRef.unsafeMake(0)
//    *
//    * const updatedRuntime = Runtime.defaultRuntime.pipe(
//    *   Runtime.setFiberRef(ref, 1)
//    * )
//    *
//    * // returns 1
//    * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//    * ```
//    */
//   <R, A>(
//     self: Runtime<R>,
//     fiberRef: FiberRef.FiberRef<A>,
//     value: A
//   ): Runtime<R>;
// } = internal.setFiberRef;

// /**
//  * @since 2.0.0
//  * @category fiber refs
//  * @example
//  * ```ts
//  * import { Effect, FiberRef, Runtime } from "effect"
//  *
//  * const ref = FiberRef.unsafeMake(0)
//  *
//  * const updatedRuntime = Runtime.defaultRuntime.pipe(
//  *   Runtime.setFiberRef(ref, 1),
//  *   Runtime.deleteFiberRef(ref)
//  * )
//  *
//  * // returns 0
//  * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//  * ```
//  */
// export const deleteFiberRef: {
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    * @example
//    * ```ts
//    * import { Effect, FiberRef, Runtime } from "effect"
//    *
//    * const ref = FiberRef.unsafeMake(0)
//    *
//    * const updatedRuntime = Runtime.defaultRuntime.pipe(
//    *   Runtime.setFiberRef(ref, 1),
//    *   Runtime.deleteFiberRef(ref)
//    * )
//    *
//    * // returns 0
//    * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//    * ```
//    */
//   <A>(fiberRef: FiberRef.FiberRef<A>): <R>(self: Runtime<R>) => Runtime<R>;
//   /**
//    * @since 2.0.0
//    * @category fiber refs
//    * @example
//    * ```ts
//    * import { Effect, FiberRef, Runtime } from "effect"
//    *
//    * const ref = FiberRef.unsafeMake(0)
//    *
//    * const updatedRuntime = Runtime.defaultRuntime.pipe(
//    *   Runtime.setFiberRef(ref, 1),
//    *   Runtime.deleteFiberRef(ref)
//    * )
//    *
//    * // returns 0
//    * const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
//    * ```
//    */
//   <R, A>(self: Runtime<R>, fiberRef: FiberRef.FiberRef<A>): Runtime<R>;
// } = internal.deleteFiberRef;
