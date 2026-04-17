import {
	type Duration,
	type FileSystem,
	Layer,
	Logger,
	Option,
	References,
	type Scope,
	ScopedRef,
} from "effect";
import { dual } from "effect/Function";
import type { LogLevel } from "effect/LogLevel";
import type { PlatformError } from "effect/PlatformError";
import { Effect } from "../index";

export * from "effect/Logger";

export const json = Logger.layer([Logger.consoleJson]);
export const pretty = Logger.layer([Logger.consolePretty({ colors: true })]);

export function withMinimumLogLevel(logLevel: LogLevel) {
	return Effect.provideService(References.MinimumLogLevel, logLevel);
}

export const minimumLogLevel: (level: LogLevel) => Layer.Layer<never> = (
	level,
) => Layer.succeed(References.MinimumLogLevel, level);

export const filterLogLevel = dual<
	(
		f: (logLevel: LogLevel) => boolean,
	) => <Message, Output>(
		self: Logger.Logger<Message, Output>,
	) => Logger.Logger<Message, Option.Option<Output>>,
	<Message, Output>(
		self: Logger.Logger<Message, Output>,
		f: (logLevel: LogLevel) => boolean,
	) => Logger.Logger<Message, Option.Option<Output>>
>(2, (self, f) =>
	Logger.make((options) =>
		f(options.logLevel) ? Option.some(self.log(options)) : Option.none(),
	),
);

export const toFileWith = dual<
	(
		file: ScopedRef.ScopedRef<FileSystem.File>,
		options?:
			| {
					readonly batchWindow?: Duration.Input | undefined;
			  }
			| undefined,
	) => <Message = void>(
		self: Logger.Logger<Message, string>,
	) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope>,
	<Message = void>(
		self: Logger.Logger<Message, string>,
		file: ScopedRef.ScopedRef<FileSystem.File>,
		options?:
			| {
					readonly batchWindow?: Duration.Input | undefined;
			  }
			| undefined,
	) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope>
>(
	(args) => Logger.isLogger(args[0]),
	(self, file, options) =>
		Effect.gen(function* () {
			const encoder = new TextEncoder();
			return yield* Logger.batched(self, {
				window: options?.batchWindow ?? 1000,
				flush: (output) =>
					Effect.ignoreLogged(
						ScopedRef.get(file).pipe(
							Effect.flatMap((file) =>
								file.write(encoder.encode(output.join("\n") + "\n")),
							),
						),
					),
			});
		}),
);
