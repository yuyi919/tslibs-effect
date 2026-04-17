import { RunnerAddress, SingleRunner } from "effect/unstable/cluster";
import { Context, Effect, Layer, Logger, Option } from "@/effect";
import { IpAddress, ipLayer, Port, portLayer } from "./cluster/env";
import { HealthServerLive } from "./cluster/health";
import { ClusterRunnerSocket, PlatformRuntime } from "./cluster/runtime";
import { SqlLayer } from "./cluster/sql";
import { MathematicianLive } from "./domain/mathematician";
import { ProcessCrasher } from "./domain/process-crasher";
import { TickCron } from "./domain/TickCron";

const RunnerLive = Layer.mergeAll(ipLayer, portLayer).pipe(
  Layer.flatMap((ctx) =>
    ClusterRunnerSocket.layer({
      storage: "sql",
      // runnerStorage: "memory",
      shardingConfig: {
        runnerAddress: Option.some(
          RunnerAddress.make(
            Context.get(ctx, IpAddress),
            Context.get(ctx, Port)
          )
        ),
      },
    })
  )
);

const Entities = Layer.mergeAll(
  MathematicianLive,
  ProcessCrasher,
  TickCron
).pipe(Layer.provide(ipLayer));

const program = Entities.pipe(
  Layer.provide(RunnerLive),
  Layer.provide(HealthServerLive),
  Layer.provide(SqlLayer),
  Layer.launch
);

const inEcs = process.env.ECS_CONTAINER_METADATA_URI_V4 !== undefined;
const programWithAdjustedLogger = inEcs
  ? program.pipe(Effect.provide(Logger.json))
  : program.pipe(Effect.provide(Logger.pretty));

PlatformRuntime.runMain(
  programWithAdjustedLogger.pipe(Logger.withMinimumLogLevel("Debug")),
  {
    // disablePrettyLogger: inEcs,
  }
);
