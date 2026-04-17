// import { Deferred, Effect, MutableHashMap, Option, pipe } from "effect";
// import { Equivalence } from "effect/Equivalence";
// import * as core from "effect/Effect";

// /** @internal */
// export const cachedFunction = <A, B, E, R>(
//   f: (a: A) => Effect.Effect<B, E, R>,
//   eq?: Equivalence<A>
// ): Effect.Effect<(a: A) => Effect.Effect<B, E, R>> => {
//   return pipe(
//     core.sync(() =>
//       MutableHashMap.empty<
//         Key<A>,
//         Deferred.Deferred<readonly [FiberRefsPatch.FiberRefsPatch, B], E>
//       >()
//     ),
//     core.flatMap(makeSynchronized),
//     core.map(
//       (ref) => (a: A) =>
//         pipe(
//           ref.modifyEffect((map) => {
//             const result = pipe(map, MutableHashMap.get(new Key(a, eq)));
//             if (Option.isNone(result)) {
//               return pipe(
//                 core.deferredMake<
//                   readonly [FiberRefsPatch.FiberRefsPatch, B],
//                   E
//                 >(),
//                 core.tap((deferred) =>
//                   pipe(
//                     effect.diffFiberRefs(f(a)),
//                     core.intoDeferred(deferred),
//                     fiberRuntime.fork
//                   )
//                 ),
//                 core.map(
//                   (deferred) =>
//                     [
//                       deferred,
//                       pipe(map, MutableHashMap.set(new Key(a, eq), deferred)),
//                     ] as const
//                 )
//               );
//             }
//             return core.succeed([result.value, map] as const);
//           }),
//           core.flatMap(core.deferredAwait),
//           core.flatMap(([patch, b]) =>
//             pipe(effect.patchFiberRefs(patch), core.as(b))
//           )
//         )
//     )
//   );
// };
