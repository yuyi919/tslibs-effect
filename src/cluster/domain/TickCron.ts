import { ClusterCron } from "effect/unstable/cluster";
import { Cron, Effect, Either } from "@/effect";

export const TickCron = ClusterCron.make({
  name: "TickCron",
  cron: Cron.parse("0 0 0 * * *").pipe(Either.getOrThrow),
  execute: Effect.log("The ProcessCrasher is alive"),
  skipIfOlderThan: "1 minutes",
  calculateNextRunFromPrevious: false,
});
