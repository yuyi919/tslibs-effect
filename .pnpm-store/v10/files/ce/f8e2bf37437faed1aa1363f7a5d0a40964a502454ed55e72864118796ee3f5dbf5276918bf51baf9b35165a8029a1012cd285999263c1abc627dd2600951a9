/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array";
import * as Channel from "effect/Channel";
import { type LazyArg } from "effect/Function";
import * as Pull from "effect/Pull";
import * as Sink from "effect/Sink";
import type { Writable } from "node:stream";
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const fromWritable: <E, A = Uint8Array | string>(options: {
    readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>;
    readonly onError: (error: unknown) => E;
    readonly endOnDone?: boolean | undefined;
    readonly encoding?: BufferEncoding | undefined;
}) => Sink.Sink<void, A, never, E>;
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const fromWritableChannel: <IE, E, A = Uint8Array | string>(options: {
    readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>;
    readonly onError: (error: unknown) => E;
    readonly endOnDone?: boolean | undefined;
    readonly encoding?: BufferEncoding | undefined;
}) => Channel.Channel<never, IE | E, void, NonEmptyReadonlyArray<A>, IE>;
/**
 * @since 1.0.0
 */
export declare const pullIntoWritable: <A, IE, E>(options: {
    readonly pull: Pull.Pull<NonEmptyReadonlyArray<A>, IE, unknown>;
    readonly writable: Writable;
    readonly onError: (error: unknown) => E;
    readonly endOnDone?: boolean | undefined;
    readonly encoding?: BufferEncoding | undefined;
}) => Pull.Pull<never, IE | E, unknown>;
//# sourceMappingURL=NodeSink.d.ts.map