/**
 * @since 1.0.0
 */

import { lazy } from "@yuyi919/shared-proto/Functions";
import * as Layer from "effect/Layer";
import { makeOfficialFileSystem } from "./factory.js";
import { BackendPlatformProvider } from "./Platform.js";

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRealFs = lazy(() =>
  makeOfficialFileSystem().pipe(Layer.provide(BackendPlatformProvider.Real))
);
