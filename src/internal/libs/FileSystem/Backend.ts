/**
 * @since 1.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import { FileSystem } from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { proxyWithDefaultLayer } from "../ServiceProxy.js";
import { makeOfficialFileSystem } from "./factory.js";
import { Path } from "./Path.js";
import { BackendPlatformProvider } from "./Platform.js";

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRealFs: () => Layer.Layer<FileSystem | Path> = lazy(() =>
  makeOfficialFileSystem().pipe(Layer.provideMerge(Path.layer))
);

export { BackendPlatformProvider };

const fs = /*#__PURE__*/ proxyWithDefaultLayer(FileSystem, layerRealFs());
type fs = FileSystem;

export { fs as FileSystem };
