import { FileSystem as _FileSystem } from "./FileSystem.js";
import { layerRealFs } from "./internal/libs/FileSystem/Backend.js";
import { Path as Pathe } from "./internal/libs/FileSystem/Path.js";
import { proxyWithDefaultLayer } from "./ServiceProxy.js";

const fs = /*#__PURE__*/ proxyWithDefaultLayer(_FileSystem, layerRealFs());
const path = Pathe;

export { fs as FileSystem, path as Path };

export type FileSystem = import("effect/FileSystem").FileSystem;
export type Path = import("effect/Path").Path;

// export { make } from "effect/unstable/process/ChildProcess";
// export { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
