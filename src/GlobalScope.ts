import * as Eff from "./effect-next";
import { Scope } from "./Scope";

export class GlobalScope extends Eff.Service<GlobalScope>()(
  "~/tslibs/GlobalScope",
  {
    accessors: true,
    effect: (executionStrategy: "sequential" | "parallel" = "parallel") =>
      Eff.gen(function* () {
        yield* Eff.logDebug("GlobalScope initial");
        const memoize: Eff.Layer.MemoMap = GlobalScope._memoMap; //(GlobalScope._mempmap ??= yield* Eff.Layer.makeMemoMap);
        // GlobalScope._mempmap = memoize
        const scope = yield* Eff.Scope.make(
          executionStrategy
        ) as Eff.T<Eff.Scope>;
        yield* Eff.Scope.addFinalizer(
          scope,
          Eff.logDebug("GlobalScope addFinalizer")
        );

        return {
          get: scope,
          memoMap: memoize,
          // provide: Eff.provideService(Eff.Scope, yield* GlobalScope.get)
        };
      }),
  }
) {
  static _memoMap: Eff.Layer.MemoMap = Eff.runSync(Eff.Layer.makeMemoMap);
  static provideScopeWith =
    <A, E, R>(globalScope: GlobalScope) =>
    (eff: Eff.T<A, E, R>) =>
      Eff.provideService(eff, Eff.Scope.Scope, globalScope.get);

  static AliveScoped: Eff.Layer<Eff.Scope, never, GlobalScope> =
    Eff.Layer.flatMap(Eff.Layer.context<GlobalScope>(), (ctx) =>
      Eff.Layer.succeed(Scope, ctx.pipe(Eff.Context.get(GlobalScope)).get)
    );

  static scoped = <A, E, R>(
    eff: Eff.T<A, E, R>
  ): Eff.Effect<A, E, GlobalScope | Exclude<R, Eff.Scope>> =>
    Eff.provide(eff, this.AliveScoped);

  /** @internal */
  static launch = <RIn, E, ROut>(
    layer: Eff.Layer<ROut, E, RIn>
  ): Eff.Effect<never, E, RIn | GlobalScope> =>
    Eff.scoped(
      Eff.zipRight(
        GlobalScope.pipe(
          Eff.flatMap(({ memoMap, get }) =>
            Eff.Layer.buildWithMemoMap(layer, memoMap, get)
          )
        ),
        Eff.never
      )
    );

  static globalAlive = <A, E, R>(
    layer: Eff.Layer<A, E, R>
  ): Eff.Layer<A, E, GlobalScope | R> =>
    Eff.Layer.effectContext(
      GlobalScope.pipe(
        Eff.flatMap(({ memoMap, get }) =>
          Eff.Layer.buildWithMemoMap(layer, memoMap, get)
        )
      )
    );

  static provideGloablAlive<A, E, R>(
    layer: Eff.Layer<A, E, R>
  ): Eff.Layer<A | GlobalScope, E, Exclude<R, GlobalScope>> {
    return layer.pipe(
      GlobalScope.globalAlive,
      Eff.Layer.provideMerge(GlobalScope.Default())
    );
  }
}
