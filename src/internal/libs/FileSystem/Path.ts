import { layer as layerNodePath } from "@effect/platform-node-shared/NodePath";
import { Path as PlatformPath } from "effect/Path";
import * as Eff from "../../../core/effect.js";
import * as Layer from "../../../core/layer.js";
import { proxyWithDefaultLayer } from "../ServiceProxy.js";

export type PathClass = typeof PathNode;

export const PathNode = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerNodePath),
  {
    layer: layerNodePath,
  }
);
export type PathNode = import("effect/Path").Path;

const layerPathe = /*#__PURE__*/ Layer.unwrap(
  Eff.suspend(() =>
    Eff.log("Path.layer").pipe(
      Eff.zipRight(
        Eff.promise(() => import("./internal/pathe.js").then((_) => _.Pathe))
      )
    )
  )
);
export type Path = import("effect/Path").Path;
export const Path: PathClass = /*#__PURE__*/ Object.assign(
  proxyWithDefaultLayer(PlatformPath, layerPathe),
  {
    layer: layerPathe,
  }
);
