#!/usr/bin/env npx tsx

import {
  Cause,
  Duration,
  Effect,
  Exit,
  Fiber,
  Layer,
  Logger,
  LogLevel,
} from "@/effect";
import { Eff } from "..";
import { ClusterRunnerSocket } from "./cluster/runtime";
import { SqlLayer } from "./cluster/sql";
import {
  BadLuckMath,
  ClusterProblem,
  Mathematician,
  ProblemMathing,
  TooMuchMath,
} from "./domain/mathematician";

const getNodeId = () => `node-${Math.floor(Math.random() * 1000)}`;
const getTarget = () => 13; //Math.floor(Math.random() * 7) + 10;

const program = Effect.gen(function* () {
  const client = yield* Mathematician.client.pipe(
    Eff.withLogElapsed("Mathematician.client")
  );

  const nodeId = getNodeId();
  const target = getTarget();
  const result = yield* Effect.log(
    `Requesting ${nodeId} to calculate fibonacci(${target})`
  ).pipe(
    Effect.zipRight(
      client(nodeId).CalculateFibonacci({ target }).pipe(Effect.exit)
    ),
    Effect.flatMap((exit) => {
      // no mathematician will calculate such a large number
      // avoid retrying
      if (Exit.isFailure(exit) && exit.cause.reasons.some(Cause.isFailReason)) {
        const cause = exit.cause.reasons.find(Cause.isFailReason)!;
        if (cause.error instanceof BadLuckMath) {
          return Exit.succeed({
            message: "BadLuckMath",
            // TODO should return an Option
            result: 0,
            mathematician: "",
          });
        }
        if (cause.error instanceof TooMuchMath) {
          return Exit.succeed({
            message: "No mathematician will calculate such a large number",
            // TODO should return an Option
            result: 0,
            mathematician: "",
          });
        }
        if (cause.error instanceof ProblemMathing) {
          return Exit.succeed({
            message: "Can't recover from a mathing problem",
            // TODO should return an Option
            result: 0,
            mathematician: "",
          });
        }
        // all other error could be recoverable
        return Effect.fail(cause.error);
      }
      return exit;
    }),
    Effect.timeout(Duration.seconds(30)),
    Effect.retry({
      times: 0,
    }),
    // Something catastrophic happened
    Effect.catchAll((e) =>
      new ClusterProblem({
        message: "Something catastrophic happened -> " + e._tag,
      }).asEffect()
    ),
    Effect.exit
  );
  yield* Effect.log(`Result:`).pipe(
    Effect.annotateLogs({
      target,
      result,
    })
  );
  return result;
});

const ClusterLayer = ClusterRunnerSocket.layer({
  clientOnly: true,
}).pipe(Layer.provideMerge(SqlLayer));

Effect.all(Effect.replicate(program, 2), { concurrency: 15 })
  .pipe(
    Effect.tap((results) => {
      const success = results.filter(Exit.isSuccess).length;
      const failure = results.filter(Exit.isFailure).length;
      console.log(`Success: ${success}, Failure: ${failure}`);
      return Effect.void;
    }),
    Effect.provide(ClusterLayer),
    Effect.catchAll((error) => {
      console.error(error);
      return Effect.void;
    }),
    Logger.withMinimumLogLevel(LogLevel.Debug),
    Effect.runPromise
  )
  .catch((error) => {
    console.error(error);
  });
