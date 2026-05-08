import * as Context from "../src/Context.js";
import * as Eff from "../src/effect-next.js";
// import { Context } from "./dist/index.mjs";
import * as Layer from "../src/Layer.js";

export const Test = Context.GenericTag<"Test", { test: 1 }>("@test/Test");

// interface GetDoubleRequest extends Request.Request<number> {
//   readonly _tag: "GetDoubleRequest";
//   readonly value: number;
// }
// const GetDoubleRequest = Request.tagged<GetDoubleRequest>("GetDoubleRequest");

// // class GetDoubleRequest extends Request.TaggedClass("GetDoubleRequest2")<
// //   { readonly value: number },
// //   number,Error
// // > {}
// // Create a resolver that processes multiple requests in a batch
// const DoubleResolver = RequestResolver.fromFunctionBatched<GetDoubleRequest>(
//   (entries) => (
//     console.log(entries.map((a) => a.request.value)),
//     entries.map((entry) => entry.request.value * 2)
//   )
// );
const testFn = Eff.batched((a: number[]) =>
  Eff.service(Test).pipe(
    Eff.andThen((_) => (console.log(_, a), Eff.succeed(a.map((a) => a * 2))))
  )
);
const testFn2 = Eff.batched(
  (a: number[]) => (console.log(a), Eff.succeed(a.map((a) => a * 2)))
);
// Usage with multiple requests
const effects = [1, 2, 3].map(
  (value) => testFn(value)
  //   Effect.request(GetDoubleRequest({ value }), DoubleResolver),
);
const effects2 = [4, 5, 6].map(
  (value) => testFn2(value)
  //   Effect.request(GetDoubleRequest({ value }), DoubleResolver),
);

const batchedEffect = Eff.all([...effects, ...effects2], {
  concurrency: "unbounded",
}); // [2, 4, 6]

await Eff.runPromise(
  batchedEffect.pipe(
    Eff.tap(Eff.log),
    Eff.provide(Eff.Layer.succeed(Test, { test: 1 }))
  )
);
