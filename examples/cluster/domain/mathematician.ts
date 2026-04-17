import { ClusterSchema, Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";
import { Duration, Effect, Fiber, Function, Schema } from "@/effect";

export class ProblemMathing extends Schema.TaggedErrorClass<ProblemMathing>()(
	"ProblemMathing",
	{},
) {}

export class TooMuchMath extends Schema.TaggedErrorClass<TooMuchMath>()(
	"TooMuchMath",
	{},
) {}

export class BadLuckMath extends Schema.TaggedErrorClass<BadLuckMath>()(
	"BadLuckMath",
	{},
) {}

export class ClusterProblem extends Schema.TaggedErrorClass<ClusterProblem>()(
	"ClusterProblem",
	{
		message: Schema.String,
	},
) {}

export const Mathematician = Entity.make("Mathematician", [
	Rpc.make("CalculateFibonacci", {
		payload: {
			target: Schema.Int,
		},
		success: Schema.Struct({
			result: Schema.Int,
			mathematician: Schema.String,
		}),
		error: Schema.Union([
			TooMuchMath,
			BadLuckMath,
			ProblemMathing,
			ClusterProblem,
		]),
	}),
]).annotateRpcs(ClusterSchema.Persisted, true);

const fib = (n: number): Effect.Effect<number> =>
	Effect.gen(function* () {
		if (n <= 1) {
			return n;
		}

		// Fork two fibers for the recursive Fibonacci calls
		const fiber1 = yield* Effect.fork(fib(n - 2));
		const fiber2 = yield* Effect.fork(fib(n - 1));

		// Join the fibers to retrieve their results
		const v1 = yield* Fiber.join(fiber1);
		const v2 = yield* Fiber.join(fiber2);

		return v1 + v2; // Combine the results
	});

/**
 * Returns a random mathematician id
 * @returns "mathematician-double-checker-123" or "mathematician-procrastinator-456"
 */
const getRandomMathematician = () => {
	const types = ["double-checker", "procrastinator"];
	const randomIndex = Math.random() < 0.5 ? 0 : 1;
	return `mathematician-${types[randomIndex]}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Returns true 50% of the time
 * @returns boolean
 */
const isSuperstitious = () => Math.random() < 0.5;

const effect = Effect.gen(function* () {
	const address = yield* Entity.CurrentAddress;
	const client = yield* Mathematician.client;
	// yield* Effect.log("address.entityId", address.entityId)
	if (address.entityId.startsWith("assistant")) {
		return {
			CalculateFibonacci: Effect.fnUntraced(function* (envelope) {
				yield* Effect.log("Assistant calculating Fibonacci");
				return yield* fib(envelope.payload.target).pipe(
					Effect.zipLeft(Effect.log("Assistant calculating Fibonacci done")),
					Effect.map((result) => ({
						result,
						mathematician: address.entityId,
					})),
				);
			}),
		};
	}

	return {
		CalculateFibonacci: Effect.fnUntraced(
			function* (envelope) {
				if (envelope.payload.target === 13 && isSuperstitious()) {
					return yield* new BadLuckMath();
				}
				if (envelope.payload.target > 15) {
					return yield* new TooMuchMath();
				}

				const mathematician = getRandomMathematician();
				if (mathematician.startsWith("mathematician-double-checker")) {
					const assistantResult = yield* client(
						mathematician.replace("mathematician-", "assistant-"),
					)
						.CalculateFibonacci({
							target: envelope.payload.target,
						})
						.pipe(
							// Effect.catchTag("TooMuchMath", Function.identity),
							// Effect.catchTag("BadLuckMath", Function.identity),
							Effect.catchAll(() =>
								new ClusterProblem({
									message: "Problem getting math from assistant",
								}).asEffect(),
							),
						);
					const doubleCheckerResult = yield* fib(envelope.payload.target).pipe(
						Effect.andThen((result) =>
							Effect.log("Calculating Fibonacci done").pipe(
								Effect.annotateLogs({
									result,
									target: envelope.payload.target,
								}),
								Effect.as(result),
							),
						),
					);
					if (doubleCheckerResult !== assistantResult.result) {
						return yield* new ProblemMathing();
					}
					yield* Effect.log("Match checks out");
					return {
						result: doubleCheckerResult,
						mathematician:
							mathematician + " and " + assistantResult.mathematician,
					};
				}
				if (mathematician.startsWith("mathematician-procrastinator")) {
					// yield* Effect.log("Procrastinating...");
					// yield* Effect.sleep(Duration.seconds(2));

					yield* Effect.log("Calculating Fibonacci");
					return yield* fib(envelope.payload.target).pipe(
						Effect.andThen((result) =>
							Effect.log("Calculating Fibonacci done").pipe(
								Effect.annotateLogs({
									result,
									target: envelope.payload.target,
								}),
								Effect.as(result),
							),
						),
						Effect.map((result) => ({
							result,
							mathematician: mathematician,
						})),
					);
				}

				return yield* new ClusterProblem({
					message: "No work has been done",
				});
			},
			(effect, { payload }) =>
				Effect.annotateLogs(effect, {
					"address.shardId": address.shardId.toString(),
					"address.entityId": address.entityId,
					"address.entityType": address.entityType,
					pid: process.pid,
					target: payload.target,
				}),
		),
	};
});
export const MathematicianLive = Mathematician.toLayer(effect);

