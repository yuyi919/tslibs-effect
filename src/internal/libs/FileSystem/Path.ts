import { layer as layerNodePath } from "@effect/platform-node-shared/NodePath";
import { Path as PlatformPath } from "effect/Path";
import * as Eff from "../../../core/effect";
import * as Layer from "../../../core/layer";
import { proxyWithDefaultLayer } from "../ServiceProxy";

export type PathClass = typeof Path

export const Path = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerNodePath),
  {
    layer: layerNodePath,
  }
);
export type Path = import("effect/Path").Path;

const layerPathe = /*#__PURE__*/ Layer.effect(
  PlatformPath,
  Eff.promise(() => import("./internal/pathe").then((_) => _.Pathe))
);
export const Pathe: PathClass = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerPathe),
  {
    layer: layerPathe,
  }
);
