/**
 * @since 1.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import { FileSystem } from "effect/FileSystem";
import * as Layer from "effect/Layer";
import type { Path } from "effect/Path";
import { proxyWithDefaultLayer } from "../ServiceProxy.js";
import { makeOfficialFileSystem } from "./factory.js";
import { BackendPlatformProvider } from "./Platform.js";

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRealFs: () => Layer.Layer<
  BackendPlatformProvider | FileSystem | Path,
  never,
  never
> = lazy(() =>
  makeOfficialFileSystem().pipe(
    Layer.provideMerge(BackendPlatformProvider.Real)
  )
);

export { BackendPlatformProvider };

const fs = /*#__PURE__*/ proxyWithDefaultLayer(FileSystem, layerRealFs());
type fs = FileSystem;

export { fs as FileSystem };
