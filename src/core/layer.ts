import { pureMemoize } from "@yuyi919/shared-proto/Functions";
import { isStr } from "@yuyi919/shared-proto/JsTypes";
import { Effect } from "effect";
import type { MemoMap } from "effect/Layer";
import * as Layer from "effect/Layer";
import type { Scope } from "effect/Scope";
import { deepAssign } from "./_helper";
import type * as Context from "./context";

export class LayerHelper<ROut, E = never, RIn = never> {
	constructor(public layer: Layer.Layer<ROut, E, RIn>) {}
	provide(): <A, E1, R>(
		self: Effect.Effect<A, E1, R>,
	) => Effect.Effect<A, E | E1, RIn | Exclude<R, ROut>>;
	provide<A, E1, R>(
		self: Effect.Effect<A, E1, R>,
	): Effect.Effect<A, E | E1, RIn | Exclude<R, ROut>>;
	provide<A, E1, R>(effect?: Effect.Effect<A, E1, R>): any {
		return effect
			? Effect.provide(effect, this.layer)
			: Effect.provide(this.layer);
	}

	provideMerge(): <A, E1, R>(
		self: Layer.Layer<A, E1, R>,
	) => Layer.Layer<A, E | E1, RIn | Exclude<R, ROut>>;
	provideMerge<A, E1, R>(
		self: Layer.Layer<A, E1, R>,
	): Layer.Layer<A, E | E1, RIn | Exclude<R, ROut>>;
	provideMerge<A, E1, R>(effect?: Layer.Layer<A, E1, R>): any {
		return effect
			? Layer.provideMerge(effect, this.layer)
			: Layer.provideMerge(this.layer);
	}

	catchWithUnknown(msg = "Unknown"): Layer.Layer<ROut, E, RIn> {
		return this.layer.pipe(
			Layer.catchCause(() => {
				throw new Error(msg);
			}),
		) as Layer.Layer<ROut, E, RIn>;
	}

	optional() {
		return this.layer.pipe(Layer.catchCause(() => Layer.empty));
	}
}

export type LayerWithHelper<ROut, E, RIn> = Layer.Layer<ROut, E, RIn> &
	LayerHelper<ROut, E, RIn>;

export const withHelper = <ROut, E = never, RIn = never>(
	layer: Layer.Layer<ROut, E, RIn>,
): LayerWithHelper<ROut, E, RIn> => deepAssign(layer, new LayerHelper(layer));

/**
 * 将`Layer<A>`转换为`Effect<Context<A>>`，通过MemoMap在Scope实现记忆
 */
export const buildMemoized: <A, E = never, R = never>(
	layer: Layer.Layer<A, E, R>,
	id?: any,
) => Effect.Effect<Context.Context<A>, E, R | Scope> = pureMemoize(
	function toContextWithScope<A, E, R>(
		layer: Layer.Layer<A, E, R>,
		_id?: any,
	): Effect.Effect<Context.Context<A>, E, R | Scope> {
		return Effect.service(
			Layer.CurrentMemoMap as unknown as Context.Reference<MemoMap>,
		).pipe(
			Effect.flatMap((_memoMap) =>
				Effect.scopedWith((_scope) =>
					Layer.buildWithMemoMap(layer, _memoMap, _scope),
				),
			),
		);
	},
	{
		key(layer, id) {
			return id ?? layer;
		},
	},
);

/**
 * 根据指定效果构造一个层，并丢弃其输出。
 * 然后构建该层并使用它直到它被中断。这在以下情况下很有用： 你的整个应用程序是一个层，例如 HTTP 服务器。
 */
export function launchEffect<A, E, R>(
	layer: Effect.Effect<A, E, R>,
	name?: string,
): Effect.Effect<never, E, R>;
export function launchEffect(
	name: string,
): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<never, E, R>;
export function launchEffect<A, E, R>(layer: Effect.Effect<A, E, R> | string) {
	if (isStr(layer)) {
		const name = layer;
		return (layer: Effect.Effect<A, E, R>) =>
			Layer.launch(Layer.effectDiscard(layer).pipe(Layer.withSpan(name)));
	}
	return Layer.launch(Layer.effectDiscard(layer));
}

export * from "effect/Layer";
export {
	type Layer as t,
	unwrap as unwrapEffect,
} from "effect/Layer";

/**
 * @internal
 */
export const LayerTypeId = "~effect/Layer";
export type LayerTypeId = typeof LayerTypeId;

export const context = <R>() => Layer.effectContext(Effect.context<R>());
