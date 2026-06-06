import { Path as Path2 } from "effect/Path";
import { FileSystem as _FileSystem } from "./FileSystem.js";
import { layerRealFs } from "./internal/libs/FileSystem/Backend.js";
import { proxyWithDefaultLayer } from "./ServiceProxy.js";

const fs = /*#__PURE__*/ proxyWithDefaultLayer(_FileSystem, layerRealFs());

export { fs as FileSystem };

export type FileSystem = import("effect/FileSystem").FileSystem;

export { PlatformError } from "effect/PlatformError";
export { Path } from "./internal/libs/FileSystem/Path.js";

// export { make } from "effect/unstable/process/ChildProcess";
// export { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
