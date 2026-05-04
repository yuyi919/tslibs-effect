import { layer as layerDefault, Path as PathTag } from "effect/Path";
import * as Eff from "../../../core/effect";
import * as Layer from "../../../core/layer";
import { proxyWithDefaultLayer } from "../ServiceProxy";

export const layerPathe = Layer.effect(
  PathTag,
  Eff.promise(() => import("./pathe").then((_) => _.Pathe))
);

export const Path = proxyWithDefaultLayer(PathTag, layerDefault);
export const Pathe = proxyWithDefaultLayer(PathTag, layerPathe);
