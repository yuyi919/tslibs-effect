/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Effect from "effect/Effect";
import type { SizeInput } from "effect/FileSystem";
import { type LazyArg } from "effect/Function";
import * as Stream from "effect/Stream";
import type { Duplex } from "node:stream";
import { Readable } from "node:stream";
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const fromReadable: <A = Uint8Array, E = Cause.UnknownError>(options: {
    readonly evaluate: LazyArg<Readable | NodeJS.ReadableStream>;
    readonly onError?: (error: unknown) => E;
    readonly chunkSize?: number | undefined;
    readonly bufferSize?: number | undefined;
    readonly closeOnDone?: boolean | undefined;
}) => Stream.Stream<A, E>;
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const fromReadableChannel: <A = Uint8Array, E = Cause.UnknownError>(options: {
    readonly evaluate: LazyArg<Readable | NodeJS.ReadableStream>;
    readonly onError?: (error: unknown) => E;
    readonly chunkSize?: number | undefined;
    readonly closeOnDone?: boolean | undefined;
}) => Channel.Channel<Arr.NonEmptyReadonlyArray<A>, E>;
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const fromDuplex: <IE, I = Uint8Array, O = Uint8Array, E = Cause.UnknownError>(options: {
    readonly evaluate: LazyArg<Duplex>;
    readonly onError?: (error: unknown) => E;
    readonly chunkSize?: number | undefined;
    readonly bufferSize?: number | undefined;
    readonly endOnDone?: boolean | undefined;
    readonly encoding?: BufferEncoding | undefined;
}) => Channel.Channel<Arr.NonEmptyReadonlyArray<O>, IE | E, void, Arr.NonEmptyReadonlyArray<I>, IE>;
/**
 * @category combinators
 * @since 1.0.0
 */
export declare const pipeThroughDuplex: {
    /**
     * @category combinators
     * @since 1.0.0
     */
    <B = Uint8Array, E2 = Cause.UnknownError>(options: {
        readonly evaluate: LazyArg<Duplex>;
        readonly onError?: (error: unknown) => E2;
        readonly chunkSize?: number | undefined;
        readonly bufferSize?: number | undefined;
        readonly endOnDone?: boolean | undefined;
        readonly encoding?: BufferEncoding | undefined;
    }): <R, E, A>(self: Stream.Stream<A, E, R>) => Stream.Stream<B, E2 | E, R>;
    /**
     * @category combinators
     * @since 1.0.0
     */
    <R, E, A, B = Uint8Array, E2 = Cause.UnknownError>(self: Stream.Stream<A, E, R>, options: {
        readonly evaluate: LazyArg<Duplex>;
        readonly onError?: (error: unknown) => E2;
        readonly chunkSize?: number | undefined;
        readonly bufferSize?: number | undefined;
        readonly endOnDone?: boolean | undefined;
        readonly encoding?: BufferEncoding | undefined;
    }): Stream.Stream<B, E | E2, R>;
};
/**
 * @category combinators
 * @since 1.0.0
 */
export declare const pipeThroughSimple: {
    /**
     * @category combinators
     * @since 1.0.0
     */
    (duplex: LazyArg<Duplex>): <R, E>(self: Stream.Stream<string | Uint8Array, E, R>) => Stream.Stream<Uint8Array, E | Cause.UnknownError, R>;
    /**
     * @category combinators
     * @since 1.0.0
     */
    <R, E>(self: Stream.Stream<string | Uint8Array, E, R>, duplex: LazyArg<Duplex>): Stream.Stream<Uint8Array, Cause.UnknownError | E, R>;
};
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toReadable: <E, R>(stream: Stream.Stream<string | Uint8Array, E, R>) => Effect.Effect<Readable, never, R>;
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toReadableNever: <E>(stream: Stream.Stream<string | Uint8Array, E, never>) => Readable;
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toString: <E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: {
    readonly onError?: (error: unknown) => E;
    readonly encoding?: BufferEncoding | undefined;
    readonly maxBytes?: SizeInput | undefined;
}) => Effect.Effect<string, E>;
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toArrayBuffer: <E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: {
    readonly onError?: (error: unknown) => E;
    readonly maxBytes?: SizeInput | undefined;
}) => Effect.Effect<ArrayBuffer, E>;
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toUint8Array: <E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: {
    readonly onError?: (error: unknown) => E;
    readonly maxBytes?: SizeInput | undefined;
}) => Effect.Effect<Uint8Array, E>;
//# sourceMappingURL=NodeStream.d.ts.map