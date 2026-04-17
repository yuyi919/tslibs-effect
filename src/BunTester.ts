/**
 * Minimal Effect test wrapper for Bun's native test runner.
 *
 * This provides `it.effect()` and `it.scoped()` that work with `bun test`, bun's native test runner,
 * similar to `@effect/vitest`. When the official `@effect/bun-test` package
 * is released, replace this with that package.
 *
 * @see https://github.com/Effect-TS/effect/pull/5973
 *
 * @example
 * ```ts
 * import { describe, expect, it } from "./bun-effect"
 * import { Effect, Layer } from "effect"
 *
 * describe("my test", () => {
 *   it.effect("runs an effect", () =>
 *     Effect.gen(function* () {
 *       const result = yield* someEffect
 *       expect(result).toBe(expected)
 *     }).pipe(Effect.provide(TestLayer))
 *   )
 *
 *   it.scoped("runs a scoped effect", () =>
 *     Effect.gen(function* () {
 *       const resource = yield* acquireResource
 *       expect(resource).toBeDefined()
 *     })
 *   )
 *
 *   it.effect.skip("skipped test", () => Effect.succeed(1))
 *   it.effect.only("only this test", () => Effect.succeed(1))
 * })
 * ```
 */

import * as bunTest from "bun:test";
import { afterAll, beforeAll, describe, expect } from "bun:test";
import { isJsObject } from "@yuyi919/shared-proto/JsTypes";
import {
	Cause,
	Duration,
	Exit,
	flow,
	Layer,
	pipe,
	Schedule,
	Schema,
	Scope,
	TxRef as TRef,
} from "effect";
import type { NonEmptyArray } from "effect/Array";
import { isObject } from "effect/Predicate";

export { default as assert } from "node:assert";
export { afterAll, beforeAll, describe, expect };

import * as FC from "effect/testing/FastCheck";
import * as TestClock from "effect/testing/TestClock";
import * as TestConsole from "effect/testing/TestConsole";
import * as Effect from "./Effect";

declare namespace V {
	export type TestContext = {
		signal?: AbortSignal;
	};
	export type TestAPI = bunTest.Test<[]>;
	export type TestOptions = bunTest.TestOptions;
}
const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer());
const runPromise: <E, A>(
	_: Effect.Effect<A, E>,
	ctx?: V.TestContext,
) => Promise<A> = Effect.fnUntraced(
	function* <E, A>(effect: Effect.Effect<A, E>, _ctx?: V.TestContext) {
		const exit = yield* Effect.exit(effect);
		if (Exit.isFailure(exit)) {
			const errors = Cause.prettyErrors(exit.cause);
			for (let i = 0; i < errors.length; i++) {
				yield* Effect.logError(errors[i]);
			}
		}
		return yield* exit;
	},
	(effect, _, ctx) =>
		Effect.runPromise(effect, {
			signal: ctx?.signal,
		}),
);
type TestServices = TestContext;
/** @internal */
export type TestContext = TestConsole.TestConsole | TestClock.TestClock;

/** @internal */
const testOptions = (timeout?: number | bunTest.TestOptions) =>
	typeof timeout === "number" ? { timeout } : (timeout ?? {});

/** @internal */
const makeTester = <R>(
	mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>,
	it: V.TestAPI = bunTest.it,
): BunTester.Tester<R> => {
	const run = <A, E, TestArgs extends Array<unknown>>(
		ctx: V.TestContext & object,
		args: TestArgs,
		self: BunTester.TestFunction<A, E, R, TestArgs>,
	) =>
		pipe(
			Effect.suspend(() => self(...args)),
			mapEffect,
			runTestWith(ctx),
		);

	const f: BunTester.Test<R> = (name, self, timeout) =>
		it(name, (...ctx) => run(ctx, [{}], self), testOptions(timeout));

	const skip: BunTester.Tester<R>["only"] = (name, self, timeout) =>
		it.skip(name, (...ctx) => run(ctx, [{}], self), testOptions(timeout));

	const skipIf: BunTester.Tester<R>["skipIf"] =
		(condition) => (name, self, timeout) =>
			it.skipIf(condition as boolean)(
				name,
				(...ctx) => run(ctx, [{}], self),
				testOptions(timeout),
			);

	const runIf: BunTester.Tester<R>["runIf"] =
		(condition) => (name, self, timeout) =>
			it.if(condition as boolean)(
				name,
				(...ctx) => run(ctx, [{}], self),
				testOptions(timeout),
			);

	const only: BunTester.Tester<R>["only"] = (name, self, timeout) =>
		it.only(name, (...ctx) => run(ctx, [{}], self), testOptions(timeout));

	const each: BunTester.Tester<R>["each"] = (cases) => (name, self, timeout) =>
		it.each<any>(cases as [unknown, ...unknown[]])(
			name,
			(args, ctx: any) => run(ctx, [args], self) as any,
			testOptions(timeout),
		);

	const fails: BunTester.Tester<R>["fails"] = (name, self, timeout) =>
		bunTest.it.failing(
			name,
			(...ctx) => run(ctx, [{}], self),
			testOptions(timeout),
		);

	const prop: BunTester.Tester<R>["prop"] = (
		name,
		arbitraries,
		self,
		timeout,
	) => {
		if (Array.isArray(arbitraries)) {
			const arbs = arbitraries.map((arbitrary) => {
				if (Schema.isSchema(arbitrary)) {
					return Schema.toArbitrary(arbitrary);
				}
				return arbitrary as FC.Arbitrary<any>;
			});
			return it(
				name,
				(ctx) =>
					// @ts-expect-error
					FC.assert(
						// @ts-expect-error
						FC.asyncProperty(...arbs, (...as) =>
							run(ctx, [as as any, {}], self),
						),
						isObject(timeout) ? timeout?.fastCheck : {},
					),
				testOptions(timeout),
			);
		}

		const arbs = FC.record(
			Object.keys(arbitraries).reduce(
				(result, key) => {
					const arb: any = arbitraries[key];
					if (Schema.isSchema(arb)) {
						result[key] = Schema.toArbitrary(arb);
					}
					result[key] = arb;
					return result;
				},
				{} as Record<string, FC.Arbitrary<any>>,
			),
		);

		return it(
			name,
			(ctx) =>
				// @ts-expect-error
				FC.assert(
					FC.asyncProperty(arbs, (...as) =>
						// @ts-expect-error
						run(ctx, [as[0] as any, ctx], self),
					),
					isObject(timeout) ? timeout?.fastCheck : {},
				),
			testOptions(timeout),
		);
	};

	return Object.assign(f, { skip, skipIf, runIf, only, each, fails, prop });
};

const runTestWith =
	(ctx: V.TestContext) =>
	<E, A>(effect: Effect.Effect<A, E>) =>
		runPromise(effect, ctx);

const runTest = <E, A>(effect: Effect.Effect<A, E>) => runPromise(effect);

const runTestScoped = <E, A>(effect: Effect.Effect<A, E, Scope.Scope>) =>
	runPromise(effect.pipe(Effect.scoped));

export type EffectTester = {
	<A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, never>,
		options?: number | V.TestOptions,
	): void;
	skip: <A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, never>,
		options?: number | V.TestOptions,
	) => void;
	only: <A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, never>,
		options?: number | V.TestOptions,
	) => void;
};

type ScopedTester = {
	<A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, Scope.Scope>,
		options?: number | V.TestOptions,
	): void;
	skip: <A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, Scope.Scope>,
		options?: number | V.TestOptions,
	) => void;
	only: <A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, Scope.Scope>,
		options?: number | V.TestOptions,
	) => void;
};

const makeEffectTest =
	(runner: typeof bunTest.test) =>
	<A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, never>,
		options?: number | V.TestOptions,
	) => {
		const timeout = typeof options === "number" ? options : options?.timeout;
		runner(
			name,
			() => runTest(Effect.gen(fn)),
			timeout ? { timeout } : undefined,
		);
	};

const makeScopedTest =
	(runner: typeof bunTest.test) =>
	<A, E>(
		name: string,
		fn: Effect.EffGenFn<A, E, Scope.Scope>,
		options?: number | V.TestOptions,
	) => {
		const timeout = typeof options === "number" ? options : options?.timeout;
		runner(
			name,
			() => runTestScoped(Effect.gen(fn)),
			timeout ? { timeout } : undefined,
		);
	};

export const gen: EffectTester = Object.assign(makeEffectTest(bunTest.test), {
	skip: makeEffectTest(bunTest.test.skip),
	only: makeEffectTest(bunTest.test.only),
});

export const scopedGen: ScopedTester = Object.assign(
	makeScopedTest(bunTest.test),
	{
		skip: makeScopedTest(bunTest.test.skip),
		only: makeScopedTest(bunTest.test.only),
	},
);

/** @internal */
export const waitFor = <A>(
	received: TRef.TxRef<A> | Effect.Effect<A, any, Effect.Transaction>,
	f: (a: A) => any,
) =>
	Effect.tx(
		Effect.gen(function* () {
			const current = yield* Effect.isEffect(received)
				? received
				: TRef.get(received);
			yield* Effect.try({
				try: () => f(current),
				catch: () => false,
			}).pipe(Effect.catch(() => Effect.txRetry));
		}),
	);

/** @internal */
export const flakyTest = <A, E, R>(
	self: Effect.Effect<A, E, R | Scope.Scope>,
	timeout: Duration.Input = Duration.seconds(30),
) =>
	pipe(
		self,
		Effect.scoped,
		Effect.sandbox,
		Effect.retry(
			pipe(
				Schedule.recurs(10),
				Schedule.while((_) =>
					Effect.succeed(
						Duration.isLessThanOrEqualTo(
							Duration.fromInputUnsafe(_.elapsed),
							Duration.fromInputUnsafe(timeout),
						),
					),
				),
			),
		),
		Effect.orDie,
	);

/** @internal */
export const makeMethods = (it: V.TestAPI): BunTester.Methods =>
	Object.assign(it, {
		effect: makeTester<Scope.Scope>(
			flow(Effect.scoped, Effect.provide(TestEnv)),
			it,
		),
		live: makeTester<Scope.Scope>(Effect.scoped, it),
		flakyTest,
		layer,
		prop,
	});

/** @internal */
export const prop: BunTester.Methods["prop"] = (
	name,
	arbitraries,
	self,
	timeout,
) => {
	if (Array.isArray(arbitraries)) {
		const arbs = arbitraries.map((arbitrary) => {
			if (Schema.isSchema(arbitrary)) {
				throw new Error("Schemas are not supported yet");
			}
			return arbitrary as FC.Arbitrary<any>;
		});
		return bunTest.it(
			name,
			(_) =>
				// @ts-expect-error
				FC.assert(
					FC.property(...(arbs as NonEmptyArray<FC.Arbitrary<any>>), (...as) =>
						self(as as any, {}),
					),
					isObject(timeout) ? timeout?.fastCheck : {},
				),
			testOptions(timeout),
		);
	}

	const arbs: FC.Arbitrary<object> = FC.record(
		Object.keys(arbitraries).reduce(
			(result, key) => {
				const arb: any = arbitraries[key];
				if (Schema.isSchema(arb)) {
					throw new Error("Schemas are not supported yet");
				}
				result[key] = arb;
				return result;
			},
			{} as Record<string, FC.Arbitrary<any>>,
		),
	);

	return bunTest.it(
		name,
		(_) =>
			FC.assert<object>(
				FC.property(arbs, (as) => self(as as any, {})),
				isJsObject(timeout) ? (timeout?.fastCheck as FC.Parameters<any>) : {},
			),
		testOptions(timeout),
	);
};

/** @internal */
export const layer =
	<R, E>(
		layer_: Layer.Layer<R, E>,
		options?: {
			readonly memoMap?: Layer.MemoMap;
			readonly timeout?: Duration.Input;
			readonly excludeTestServices?: boolean;
		},
	): {
		(f: (it: BunTester.MethodsNonLive<R>) => void): void;
		(name: string, f: (it: BunTester.MethodsNonLive<R>) => void): void;
	} =>
	(
		...args:
			| [name: string, f: (it: BunTester.MethodsNonLive<R>) => void]
			| [f: (it: BunTester.MethodsNonLive<R>) => void]
	) => {
		const excludeTestServices = options?.excludeTestServices ?? false;
		const withTestEnv = excludeTestServices
			? (layer_ as Layer.Layer<R, E>)
			: Layer.provideMerge(layer_, TestEnv);
		const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap);
		const scope = Effect.runSync(Scope.make());
		const contextEffect = Layer.buildWithMemoMap(
			withTestEnv,
			memoMap,
			scope,
		).pipe(Effect.orDie, Effect.cached, Effect.runSync);

		const makeIt = (it: V.TestAPI): BunTester.MethodsNonLive<R> =>
			Object.assign(it, {
				effect: makeTester<R | Scope.Scope>(
					(effect) =>
						Effect.flatMap(contextEffect, (context) =>
							effect.pipe(Effect.scoped, Effect.provide(context)),
						),
					it,
				),
				prop,
				flakyTest,
				layer<R2, E2>(
					nestedLayer: Layer.Layer<R2, E2, R>,
					options?: {
						readonly timeout?: Duration.Input;
					},
				) {
					return layer(Layer.provideMerge(nestedLayer, withTestEnv), {
						...options,
						memoMap,
						excludeTestServices,
					});
				},
			});

		if (args.length === 1) {
			bunTest.beforeAll(
				() => runPromise(Effect.asVoid(contextEffect)),
				options?.timeout
					? Duration.toMillis(Duration.fromInputUnsafe(options.timeout))
					: undefined,
			);
			bunTest.afterAll(
				() => runPromise(Scope.close(scope, Exit.void)),
				options?.timeout
					? Duration.toMillis(Duration.fromInputUnsafe(options.timeout))
					: undefined,
			);
			return args[0](makeIt(bunTest.it));
		}

		return bunTest.describe(args[0], () => {
			bunTest.beforeAll(
				() => runPromise(Effect.asVoid(contextEffect)),
				options?.timeout
					? Duration.toMillis(Duration.fromInputUnsafe(options.timeout))
					: undefined,
			);
			bunTest.afterAll(
				() => runPromise(Scope.close(scope, Exit.void)),
				options?.timeout
					? Duration.toMillis(Duration.fromInputUnsafe(options.timeout))
					: undefined,
			);
			return args[1](makeIt(bunTest.it));
		});
	};

export const it = Object.assign(bunTest.test, {
	gen: gen,
	scopedGen: scopedGen,
	effect: makeTester<Scope.Scope>(
		flow(Effect.scoped, Effect.provide(TestEnv)),
		bunTest.it,
	),
	live: makeTester<Scope.Scope>(Effect.scoped, bunTest.it),
	layer,
});

/** */

/**
 * @since 1.0.0
 */
export declare namespace BunTester {
	/**
	 * @since 1.0.0
	 */
	export type Arbitraries =
		| Array<Schema.Schema<any> | FC.Arbitrary<any>>
		| { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> };

	/**
	 * @since 1.0.0
	 */
	export type TestFunction<A, E, R, TestArgs extends Array<any>> = (
		...args: TestArgs
	) => Effect.Effect<A, E, R>;

	/**
	 * @since 1.0.0
	 */
	export type Test<R> = <A, E>(
		name: string,
		self: TestFunction<A, E, R, [V.TestContext]>,
		timeout?: number | V.TestOptions,
	) => void;
	/**
	 * @since 1.0.0
	 */
	export interface Tester<R> extends Test<R> {
		skip: Test<R>;
		skipIf: (condition: unknown) => Test<R>;
		runIf: (condition: unknown) => Test<R>;
		only: Test<R>;
		each: <T>(
			cases: Readonly<[T, ...T[]]>,
		) => <A, E>(
			name: string,
			self: TestFunction<A, E, R, Array<T>>,
			timeout?: number | bunTest.TestOptions,
		) => void;
		fails: Test<R>;

		/**
		 * @since 1.0.0
		 */
		prop: <const Arbs extends Arbitraries, A, E>(
			name: string,
			arbitraries: Arbs,
			self: TestFunction<
				A,
				E,
				R,
				[
					{
						[K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T>
							? T
							: Arbs[K] extends Schema.Schema<infer T>
								? T
								: never;
					},
					V.TestContext,
				]
			>,
			timeout?:
				| number
				| (V.TestOptions & {
						fastCheck?: FC.Parameters<{
							[K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T>
								? T
								: Arbs[K] extends Schema.Schema<infer T>
									? T
									: never;
						}>;
				  }),
		) => void;
	}
	/**
	 * @since 1.0.0
	 */
	export interface MethodsNonLive<R = never> extends V.TestAPI {
		readonly effect: BunTester.Tester<R | Scope.Scope>;
		readonly flakyTest: <A, E, R2>(
			self: Effect.Effect<A, E, R2 | Scope.Scope>,
			timeout?: Duration.Input,
		) => Effect.Effect<A, never, R2>;
		readonly layer: <R2, E>(
			layer: Layer.Layer<R2, E, R>,
			options?: {
				readonly timeout?: Duration.Input;
			},
		) => {
			(f: (it: BunTester.MethodsNonLive<R | R2>) => void): void;
			(name: string, f: (it: BunTester.MethodsNonLive<R | R2>) => void): void;
		};

		/**
		 * @since 1.0.0
		 */
		readonly prop: <const Arbs extends Arbitraries>(
			name: string,
			arbitraries: Arbs,
			self: (
				properties: {
					[K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T>
						? T
						: Arbs[K] extends Schema.Schema<infer T>
							? T
							: never;
				},
				ctx: V.TestContext,
			) => void,
			timeout?:
				| number
				| (V.TestOptions & {
						fastCheck?: FC.Parameters<{
							[K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T>
								? T
								: Arbs[K] extends Schema.Schema<infer T>
									? T
									: never;
						}>;
				  }),
		) => void;
	}

	/**
	 * @since 1.0.0
	 */
	export interface Methods<R = never> extends MethodsNonLive<R> {
		readonly live: BunTester.Tester<Scope.Scope | R>;
		readonly layer: <R2, E>(
			layer: Layer.Layer<R2, E, R>,
			options?: {
				readonly memoMap?: Layer.MemoMap;
				readonly timeout?: Duration.Input;
				readonly excludeTestServices?: boolean;
			},
		) => {
			(f: (it: BunTester.MethodsNonLive<R | R2>) => void): void;
			(name: string, f: (it: BunTester.MethodsNonLive<R | R2>) => void): void;
		};
	}
}
