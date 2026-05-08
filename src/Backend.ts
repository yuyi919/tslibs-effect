import { FileSystem as _FileSystem } from "./FileSystem";
import { layerRealFs } from "./internal/libs/FileSystem/Backend";
import { Pathe } from "./internal/libs/FileSystem/Path";
import { proxyWithDefaultLayer } from "./ServiceProxy";

const fs = /*#__PURE__*/ proxyWithDefaultLayer(_FileSystem, layerRealFs());
const path = Pathe;

export { fs as FileSystem, path as Path };

export type FileSystem = import("effect/FileSystem").FileSystem;
export type Path = import("effect/Path").Path;

// export { make } from "effect/unstable/process/ChildProcess";
// export { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
