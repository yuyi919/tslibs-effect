/**
 * @since 1.0.0
 */
import type { Array } from "effect";
import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as Socket from "effect/unstable/socket/Socket";
import * as Net from "node:net";
import type { Duplex } from "node:stream";
/**
 * @since 1.0.0
 * @category re-exports
 */
export * as NodeWS from "ws";
declare const NetSocket_base: Context.ServiceClass<NetSocket, "@effect/platform-node/NodeSocket/NetSocket", Net.Socket>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class NetSocket extends NetSocket_base {
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeNet: (options: Net.NetConnectOpts & {
    readonly openTimeout?: Duration.Input | undefined;
}) => Effect.Effect<Socket.Socket>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromDuplex: <RO>(open: Effect.Effect<Duplex, Socket.SocketError, RO>, options?: {
    readonly openTimeout?: Duration.Input | undefined;
}) => Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeNetChannel: <IE = never>(options: Net.NetConnectOpts) => Channel.Channel<Array.NonEmptyReadonlyArray<Uint8Array>, Socket.SocketError | IE, void, Array.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>, IE>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerNet: (options: Net.NetConnectOpts) => Layer.Layer<Socket.Socket, Socket.SocketError>;
//# sourceMappingURL=NodeSocket.d.ts.map