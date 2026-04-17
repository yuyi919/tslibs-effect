import { identity } from "@yuyi919/shared-proto/Functions";
import { isFn, isStr } from "@yuyi919/shared-proto/JsTypes";
import { DateTime, Effect, Scope, type Types } from "effect";
import { context, type Yieldable } from "effect/Effect";
import { dual, type LazyArg } from "effect/Function";
import { pick } from "es-toolkit";
import * as Cause from "../cause";
import { currentMinimumLogLevel } from "../FiberRef";
import * as LogLevel from "../logLevel";
import type { Runtime } from "../mock/Runtime";
import * as Option from "../option";

export interface YieldWrap<T extends Effect.All.EffectAny>
	extends Yieldable<
		T,
		Effect.Success<T>,
		Effect.Error<T>,
		Effect.Services<T>
	> {}

export type EffGenFn<
	A,
	E,
	R,
	Eff extends YieldWrap<Effect.Effect<any, E, R>> = YieldWrap<
		Effect.Effect<any, E, R>
	>,
> = () => Generator<Eff, A, never>;

/**
 * Ignores the result of an effect but logs any failures.
 *
 * **Details**
 *
 * This function takes an effect and returns a new effect that ignores whether
 * the original effect succeeds or fails. However, if the effect fails, it will
 * log the failure at the Debug level, so you can keep track of any issues that
 * arise.
 *
 * **When to Use**
 *
 * This is useful in scenarios where you want to continue with your program
 * regardless of the result of the effect, but you still want to be aware of
 * potential failures that may need attention later.
 *
 * @since 2.0.0
 * @category Error handling
 */
export function ignoreLogged<A, E, R>(
	self: Effect.Effect<A, E, R>,
): Effect.Effect<void, never, R> {
	return Effect.ignoreCause(self, { log: "Debug" });
}

export function dieMessage(message: string): Effect.Effect<never> {
	return Effect.die(new Error(message));
}

export {
	callback as async,
	catch as catchAll,
	catchCause as catchAllCause,
	forkChild as fork,
	forkDetach as forkDaemon,
	result as either,
	tapCause as tapErrorCause,
} from "effect/Effect";

export const runtime: <R = never>() => Effect.Effect<Runtime<R>, never, R> =
	context;

export const withRequestCaching = (_: boolean) => identity;

export const tryMap = /*@__PURE__*/ dual<
	<A, B, E1>(options: {
		readonly try: (a: A) => B;
		readonly catch: (error: unknown) => E1;
	}) => <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B, E | E1, R>,
	<A, E, R, B, E1>(
		self: Effect.Effect<A, E, R>,
		options: {
			readonly try: (a: A) => B;
			readonly catch: (error: unknown) => E1;
		},
	) => Effect.Effect<B, E | E1, R>
>(2, (self, options) =>
	Effect.flatMap(self, (a) =>
		Effect.try({
			try: () => options.try(a),
			catch: options.catch,
		}),
	),
);

/**
 * Attempts one effect, and if it fails, falls back to another effect.
 *
 * **Details**
 *
 * This function allows you to try executing an effect, and if it fails
 * (produces an error), a fallback effect is executed instead. The fallback
 * effect is defined as a lazy argument, meaning it will only be evaluated if
 * the first effect fails. This provides a way to recover from errors by
 * specifying an alternative path of execution.
 *
 * The error type of the resulting effect will be that of the fallback effect,
 * as the first effect's error is replaced when the fallback is executed.
 *
 * **Example**
 *
 * ```ts
 * import { Effect } from "effect"
 *
 * const success = Effect.succeed("success")
 * const failure = Effect.fail("failure")
 * const fallback = Effect.succeed("fallback")
 *
 * // Try the success effect first, fallback is not used
 * const program1 = Effect.orElse(success, () => fallback)
 * console.log(Effect.runSync(program1))
 * // Output: "success"
 *
 * // Try the failure effect first, fallback is used
 * const program2 = Effect.orElse(failure, () => fallback)
 * console.log(Effect.runSync(program2))
 * // Output: "fallback"
 * ```
 *
 * @see {@link catchAll} if you need to access the error in the fallback effect.
 *
 * @since 2.0.0
 * @category Fallback
 */
export const orElse: {
	/**
	 * Attempts one effect, and if it fails, falls back to another effect.
	 *
	 * **Details**
	 *
	 * This function allows you to try executing an effect, and if it fails
	 * (produces an error), a fallback effect is executed instead. The fallback
	 * effect is defined as a lazy argument, meaning it will only be evaluated if
	 * the first effect fails. This provides a way to recover from errors by
	 * specifying an alternative path of execution.
	 *
	 * The error type of the resulting effect will be that of the fallback effect,
	 * as the first effect's error is replaced when the fallback is executed.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect } from "effect"
	 *
	 * const success = Effect.succeed("success")
	 * const failure = Effect.fail("failure")
	 * const fallback = Effect.succeed("fallback")
	 *
	 * // Try the success effect first, fallback is not used
	 * const program1 = Effect.orElse(success, () => fallback)
	 * console.log(Effect.runSync(program1))
	 * // Output: "success"
	 *
	 * // Try the failure effect first, fallback is used
	 * const program2 = Effect.orElse(failure, () => fallback)
	 * console.log(Effect.runSync(program2))
	 * // Output: "fallback"
	 * ```
	 *
	 * @see {@link catchAll} if you need to access the error in the fallback effect.
	 *
	 * @since 2.0.0
	 * @category Fallback
	 */
	<A2, E2, R2>(
		that: LazyArg<Effect.Effect<A2, E2, R2>>,
	): <A, E, R>(
		self: Effect.Effect<A, E, R>,
	) => Effect.Effect<A2 | A, E2, R2 | R>;
	/**
	 * Attempts one effect, and if it fails, falls back to another effect.
	 *
	 * **Details**
	 *
	 * This function allows you to try executing an effect, and if it fails
	 * (produces an error), a fallback effect is executed instead. The fallback
	 * effect is defined as a lazy argument, meaning it will only be evaluated if
	 * the first effect fails. This provides a way to recover from errors by
	 * specifying an alternative path of execution.
	 *
	 * The error type of the resulting effect will be that of the fallback effect,
	 * as the first effect's error is replaced when the fallback is executed.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect } from "effect"
	 *
	 * const success = Effect.succeed("success")
	 * const failure = Effect.fail("failure")
	 * const fallback = Effect.succeed("fallback")
	 *
	 * // Try the success effect first, fallback is not used
	 * const program1 = Effect.orElse(success, () => fallback)
	 * console.log(Effect.runSync(program1))
	 * // Output: "success"
	 *
	 * // Try the failure effect first, fallback is used
	 * const program2 = Effect.orElse(failure, () => fallback)
	 * console.log(Effect.runSync(program2))
	 * // Output: "fallback"
	 * ```
	 *
	 * @see {@link catchAll} if you need to access the error in the fallback effect.
	 *
	 * @since 2.0.0
	 * @category Fallback
	 */
	<A, E, R, A2, E2, R2>(
		self: Effect.Effect<A, E, R>,
		that: LazyArg<Effect.Effect<A2, E2, R2>>,
	): Effect.Effect<A2 | A, E2, R2 | R>;
} = Effect.catchEager;

export const zipRight: {
	/**
	 * Executes two effects sequentially, returning the result of the second effect
	 * while ignoring the result of the first.
	 *
	 * **Details**
	 *
	 * This function allows you to run two effects in sequence, keeping the result
	 * of the second effect and discarding the result of the first. By default, the
	 * two effects are executed sequentially. If you need them to run concurrently,
	 * you can pass the `{ concurrent: true }` option.
	 *
	 * The first effect will always be executed, even though its result is ignored.
	 * This makes it useful for scenarios where the first effect is needed for its
	 * side effects, but only the result of the second effect is important.
	 *
	 * **When to Use**
	 *
	 * Use this function when you are only interested in the result of the second
	 * effect but still need to run the first effect for its side effects, such as
	 * initialization or setup tasks.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect } from "effect"
	 *
	 * const task1 = Effect.succeed(1).pipe(
	 *   Effect.delay("200 millis"),
	 *   Effect.tap(Effect.log("task1 done"))
	 * )
	 * const task2 = Effect.succeed("hello").pipe(
	 *   Effect.delay("100 millis"),
	 *   Effect.tap(Effect.log("task2 done"))
	 * )
	 *
	 * const program = Effect.zipRight(task1, task2)
	 *
	 * Effect.runPromise(program).then(console.log)
	 * // Output:
	 * // timestamp=... level=INFO fiber=#0 message="task1 done"
	 * // timestamp=... level=INFO fiber=#0 message="task2 done"
	 * // hello
	 * ```
	 *
	 * @see {@link zipLeft} for a version that returns the result of the first
	 * effect.
	 *
	 * @since 2.0.0
	 * @category Zipping
	 */
	<A2, E2, R2>(
		that: Effect.Effect<A2, E2, R2>,
		options?: { readonly concurrent?: boolean | undefined },
	): <A, E, R>(
		self: Effect.Effect<A, E, R>,
	) => Effect.Effect<A2, E2 | E, R2 | R>;
	/**
	 * Executes two effects sequentially, returning the result of the second effect
	 * while ignoring the result of the first.
	 *
	 * **Details**
	 *
	 * This function allows you to run two effects in sequence, keeping the result
	 * of the second effect and discarding the result of the first. By default, the
	 * two effects are executed sequentially. If you need them to run concurrently,
	 * you can pass the `{ concurrent: true }` option.
	 *
	 * The first effect will always be executed, even though its result is ignored.
	 * This makes it useful for scenarios where the first effect is needed for its
	 * side effects, but only the result of the second effect is important.
	 *
	 * **When to Use**
	 *
	 * Use this function when you are only interested in the result of the second
	 * effect but still need to run the first effect for its side effects, such as
	 * initialization or setup tasks.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect } from "effect"
	 *
	 * const task1 = Effect.succeed(1).pipe(
	 *   Effect.delay("200 millis"),
	 *   Effect.tap(Effect.log("task1 done"))
	 * )
	 * const task2 = Effect.succeed("hello").pipe(
	 *   Effect.delay("100 millis"),
	 *   Effect.tap(Effect.log("task2 done"))
	 * )
	 *
	 * const program = Effect.zipRight(task1, task2)
	 *
	 * Effect.runPromise(program).then(console.log)
	 * // Output:
	 * // timestamp=... level=INFO fiber=#0 message="task1 done"
	 * // timestamp=... level=INFO fiber=#0 message="task2 done"
	 * // hello
	 * ```
	 *
	 * @see {@link zipLeft} for a version that returns the result of the first
	 * effect.
	 *
	 * @since 2.0.0
	 * @category Zipping
	 */
	<A, E, R, A2, E2, R2>(
		self: Effect.Effect<A, E, R>,
		that: Effect.Effect<A2, E2, R2>,
		options?: { readonly concurrent?: boolean | undefined },
	): Effect.Effect<A2, E2 | E, R2 | R>;
} = /*@__PURE__*/ dual(
	(args) => Effect.isEffect(args[1]),
	(self, that, opt) => Effect.zipWith(self, that, (_, b) => b, opt),
);
export const zipLeft: {
	<A2, E2, R2>(
		that: Effect.Effect<A2, E2, R2>,
		options?:
			| {
					readonly concurrent?: boolean | undefined;
			  }
			| undefined,
	): <A, E, R>(
		self: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E2 | E, R2 | R>;
	<A, E, R, A2, E2, R2>(
		self: Effect.Effect<A, E, R>,
		that: Effect.Effect<A2, E2, R2>,
		options?:
			| {
					readonly concurrent?: boolean | undefined;
			  }
			| undefined,
	): Effect.Effect<A, E | E2, R | R2>;
} = /*@__PURE__*/ dual(
	(args) => Effect.isEffect(args[1]),
	(self, that, opt) => Effect.zipWith(self, that, (a, _) => a, opt),
);

/**
 * Allows you to inspect both success and failure outcomes of an effect and
 * perform side effects for each.
 *
 * **Details**
 *
 * This function enables you to handle both success and failure cases
 * separately, without modifying the main effect's result. It is particularly
 * useful for scenarios where you need to log, monitor, or perform additional
 * actions depending on whether the effect succeeded or failed.
 *
 * When the effect succeeds, the `onSuccess` handler is executed with the
 * success value. When the effect fails, the `onFailure` handler is executed
 * with the failure value. Both handlers can include side effects such as
 * logging or analytics, and neither modifies the original effect's output.
 *
 * If either the success or failure handler fails, the overall effect will also
 * fail.
 *
 * **Example**
 *
 * ```ts
 * import { Effect, Random, Console } from "effect"
 *
 * // Simulate a task that might fail
 * const task = Effect.filterOrFail(
 *   Random.nextRange(-1, 1),
 *   (n) => n >= 0,
 *   () => "random number is negative"
 * )
 *
 * // Use tapBoth to log both success and failure outcomes
 * const tapping = Effect.tapBoth(task, {
 *   onFailure: (error) => Console.log(`failure: ${error}`),
 *   onSuccess: (randomNumber) =>
 *     Console.log(`random number: ${randomNumber}`)
 * })
 *
 * Effect.runFork(tapping)
 * // Example Output:
 * // failure: random number is negative
 * ```
 *
 * @since 2.0.0
 * @category Sequencing
 */
export const tapBoth: {
	/**
	 * Allows you to inspect both success and failure outcomes of an effect and
	 * perform side effects for each.
	 *
	 * **Details**
	 *
	 * This function enables you to handle both success and failure cases
	 * separately, without modifying the main effect's result. It is particularly
	 * useful for scenarios where you need to log, monitor, or perform additional
	 * actions depending on whether the effect succeeded or failed.
	 *
	 * When the effect succeeds, the `onSuccess` handler is executed with the
	 * success value. When the effect fails, the `onFailure` handler is executed
	 * with the failure value. Both handlers can include side effects such as
	 * logging or analytics, and neither modifies the original effect's output.
	 *
	 * If either the success or failure handler fails, the overall effect will also
	 * fail.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect, Random, Console } from "effect"
	 *
	 * // Simulate a task that might fail
	 * const task = Effect.filterOrFail(
	 *   Random.nextRange(-1, 1),
	 *   (n) => n >= 0,
	 *   () => "random number is negative"
	 * )
	 *
	 * // Use tapBoth to log both success and failure outcomes
	 * const tapping = Effect.tapBoth(task, {
	 *   onFailure: (error) => Console.log(`failure: ${error}`),
	 *   onSuccess: (randomNumber) =>
	 *     Console.log(`random number: ${randomNumber}`)
	 * })
	 *
	 * Effect.runFork(tapping)
	 * // Example Output:
	 * // failure: random number is negative
	 * ```
	 *
	 * @since 2.0.0
	 * @category Sequencing
	 */
	<E, X, E2, R2, A, X1, E3, R3>(options: {
		readonly onFailure: (e: NoInfer<E>) => Effect.Effect<X, E2, R2>;
		readonly onSuccess: (a: NoInfer<A>) => Effect.Effect<X1, E3, R3>;
	}): <R>(
		self: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | E2 | E3, R2 | R3 | R>;
	/**
	 * Allows you to inspect both success and failure outcomes of an effect and
	 * perform side effects for each.
	 *
	 * **Details**
	 *
	 * This function enables you to handle both success and failure cases
	 * separately, without modifying the main effect's result. It is particularly
	 * useful for scenarios where you need to log, monitor, or perform additional
	 * actions depending on whether the effect succeeded or failed.
	 *
	 * When the effect succeeds, the `onSuccess` handler is executed with the
	 * success value. When the effect fails, the `onFailure` handler is executed
	 * with the failure value. Both handlers can include side effects such as
	 * logging or analytics, and neither modifies the original effect's output.
	 *
	 * If either the success or failure handler fails, the overall effect will also
	 * fail.
	 *
	 * **Example**
	 *
	 * ```ts
	 * import { Effect, Random, Console } from "effect"
	 *
	 * // Simulate a task that might fail
	 * const task = Effect.filterOrFail(
	 *   Random.nextRange(-1, 1),
	 *   (n) => n >= 0,
	 *   () => "random number is negative"
	 * )
	 *
	 * // Use tapBoth to log both success and failure outcomes
	 * const tapping = Effect.tapBoth(task, {
	 *   onFailure: (error) => Console.log(`failure: ${error}`),
	 *   onSuccess: (randomNumber) =>
	 *     Console.log(`random number: ${randomNumber}`)
	 * })
	 *
	 * Effect.runFork(tapping)
	 * // Example Output:
	 * // failure: random number is negative
	 * ```
	 *
	 * @since 2.0.0
	 * @category Sequencing
	 */
	<A, E, R, X, E2, R2, X1, E3, R3>(
		self: Effect.Effect<A, E, R>,
		options: {
			readonly onFailure: (e: E) => Effect.Effect<X, E2, R2>;
			readonly onSuccess: (a: A) => Effect.Effect<X1, E3, R3>;
		},
	): Effect.Effect<A, E | E2 | E3, R | R2 | R3>;
} = dual<
	<E, X, E2, R2, A, X1, E3, R3>(options: {
		readonly onFailure: (e: Types.NoInfer<E>) => Effect.Effect<X, E2, R2>;
		readonly onSuccess: (a: Types.NoInfer<A>) => Effect.Effect<X1, E3, R3>;
	}) => <R>(
		self: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | E2 | E3, R | R2 | R3>,
	<A, E, R, X, E2, R2, X1, E3, R3>(
		self: Effect.Effect<A, E, R>,
		options: {
			readonly onFailure: (e: E) => Effect.Effect<X, E2, R2>;
			readonly onSuccess: (a: A) => Effect.Effect<X1, E3, R3>;
		},
	) => Effect.Effect<A, E | E2 | E3, R | R2 | R3>
>(2, (self, { onFailure, onSuccess }) =>
	Effect.matchCauseEffect(self, {
		onFailure: (cause) => {
			const either = Cause.filterInterruptors(cause);
			switch (either._tag) {
				case "Failure": {
					return zipRight(
						onFailure(either.failure as any),
						Effect.failCause(cause),
					);
				}
				case "Success": {
					return Effect.failCause(cause);
				}
			}
		},
		onSuccess: (a) => Effect.as(onSuccess(a as any), a),
	}),
);

export const tapBothLogWithLevel: (
	level: LogLevel.Severity,
) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =
	(level: LogLevel.Severity) => (effect) =>
		effect.pipe(
			Effect.flatMap((a) => {
				const result =
					typeof a === "string" && a
						? JSON.stringify(a)
						: a === null || a === undefined
							? String(a)
							: typeof a === "function"
								? a.name
									? `[Function ${a.name}]`
									: `<function>`
								: a;
				return Effect.logWithLevel(level)("success").pipe(
					Effect.annotateLogs("result", result),
					Effect.as(a),
				);
			}),
			Effect.tapError((e) =>
				Effect.logError("failed").pipe(
					Effect.annotateLogs("catch", e),
					Effect.flatMapEager(() => Effect.fail(e)),
				),
			),
		);

export function withLogLevelAndSpan(
	level: LogLevel.Severity,
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return <T, E, R>(
		eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
	): Effect.Effect<T, E, R> => {
		// console.log("logWithLevel", level._tag, span, ...messages)
		return Effect.logWithLevel(level)(...messages).pipe(
			Effect.flatMap(isFn<() => Effect.Effect<T, E, R>>(eff) ? eff : () => eff),
			tapBothLogWithLevel(level),
			Effect.onInterrupt(() => Effect.logWithLevel(level)("interrupted")),
			Effect.withLogSpan(span),
		);
	};
}

export function withLogAndSpan(
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return withLogLevelAndSpan(LogLevel.Info, span, ...messages);
}

export function withLogTraceAndSpan(
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return withLogLevelAndSpan(LogLevel.Trace, span, ...messages);
}

export function withLogFatalAndSpan(
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return withLogLevelAndSpan(LogLevel.Fatal, span, ...messages);
}

export function withLogDebugAndSpan(
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return withLogLevelAndSpan(LogLevel.Debug, span, ...messages);
}

export function withLogErrorAndSpan(
	span: string,
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return withLogLevelAndSpan(LogLevel.Error, span, ...messages);
}

export function allowLog(
	level: LogLevel.LogLevel = LogLevel.None,
): Effect.Effect<boolean, never, never> {
	return currentMinimumLogLevel
		.asEffect()
		.pipe(
			Effect.map(
				(minimumLogLevel) =>
					!LogLevel.isGreaterThan(
						minimumLogLevel,
						isStr(level) ? LogLevel.fromLiteral(level) : level,
					),
			),
		);
}

export function whenAllowLog<A, E, R>(
	f: () => Effect.Effect<A, E, R>,
	level: LogLevel.LogLevel = LogLevel.None,
): Effect.Effect<A | null, E, R> {
	return Effect.flatMap(allowLog(level), (allow) =>
		allow ? f() : Effect.succeed(null),
	);
}

whenAllowLog.Trace = <A, E, R>(
	f: () => Effect.Effect<A, E, R>,
): Effect.Effect<A | null, E, R> => whenAllowLog(f, LogLevel.Trace);
whenAllowLog.Debug = <A, E, R>(
	f: () => Effect.Effect<A, E, R>,
): Effect.Effect<A | null, E, R> => whenAllowLog(f, LogLevel.Debug);
whenAllowLog.Info = <A, E, R>(
	f: () => Effect.Effect<A, E, R>,
): Effect.Effect<A | null, E, R> => whenAllowLog(f, LogLevel.Info);
whenAllowLog.All = <A, E, R>(
	f: () => Effect.Effect<A, E, R>,
): Effect.Effect<A | null, E, R> => whenAllowLog(f, LogLevel.All);
whenAllowLog.Warn = <A, E, R>(
	f: () => Effect.Effect<A, E, R>,
): Effect.Effect<A | null, E, R> => whenAllowLog(f, LogLevel.Warning);

export function allowLogTrace(): Effect.Effect<boolean, never, never> {
	return allowLog(LogLevel.Trace);
}

export function allowLogInfo(): Effect.Effect<boolean, never, never> {
	return allowLog(LogLevel.Info);
}

export function withLogTrace(
	...messages: any[]
): <T, E, R>(
	eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
) => Effect.Effect<T, E, R> {
	return <T, E, R>(
		eff: Effect.Effect<T, E, R> | (() => Effect.Effect<T, E, R>),
	) => {
		return Effect.logTrace(...messages).pipe(
			Effect.andThen(eff as () => Effect.Effect<T, E, R>),
			tapBoth({
				onFailure(e) {
					return Effect.logError(e);
				},
				onSuccess(e) {
					return Effect.logTrace("result:", e);
				},
			}),
		);
	};
}

export type BatchOr<T> = T | T[];
export function withBatchHandle<
	F extends (args: any) => Effect.Effect<any, any, any>,
	Args extends Parameters<F>,
	A extends Effect.Success<ReturnType<F>>,
	E extends Effect.Error<ReturnType<F>>,
	R extends Effect.Services<ReturnType<F>>,
>(
	fn: F,
): (
	...args: {
		[K in keyof Args]: BatchOr<Args[K]>;
	}
) => Effect.Effect<void, E, R> {
	return (args: Args | Args[]) =>
		args instanceof Array
			? Effect.all(
					args.map((args: Args) => fn(args)),
					{},
				).pipe(Effect.asVoid)
			: fn(args).pipe(Effect.asVoid);
}

export function fromAbortSignal<Reason = any>(
	abortSignal: AbortSignal,
): Effect.Effect<Reason> {
	return Effect.callback<Reason>((resolve) =>
		abortSignal.addEventListener("abort", () =>
			resolve(Effect.succeed(abortSignal.reason as Reason)),
		),
	);
}

export function fromOptionOrElse<A, A2, E>(
	option: Option.Option<A>,
	orElse: () => Effect.Effect<A2, E>,
): Effect.Effect<A | A2, E>;
export function fromOptionOrElse<A>(
	option: Option.Option<A>,
): Effect.Effect<A, Cause.NoSuchElementException>;
export function fromOptionOrElse<A>(
	option: Option.Option<A>,
	orElse?: any,
): Effect.Effect<A, Cause.NoSuchElementException> {
	return option.pipe(
		Option.match({
			onNone:
				orElse ??
				(() => Effect.fail(new Cause.NoSuchElementException("Option is None"))),
			onSome: (a) => Effect.succeed(a),
		}),
	);
}

/**
 *
 * @param scope
 * @returns
 * @see {@link extend}
 */
export function provideScope(
	scope: Scope.Scope,
): <A, E, R>(
	self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E, Exclude<R, Scope.Scope>> {
	return Scope.provide(scope);
}

export function datetime<A extends DateTime.DateTime.Input>(
	datetime?: A,
	defaults?: () => DateTime.DateTime,
): Effect.Effect<DateTime.DateTime> {
	return Option.fromNullable(datetime).pipe(
		Option.flatMap((time) => DateTime.makeZoned(time, { timeZone: localZone })),
		(eff) =>
			fromOptionOrElse(
				eff,
				defaults ? () => Effect.succeed(defaults()) : () => DateTime.now,
			),
	);
}
const localZone = DateTime.zoneMakeLocal();

export function annotateLogsWith<T extends Record<string, any>>(
	values: T,
	selectKeys?: (keyof T | (string & {}))[],
): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> {
	return Effect.annotateLogs(
		selectKeys?.length ? pick(values, selectKeys) : values,
	);
}
