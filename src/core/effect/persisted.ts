import { unsafeCoerce } from "@yuyi919/shared-proto/Functions";
// import type { PersistedRequest } from "effect/unstable/persistence/Persistence";
import { isPrimitive, toString } from "@yuyi919/shared-proto/JsTypes";
import * as effect from "effect";
import { constTrue, dual, pipe } from "effect/Function";
import { RequestPrototype } from "effect/Request";
import { Persistable } from "effect/unstable/persistence";
import * as PersistedCache from "effect/unstable/persistence/PersistedCache";
import * as Persistence from "effect/unstable/persistence/Persistence";
import { memoize } from "es-toolkit";
import type * as Context from "../context.js";
import type * as Duration from "../duration.js";
import * as Eff from "../effect.js";
import { scopedCacheWith } from "./scopedCache.js";

/**
 * @since 1.0.0
 * @category model
 */
export interface PersistedRequest<R, IE, E, IA, A>
  extends effect.Request.Request<A, E>,
    Persistable.Persistable<
      effect.Schema.Schema<IA>,
      effect.Schema.Schema<IE>
    > {}
export declare namespace PersistedRequest {
  export type Any = effect.Request.Request<any, any> &
    Persistable.Persistable<effect.Schema.Any, effect.Schema.Any>;
}
const DynamicRequest = memoize(
  <P extends effect.Schema.Top, A, E>({
    _id: id,
    _arg: arg,
  }: {
    _id: string;
    _arg: P;
  }) => {
    return class
      extends Persistable.Class<{
        payload: {
          arg: P["Type"];
        };
      }>()("DynamicRequest", {
        primaryKey: (payload) =>
          isPrimitive(payload.arg)
            ? toString(payload.arg)
            : effect.Hash.hash(payload.arg) + "",
        success: effect.Schema.Any.pipe(
          effect.Schema.refine<effect.Schema.Any, A>(unsafeCoerce(constTrue))
        ),
        error: effect.Schema.Any.pipe(
          effect.Schema.refine<effect.Schema.Any, E>(unsafeCoerce(constTrue))
        ),
      })
      implements effect.Request.Request<A, E>
    {
      override get ["~effect/Request"]() {
        return RequestPrototype["~effect/Request"] as any;
      }
    };
    return class DynamicRequest
      extends effect.Request.Class<{ arg: P["Type"] }, A, E>
      implements
        Persistable.Persistable<
          effect.Schema.Schema<A>,
          effect.Schema.Schema<E>
        >
    {
      [effect.PrimaryKey.symbol]() {
        return isPrimitive(this.arg)
          ? toString(this.arg)
          : effect.Hash.hash(this.arg) + "";
      }
      [effect.Hash.symbol]() {
        return effect.Hash.hash(this.arg);
      }
      [Persistable.symbol] = {
        error: effect.Schema.Any.pipe(
          effect.Schema.refine(unsafeCoerce(constTrue))
        ),
        success: effect.Schema.Any.pipe(
          effect.Schema.refine(unsafeCoerce(constTrue))
        ),
      };
    };
  },
  { getCacheKey: (e) => e._id }
);

const _makePersistedBatchFn = <
  F extends (req: any[], ...any: any[]) => Eff.Any<any[]>,
>(
  f: F,
  options: PersistedOptions<any, any, any>
) => {
  type Params = Parameters<F>;
  type P = Params[0][number];
  type A = (Eff.T.Success<ReturnType<F>> & unknown[])[number];
  type E = Eff.T.Error<ReturnType<F>>;
  type R = Eff.T.Context<ReturnType<F>>;

  const Req = DynamicRequest<effect.Schema.Any, A, E>({
    _id: options.storeId,
    _arg: effect.Schema.Any,
  });
  type Req = InstanceType<typeof Req>;
  const prettyReq = effect.Formatter.format; //Pretty.make(Req);
  const PersistenceStorage = getPersistenceStorage<Req>({
    ...options,
    timeToLive: (exit, key) => options.timeToLive(key.arg, exit),
  }).pipe((eff) =>
    scopedCacheWith(eff, "@PersistenceStorage/" + options.storeId)
  );
  const loggerId = options.name ?? options.storeId;
  // const DynamicRequest = Eff.Request.of<Req>();
  const GetBatchedResolver = memoize(
    (otherArgs: any[]) =>
      effect.RequestResolver.make<Req>(
        (reqs) =>
          Eff.gen(function* () {
            const store = yield* PersistenceStorage;
            const handle = yield* batchWithPersistence(
              store,
              (remaining: readonly Req[]) => {
                const exits = (
                  f(
                    remaining.map((req) => req.arg),
                    ...otherArgs
                  ) as Eff.Any<A[]>
                ).pipe(
                  Eff.map((arr) =>
                    effect.Array.map(arr, (res, i) => effect.Exit.succeed(res))
                  ),
                  Eff.tapBefore(() =>
                    Eff.forEach(remaining, (req) =>
                      Eff.logTrace(
                        `[${loggerId}] Request in progress: ` + prettyReq(req)
                      )
                    )
                  ),
                  Eff.tap(() => Eff.logTrace("Request complete"))
                );
                return exits;
              },
              (req, _exit) =>
                Eff.logTrace(
                  `[${loggerId}] Return from cache: ` + prettyReq(req)
                )
            );
            const res = handle(reqs) as Eff.T<void, never, never>;
            return yield* res;
          }).pipe(Eff.withLogSpan("persisted_batch")) as Eff.t<void, never>
      ).pipe(
        options?.memCached
          ? effect.RequestResolver.withCache({
              capacity: 100,
              strategy: "fifo",
            })
          : Eff.succeed,
        Eff.runSync
      ),
    {
      getCacheKey: effect.Hash.array,
    }
  );
  const createReq = (arg: P) => new Req({ arg });
  const Resolver = GetBatchedResolver([]);
  const locally = (arg: P, ...otherArgs: any[]) => {
    return Eff.request(createReq(arg), Resolver);
  };

  return locally;
};

export interface PersistedOptions<P, A, E> {
  name?: string;
  readonly memCached?: boolean;
  readonly storeId: string;
  readonly timeToLive: (
    arg: P,
    exit: effect.Exit.Exit<A, E>
  ) => Duration.DurationInput;
}

export function persistedBatch<
  P,
  A,
  E = never,
  R = never,
  O extends any[] = any[],
>(
  f: (input: P[], ...other: O) => Eff.T<A[], E, R>,
  opt: PersistedOptions<P, A, E>
): (
  request: P,
  ...other: O
) => Eff.Effect<A, E, R | Persistence.Persistence | effect.Scope.Scope> {
  return _makePersistedBatchFn(f, opt);
}
export function persisted<P, A, E = never, R = never, O extends any[] = any[]>(
  f: (input: P, ...other: O) => Eff.T<A, E, R>,
  options: PersistedOptions<P, A, E> & {
    retry?: boolean | effect.Schedule.Schedule<unknown>;
  }
): (
  request: P,
  ...other: O
) => Eff.Effect<A, E, R | Persistence.Persistence | effect.Scope.Scope> {
  const Req = DynamicRequest<effect.Schema.Schema<P>, A, E>({
    _id: options.storeId,
    _arg: effect.Schema.Any,
  });
  const pretyReq = effect.Formatter.format; //Pretty.make(Req);
  type Req = InstanceType<typeof Req>;
  const cache = memoize(
    (other: O) =>
      PersistedCache.make<Req, R>((e: Req) => f(e.arg, ...other), {
        storeId: options.storeId,
        timeToLive: (exit, key) => options.timeToLive(key.arg, exit),
      }).pipe((e) => scopedCacheWith(e, "@PersistedCache/" + options.storeId)),
    {
      getCacheKey: effect.Hash.array,
    }
  );
  return (arg, ...other) => {
    return cache(other).pipe(
      Eff.flatMap((storage) => {
        const req = new Req({ arg });
        return storage.get(req).pipe(
          Eff.tapBefore(() => Eff.logTrace(pretyReq(req))),
          Eff.tapErrorCause(Eff.logDebug),
          options.retry
            ? Eff.retryOrElse(
                options.retry === true
                  ? effect.Schedule.addDelay(effect.Schedule.forever, () =>
                      Eff.succeed("100 millis")
                    )
                  : options.retry,
                () =>
                  f(arg, ...other).pipe(
                    Eff.tapBefore(() =>
                      Eff.logTrace(
                        "[Fallback] Request in progress: " + pretyReq(req)
                      )
                    )
                  )
              )
            : Eff.orElse(() => f(arg, ...other))
        );
      }),
      Eff.withLogSpan("persisted")
    );
  };
}

export function persisted0<P, A, E = never, R = never>(
  f: (input: P) => Eff.T<A, E, R>,
  options: PersistedOptions<P, A, E> & {
    retry?: boolean | effect.Schedule.Schedule<unknown>;
  }
): (
  request: P
) => Eff.Effect<A, E, R | Persistence.Persistence | effect.Scope.Scope> {
  const Req = DynamicRequest<effect.Schema.Schema<P>, A, E>({
    _id: options.storeId,
    _arg: effect.Schema.Any,
  });
  const pretyReq = effect.Formatter.format; //Pretty.make(Req);
  type Req = InstanceType<typeof Req>;
  const cache = PersistedCache.make<Req, R>((e: Req) => f(e.arg), {
    storeId: options.storeId,
    timeToLive: (exit, key) => options.timeToLive(key.arg, exit),
  }).pipe((e) => scopedCacheWith(e, "@PersistedCache/" + options.storeId));
  return (arg) => {
    return cache.pipe(
      Eff.flatMap((store) => {
        const req = new Req({ arg });
        return store.get(req).pipe(
          Eff.tap((_) => Eff.logTrace("returns " + pretyReq(req))),
          Eff.tapErrorCause(Eff.logDebug),
          options.retry
            ? Eff.retryOrElse(
                options.retry === true
                  ? effect.Schedule.addDelay(effect.Schedule.forever, () =>
                      Eff.succeed("100 millis")
                    )
                  : options.retry,
                () =>
                  f(arg).pipe(
                    Eff.tapBefore(() =>
                      Eff.logTrace(
                        "[Fallback] Request in progress: " + pretyReq(req)
                      )
                    )
                  )
              )
            : Eff.orElse(() => f(arg))
        );
      }),
      Eff.withLogSpan("persisted")
    );
  };
}

function getPersistenceStorage<Req extends PersistedRequest.Any>(options: {
  readonly storeId: string;
  readonly timeToLive: Persistable.TimeToLiveFn<Req>;
}) {
  return Eff.gen(function* () {
    // Persistence.BackingPersistence
    return yield* (yield* Persistence.Persistence).make({
      storeId: options.storeId,
      timeToLive: options.timeToLive as any,
    });
  });
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const persistedResolver: {
  /**
   * @since 1.0.0
   * @category combinators
   */
  <Req extends PersistedRequest.Any>(options: {
    readonly storeId: string;
    readonly timeToLive: Persistable.TimeToLiveFn<Req>;
  }): (
    self: effect.RequestResolver.RequestResolver<Req>
  ) => Eff.Effect<
    effect.RequestResolver.RequestResolver<Req>,
    never,
    | Persistence.Persistence
    | effect.Scope.Scope
    | effect.Request.Services<Req>
    | Persistable.SuccessSchema<Req>["DecodingServices"]
    | Persistable.ErrorSchema<Req>["DecodingServices"]
  >;
  /**
   * @since 1.0.0
   * @category combinators
   */
  <Req extends PersistedRequest.Any>(
    self: effect.RequestResolver.RequestResolver<Req>,
    options: {
      readonly storeId: string;
      readonly timeToLive: Persistable.TimeToLiveFn<Req>;
    }
  ): Eff.Effect<
    effect.RequestResolver.RequestResolver<Req>,
    never,
    | Persistence.Persistence
    | effect.Scope.Scope
    | effect.Request.Services<Req>
    | Persistable.SuccessSchema<Req>["DecodingServices"]
    | Persistable.ErrorSchema<Req>["DecodingServices"]
  >;
} = /*@__PURE__*/ dual(
  2,
  <Req extends PersistedRequest.Any>(
    self: effect.RequestResolver.RequestResolver<Req>,
    options: {
      readonly storeId: string;
      readonly timeToLive: Persistable.TimeToLiveFn<Req>;
    }
  ): Eff.Effect<
    effect.RequestResolver.RequestResolver<Req>,
    never,
    | Persistence.Persistence
    | effect.Scope.Scope
    | effect.Request.Services<Req>
    | Persistable.SuccessSchema<Req>["DecodingServices"]
    | Persistable.ErrorSchema<Req>["DecodingServices"]
  > =>
    Eff.gen(function* () {
      const storage = yield* getPersistenceStorage(options);
      const excs = yield* batchWithPersistence(
        storage,
        (remaining: readonly Req[]) => {
          const res = Eff.forEach(remaining, (request) => {
            const e = Eff.exit(Eff.request(request, self));
            return e as Eff.t<
              effect.Request.Result<Req>,
              never,
              effect.Request.Services<Req>
            >;
          });
          return res;
        }
      );
      const resolver: effect.RequestResolver.RequestResolver<Req> =
        effect.RequestResolver.make(excs);
      return resolver;
    }).pipe((eff) => scopedCacheWith(eff, options.storeId))
);

const batchWithPersistence = <
  Req extends PersistedRequest.Any,
  Res extends effect.Request.Result<Req>,
  R,
  E,
>(
  storage: Persistence.PersistenceStore,
  handle: (req: readonly Req[]) => Eff.Effect<Res[], E, R>,
  tapCached?: (req: Req, res: Res) => Eff.Effect<any>
) => {
  return Eff.gen(function* () {
    const context = yield* Eff.context<
      | Persistable.SuccessSchema<Req>["DecodingServices"]
      | Persistable.ErrorSchema<Req>["DecodingServices"]
      | R
    >();
    return (entries: effect.Array.NonEmptyArray<effect.Request.Entry<Req>>) => {
      const noContext = partitionWithPersistence(
        storage,
        entries.map((req) => req.request)
      ).pipe(Eff.provideContext(context)) as Eff.t<
        readonly [
          excluded: Req[],
          satisfying: (readonly [
            Req,
            effect.Request.Result<Req>,
            Persistable.Success<Req>,
          ])[],
        ],
        never
      >;
      return Eff.flatMap(noContext, ([remaining, results]) => {
        const completeCached = Eff.forEach(
          results,
          ([request, result, success], i) =>
            (
              effect.Request.complete(entries[i], result) as Eff.Effect<void>
            ).pipe(
              Eff.tapBefore(() => tapCached?.(request, success) ?? Eff.void)
            ),
          { discard: true }
        );
        const completeUncached =
          remaining.length === 0
            ? Eff.logTrace("No cached request")
            : Eff.sync(() => {
                const indexMap = new Map<number, number>();
                const uniquedReqs: Req[] = [];
                const resIndexes = remaining.map((req: Req) => {
                  const reqHash = effect.Hash.hash(req);
                  const resIndex = indexMap.get(reqHash);
                  if (resIndex === undefined) {
                    const fixedIndex = uniquedReqs.length;
                    indexMap.set(reqHash, fixedIndex);
                    uniquedReqs.push(req);
                    return fixedIndex;
                  }
                  return resIndex;
                });
                return [uniquedReqs, resIndexes] as const;
              }).pipe(
                Eff.flatMap(([uniquedReqs, resIndexes]) => {
                  return pipe(
                    handle(uniquedReqs),
                    Eff.provideContext(context as Context.Context<R>),
                    Eff.tapBefore(() =>
                      Eff.logTrace(
                        "Remaining request count: " + uniquedReqs.length
                      )
                    ),
                    Eff.flatMap((results) =>
                      remaining.length > uniquedReqs.length
                        ? Eff.forEach(
                            resIndexes,
                            (resIndex, reqIndex) => {
                              const request = remaining[reqIndex];
                              const result = results[resIndex];
                              return Eff.zipRight(
                                storage.get(request).pipe(
                                  Eff.andThen((exit) =>
                                    exit
                                      ? effect.Exit.match(exit, {
                                          onSuccess: () => Eff.void,
                                          onFailure: () => set(request, result),
                                        })
                                      : set(request, result)
                                  )
                                ),
                                effect.Request.complete(
                                  entries[reqIndex],
                                  result
                                )
                              ).pipe(Eff.ignoreLogged);
                            },
                            { discard: true }
                          )
                        : Eff.forEach(
                            results,
                            (result, reqIndex) => {
                              const request = remaining[reqIndex];
                              return Eff.zipRight(
                                set(request, result),
                                effect.Request.complete(
                                  entries[reqIndex],
                                  result
                                )
                              );
                            },
                            { discard: true }
                          )
                    ),
                    Eff.withConcurrency(1)
                  );
                })
              );
        return Eff.zipRight(completeCached, completeUncached as Eff.t<void, E>);
      });
    };
  });
  function set(request: Req, result: effect.Request.Result<Req>) {
    return Eff.ignoreLogged(storage.set(request, result)).pipe(
      // Eff.tap(() =>
      //   storage
      //     .get(request)
      //     .pipe(Eff.tap((r) => Eff.log(request[PrimaryKey.symbol](), r))),
      // ),
      Eff.tapErrorCause(Eff.log)
    );
  }
  function partitionWithPersistence<Request extends PersistedRequest.Any>(
    storage: Persistence.PersistenceStore,
    requests: Request[]
  ): Eff.t<
    readonly [
      excluded: Request[],
      satisfying: (readonly [
        Request,
        effect.Request.Result<Request>,
        Persistable.Success<Request>,
      ])[],
    ],
    never,
    | Persistable.SuccessSchema<Request>["DecodingServices"]
    | Persistable.ErrorSchema<Request>["DecodingServices"]
  > {
    return storage
      .getMany<
        Persistable.SuccessSchema<Request>,
        Persistable.ErrorSchema<Request>
      >(requests)
      .pipe(
        Eff.map((exits) =>
          effect.Array.partition(exits, (result, i) => {
            if (!result) return effect.Result.fail(requests[i]);
            const r = effect.Exit.match(result, {
              onFailure: () => effect.Result.fail(requests[i]),
              onSuccess: (value) =>
                effect.Result.succeed([
                  requests[i],
                  result as effect.Request.Result<Request>,
                  value,
                ] as const),
            });
            return r;
          })
        ),
        Eff.orElseSucceed(
          () =>
            [requests, []] as readonly [excluded: Request[], satisfying: any[]]
        )
      );
  }
};
