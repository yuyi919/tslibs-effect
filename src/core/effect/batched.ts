import {
  Array,
  Exit,
  Hash,
  identity,
  PrimaryKey,
  Request,
  RequestResolver,
} from "effect";
import type { NonEmptyArray } from "effect/Array";
import { memoize } from "es-toolkit";
import * as Eff from "../effect";

// const liftReqResolve: <Req extends Eff.AnyRequest>(
//   requests: NonEmptyArray<Req>
// ) => <R>(
//   self: Eff.Effect<Eff.RequestSuccess<Req>[], Eff.RequestError<Req>, R>
// ) => Eff.Effect<NonEmptyArray<void>, never, R> = (requests) => (eff) =>
//   eff.pipe(
//     Eff.andThen((res) =>
//       Eff.forEach(requests, (request, i) =>
//         Request.succeed(request, res[i])
//       )
//     ),
//     Eff.catch((error) =>
//       Eff.forEach(requests, (request) => Request.fail(request, error))
//     )
//   );

// export function makeBatchedResolver<Req extends Eff.AnyRequest, R>(
//   f: (
//     req: NonEmptyArray<Req>
//   ) => Eff.T<Eff.RequestSuccess<Req>[], Eff.RequestError<Req>, R>
// ): RequestResolver.RequestResolver<Req> {
//   return RequestResolver.grouped<Req, R>((requests: NonEmptyArray<Req>) => {
//     // console.log("requests", requests.length);
//     return f(requests).pipe(liftReqResolve<Req>(requests));
//   });
// }

// export function makeBatchedResolverPromise<Req extends Eff.AnyRequest>(
//   f: (req: Req[]) => Promise<Eff.RequestSuccess<Req>[]>
// ): RequestResolver.RequestResolver<Req> {
//   return makeBatchedResolver<Req, never>((requests) => Eff.from(f(requests)));
// }

const _makeBatchFn = <
  F extends (req: NonEmptyArray<any>, ...any: any[]) => Eff.Any<any[]>,
>(
  f: F,
  opt: {
    readonly cached?: boolean;
    readonly _wrapResolver?: (
      resolver: RequestResolver.RequestResolver<any>
    ) => Eff.Effect<RequestResolver.RequestResolver<any>>;
  }
) => {
  type Params = Parameters<F>;
  type P = Params[0][number];
  type A = (Eff.T.Success<ReturnType<F>> & unknown[])[number];
  type E = Eff.T.Error<ReturnType<F>>;
  type R = Eff.T.Context<ReturnType<F>>;
  type Req = {
    _tag: "DynamicRequest";
    arg: P;
    [PrimaryKey.symbol](): any;
  } & Request.Request<A, E>;
  const DynamicRequest = Request.tagged<Req>("DynamicRequest");

  const GetBatchedResolver = memoize(
    (otherArgs: any[]) =>
      RequestResolver.make<Req>((requests) =>
        (
          f(
            Array.map(requests, (req) => req.request.arg),
            ...otherArgs
          ) as Eff.T<A[], E>
        ).pipe(
          Eff.exit,
          Eff.tap((datas) =>
            Exit.isSuccess(datas)
              ? Eff.forEach(datas.value, (a, i) =>
                  Request.succeed(requests[i], a)
                )
              : Eff.sync(() => {
                  return requests.map((req) => req.completeUnsafe(datas));
                })
          ),
          Eff.asVoid
        )
      ).pipe(
        opt._wrapResolver
          ? (Eff.flatMap(opt._wrapResolver) as unknown as typeof identity)
          : identity
      ),
    {
      getCacheKey: Hash.array,
    }
  );
  const resolver = GetBatchedResolver([]);
  const locally = (arg: P, ...otherArgs: any[]) => {
    return Eff.request(
      DynamicRequest({ arg, [PrimaryKey.symbol]: () => arg }),
      resolver
    ).pipe(
      //   opt?.cached ? Eff.withRequestCaching(true) : identity
      // Eff.provideService(otherArgs, {
      //   _: others,
      //   [Hash.symbol]: () => 1,
      // }),
    );
  };

  return locally;
};

/**
 * 利用Effect.request实现的批量处理函数
 * @param f
 * @param opt
 * @returns
 */
export function batched<P, A, E = never, R = never, O extends any[] = any[]>(
  f: (input: NonEmptyArray<P>, ...other: O) => Eff.T<A[], E, R>,
  opt?: { readonly cached?: boolean }
): (request: P, ...other: O) => Eff.Effect<A, E, R> {
  return _makeBatchFn(f, { ...opt });
}

export function batchedOrSingle<
  P,
  A,
  E = never,
  R = never,
  O extends any[] = any[],
>(
  f: (input: P, ...other: O) => Eff.T<A, E, R>,
  f2: (input: NonEmptyArray<P>, ...other: O) => Eff.T<NonEmptyArray<A>, E, R>,
  opt?: { readonly cached?: boolean }
): (request: P, ...other: O) => Eff.Effect<A, E, R> {
  return _makeBatchFn(
    (reqs, ...other: O) =>
      reqs.length === 1
        ? f(reqs[0], ...other).pipe(Eff.map((a) => [a]))
        : f2(reqs, ...other),
    { ...opt }
  );
}
