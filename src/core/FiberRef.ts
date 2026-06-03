export * from "effect/References";
export {
  CurrentConcurrency as currentConcurrency,
  CurrentLogAnnotations as currentLogAnnotations,
  CurrentLoggers as currentLoggers,
  CurrentLogLevel as currentLogLevel,
  CurrentLogSpans as currentLogSpans,
  MaxOpsBeforeYield as currentMaxOpsBeforeYield,
  MinimumLogLevel as currentMinimumLogLevel,
  Scheduler as currentScheduler,
  TracerEnabled as currentTracerEnabled,
  UnhandledLogLevel as unhandledErrorLogLevel,
} from "effect/References";

import type { Effect } from "effect/Effect";
import type { Reference } from "./context.js";

export function get<A>(ref: FiberRef<A>): Effect<A> {
  return ref;
}

export type FiberRef<A> = Reference<A>;
