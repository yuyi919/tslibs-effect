/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { dual } from "effect/Function";
import * as Latch from "effect/Latch";
import * as MutableRef from "effect/MutableRef";
import * as Pull from "effect/Pull";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { Readable } from "node:stream";
import { pullIntoWritable } from "./NodeSink.js";
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadable = options => Stream.fromChannel(fromReadableChannel(options));
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadableChannel = options => Channel.fromTransform((_, scope) => readableToPullUnsafe({
  scope,
  readable: options.evaluate(),
  onError: options.onError ?? defaultOnError,
  chunkSize: options.chunkSize,
  closeOnDone: options.closeOnDone
}));
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromDuplex = options => Channel.fromTransform((upstream, scope) => {
  const duplex = options.evaluate();
  const exit = MutableRef.make(undefined);
  return pullIntoWritable({
    pull: upstream,
    writable: duplex,
    onError: options.onError ?? defaultOnError,
    endOnDone: options.endOnDone,
    encoding: options.encoding
  }).pipe(Effect.catchCause(cause => {
    if (Pull.isDoneCause(cause)) return Effect.void;
    exit.current = Exit.failCause(cause);
    return Effect.void;
  }), Effect.forkIn(scope), Effect.flatMap(() => readableToPullUnsafe({
    scope,
    exit,
    readable: duplex,
    onError: options.onError ?? defaultOnError,
    chunkSize: options.chunkSize
  })));
});
/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughDuplex = /*#__PURE__*/dual(2, (self, options) => Stream.pipeThroughChannelOrFail(self, fromDuplex(options)));
/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughSimple = /*#__PURE__*/dual(2, (self, duplex) => pipeThroughDuplex(self, {
  evaluate: duplex
}));
/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadable = stream => Effect.map(Effect.context(), context => new StreamAdapter(context, stream));
/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadableNever = stream => new StreamAdapter(Context.empty(), stream);
/**
 * @since 1.0.0
 * @category conversions
 */
export const toString = (readable, options) => {
  const maxBytesNumber = options?.maxBytes ? Number(options.maxBytes) : undefined;
  const onError = options?.onError ?? defaultOnError;
  const encoding = options?.encoding ?? "utf8";
  return Effect.callback(resume => {
    const stream = readable();
    stream.setEncoding(encoding);
    stream.once("error", err => {
      if ("closed" in stream && !stream.closed) {
        stream.destroy();
      }
      resume(Effect.fail(onError(err)));
    });
    stream.once("error", err => {
      resume(Effect.fail(onError(err)));
    });
    let string = "";
    let bytes = 0;
    stream.once("end", () => {
      resume(Effect.succeed(string));
    });
    stream.on("data", chunk => {
      string += chunk;
      bytes += Buffer.byteLength(chunk);
      if (maxBytesNumber && bytes > maxBytesNumber) {
        resume(Effect.fail(onError(new Error("maxBytes exceeded"))));
      }
    });
    return Effect.sync(() => {
      if ("closed" in stream && !stream.closed) {
        stream.destroy();
      }
    });
  });
};
/**
 * @since 1.0.0
 * @category conversions
 */
export const toArrayBuffer = (readable, options) => {
  const maxBytesNumber = options?.maxBytes ? Number(options.maxBytes) : undefined;
  const onError = options?.onError ?? defaultOnError;
  return Effect.callback(resume => {
    const stream = readable();
    let buffer = Buffer.alloc(0);
    let bytes = 0;
    stream.once("error", err => {
      if ("closed" in stream && !stream.closed) {
        stream.destroy();
      }
      resume(Effect.fail(onError(err)));
    });
    stream.once("end", () => {
      if (buffer.buffer.byteLength === buffer.byteLength) {
        return resume(Effect.succeed(buffer.buffer));
      }
      resume(Effect.succeed(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
    });
    stream.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      bytes += chunk.length;
      if (maxBytesNumber && bytes > maxBytesNumber) {
        resume(Effect.fail(onError(new Error("maxBytes exceeded"))));
      }
    });
    return Effect.sync(() => {
      if ("closed" in stream && !stream.closed) {
        stream.destroy();
      }
    });
  });
};
/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array = (readable, options) => Effect.map(toArrayBuffer(readable, options), buffer => new Uint8Array(buffer));
// ----------------------------------------------------------------------------
// internal
// ----------------------------------------------------------------------------
const readableToPullUnsafe = options => {
  const readable = options.readable;
  if (readable.readableEnded) return Effect.succeed(Cause.done());
  const closeOnDone = options.closeOnDone ?? true;
  const exit = options.exit ?? MutableRef.make(undefined);
  const latch = Latch.makeUnsafe(false);
  function onReadable() {
    latch.openUnsafe();
  }
  function onError(error) {
    exit.current = Exit.fail(options.onError(error));
    latch.openUnsafe();
  }
  function onEnd() {
    exit.current = Exit.fail(Cause.Done());
    latch.openUnsafe();
  }
  readable.on("readable", onReadable);
  readable.once("error", onError);
  readable.once("end", onEnd);
  const pull = Effect.suspend(function loop() {
    let item = options.readable.read(options.chunkSize);
    if (item === null) {
      if (exit.current) {
        return exit.current;
      }
      latch.closeUnsafe();
      return Effect.flatMap(latch.await, loop);
    }
    const chunk = Arr.of(item);
    while (true) {
      item = options.readable.read(options.chunkSize);
      if (item === null) break;
      chunk.push(item);
    }
    return Effect.succeed(chunk);
  });
  return Effect.as(Scope.addFinalizer(options.scope, Effect.sync(() => {
    readable.off("readable", onReadable);
    readable.off("error", onError);
    readable.off("end", onEnd);
    if (closeOnDone && "closed" in options.readable && !options.readable.closed) {
      options.readable.destroy();
    }
  })), pull);
};
class StreamAdapter extends Readable {
  readLatch;
  fiber = undefined;
  constructor(context, stream) {
    super({});
    this.readLatch = Latch.makeUnsafe(false);
    this.fiber = Stream.runForEachArray(stream, chunk => this.readLatch.whenOpen(Effect.sync(() => {
      this.readLatch.closeUnsafe();
      for (let i = 0; i < chunk.length; i++) {
        const item = chunk[i];
        if (typeof item === "string") {
          this.push(item, "utf8");
        } else {
          this.push(item);
        }
      }
    }))).pipe(this.readLatch.whenOpen, Effect.provideContext(context), Effect.runFork);
    this.fiber.addObserver(exit => {
      this.fiber = undefined;
      if (Exit.isSuccess(exit)) {
        this.push(null);
      } else {
        this.destroy(Cause.squash(exit.cause));
      }
    });
  }
  _read(_size) {
    this.readLatch.openUnsafe();
  }
  _destroy(error, callback) {
    if (!this.fiber) {
      return callback(error);
    }
    Effect.runFork(Fiber.interrupt(this.fiber)).addObserver(exit => {
      callback(exit._tag === "Failure" ? Cause.squash(exit.cause) : error);
    });
  }
}
const defaultOnError = error => new Cause.UnknownError(error);
//# sourceMappingURL=NodeStream.js.map