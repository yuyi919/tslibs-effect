import { SingleRunner, Singleton } from "effect/unstable/cluster";
import { Config, Duration, Effect, Layer, Schedule } from "@/effect";
import { IpAddress } from "../cluster/env";
import { TickCron } from "./TickCron";

export const ProcessCrasher = Singleton.make(
	"ProcessCrasher",
	Effect.gen(function* () {
		yield* Effect.addFinalizer(() => Effect.log("The process has crashed"));

		const ip = yield* IpAddress;
		yield* Effect.annotateLogsScoped({ ip });

		const installedCrasher = yield* Config.boolean(
			"INSTALL_PROCESS_CRASHER",
		).pipe(Config.withDefault(false));
		if (!installedCrasher) {
			yield* Effect.log("The ProcessCrasher was not installed");
			return yield* Effect.never;
		}

		yield* Effect.log("The ProcessCrasher was installed");

		yield* Effect.sync(() => process.kill(process.pid, "SIGINT")).pipe(
			Effect.delay("2 seconds"),
			Effect.fork,
		);
		yield* Effect.log("The ProcessCrasher is alive").pipe(
			Effect.repeat(Schedule.fixed("15 seconds")),
		);
	}).pipe(Effect.scoped),
).pipe(Layer.merge(TickCron));

