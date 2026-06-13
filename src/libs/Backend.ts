export { PlatformError } from "effect/PlatformError";
export {
  BackendPlatformProvider,
  FileSystem,
  layerRealFs,
} from "../internal/libs/FileSystem/Backend.js";
export { CurrentWorkingDirectory } from "../internal/libs/FileSystem/Cwd.js";
export * as InMemory from "../internal/libs/FileSystem/MemFs.js";
export { Path } from "../internal/libs/FileSystem/Path.js";
