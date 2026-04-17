/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Runners from "effect/unstable/cluster/Runners";
import * as ShardingConfig from "effect/unstable/cluster/ShardingConfig";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import { Socket } from "effect/unstable/socket/Socket";
import * as NodeSocket from "./NodeSocket.js";
import * as NodeSocketServer from "./NodeSocketServer.js";
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocol = /*#__PURE__*/Layer.effect(Runners.RpcClientProtocol)(/*#__PURE__*/Effect.gen(function* () {
  const serialization = yield* RpcSerialization.RpcSerialization;
  return Effect.fnUntraced(function* (address) {
    const socket = yield* NodeSocket.makeNet({
      openTimeout: 1000,
      timeout: 5500,
      host: address.host,
      port: address.port
    });
    return yield* RpcClient.makeProtocolSocket().pipe(Effect.provideService(Socket, socket), Effect.provideService(RpcSerialization.RpcSerialization, serialization));
  }, Effect.orDie);
}));
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerSocketServer = /*#__PURE__*/Effect.gen(function* () {
  const config = yield* ShardingConfig.ShardingConfig;
  const listenAddress = Option.orElse(config.runnerListenAddress, () => config.runnerAddress);
  if (Option.isNone(listenAddress)) {
    return yield* Effect.die("layerSocketServer: ShardingConfig.runnerListenAddress is None");
  }
  return NodeSocketServer.layer(listenAddress.value);
}).pipe(Layer.unwrap);
//# sourceMappingURL=NodeClusterSocket.js.map