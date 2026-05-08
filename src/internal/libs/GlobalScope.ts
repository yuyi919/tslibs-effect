import { pureMemoize } from "@yuyi919/shared-proto/Functions";
import * as Context from "../../core/context";
import * as Eff from "../../core/effect";
import * as Layer from "../../core/layer";
import * as Scope from "../../Scope";
import { Memoize } from "../utils/decorators";

const _defaultExecutionStrategy: "sequential" | "parallel" = "sequential";
export class GlobalScope extends Eff.Service<GlobalScope>()(
  "~/tslibs/GlobalScope",
  {
    accessors: true,
    effect: pureMemoize(
      (
        executionStrategy:
          | "sequential"
          | "parallel" = _defaultExecutionStrategy,
      ) =>
        Eff.gen(function* () {
          yield* Eff.logDebug("GlobalScope initial");
          const memoize: Layer.MemoMap = GlobalScope._memoMap; //(GlobalScope._mempmap ??= yield* Eff.Layer.makeMemoMap);
          const scope = yield* Scope.make(
            executionStrategy,
          ) as Eff.T<Scope.Scope>;
          yield* Scope.addFinalizer(
            scope,
            Eff.logDebug("GlobalScope addFinalizer"),
          );

          return {
            get: scope,
            memoMap: memoize,
            // provide: Eff.provideService(Eff.Scope, yield* GlobalScope.get)
          };
        }),
      {
        key: (executionStrategy = _defaultExecutionStrategy) =>
          executionStrategy,
      },
    ),
  },
) {
  static _defaultExecutionStrategy: "sequential" | "parallel" =
    _defaultExecutionStrategy;

  @Memoize
  static get _memoMap(): Layer.MemoMap {
    return Eff.runSync(Layer.makeMemoMap);
  }

  static provideScopeWith =
    <A, E, R>(globalScope: GlobalScope) =>
    (eff: Eff.T<A, E, R>) =>
      Eff.provideService(eff, Scope.Scope, globalScope.get);

  static AliveScoped: Layer.Layer<Scope.Scope, never, GlobalScope> =
    Layer.flatMap(Layer.context<GlobalScope>(), (ctx) =>
      Layer.succeed(Scope.Scope, ctx.pipe(Context.get(GlobalScope)).get),
    );

  static ScopeAlive = (
    executionStrategy?: "sequential" | "parallel" | undefined,
  ) =>
    Layer.flatMap(Layer.context<GlobalScope>(), (ctx) =>
      Layer.succeed(Scope.Scope, ctx.pipe(Context.get(GlobalScope)).get),
    ).pipe(Layer.provideMerge(this.Default(executionStrategy)));

  static scoped = <A, E, R>(
    eff: Eff.T<A, E, R>,
  ): Eff.Effect<A, E, GlobalScope | Exclude<R, Scope.Scope>> =>
    Eff.provide(eff, this.AliveScoped);

  /** @internal */
  static launch = <RIn, E, ROut>(
    layer: Layer.Layer<ROut, E, RIn>,
  ): Eff.Effect<never, E, RIn | GlobalScope> =>
    Eff.scoped(
      Eff.zipRight(
        GlobalScope.pipe(
          Eff.flatMap(({ memoMap, get }) =>
            Layer.buildWithMemoMap(layer, memoMap, get),
          ),
        ),
        Eff.never,
      ),
    );

  static globalAlive = <A, E, R>(
    layer: Layer.Layer<A, E, R>,
  ): Layer.Layer<A, E, GlobalScope | R> =>
    Layer.effectContext(
      GlobalScope.pipe(
        Eff.flatMap(({ memoMap, get }) =>
          Layer.buildWithMemoMap(layer, memoMap, get),
        ),
      ),
    );

  static provideGlobalAlive<A, E, R>(
    layer: Layer.Layer<A, E, R>,
  ): Layer.Layer<A | GlobalScope, E, Exclude<R, GlobalScope>> {
    return layer.pipe(
      GlobalScope.globalAlive,
      Layer.provideMerge(GlobalScope.Default()),
    );
  }
}
