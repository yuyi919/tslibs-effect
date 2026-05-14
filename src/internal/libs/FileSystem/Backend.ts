/**
 * @since 1.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import { FileSystem } from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { Path } from "effect/Path";
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
