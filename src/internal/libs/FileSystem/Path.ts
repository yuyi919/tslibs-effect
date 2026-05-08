import { layer as layerNodePath } from "@effect/platform-node-shared/NodePath";
import { Path as PlatformPath } from "effect/Path";
import * as Eff from "../../../core/effect.js";
import * as Layer from "../../../core/layer.js";
import { proxyWithDefaultLayer } from "../ServiceProxy.js";

export type PathClass = typeof Path;

export const Path = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerNodePath),
  {
    layer: layerNodePath,
  }
);
export type Path = import("effect/Path").Path;

const layerPathe = /*#__PURE__*/ Layer.effect(
  PlatformPath,
  Eff.promise(() => import("./internal/pathe.js").then((_) => _.Pathe))
);
export const Pathe: PathClass = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerPathe),
  {
    layer: layerPathe,
  }
);
