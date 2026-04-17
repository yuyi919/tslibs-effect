/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Path, TypeId } from "effect/Path";
import { BadArgument } from "effect/PlatformError";
import * as NodePath from "node:path";
import * as NodeUrl from "node:url";
const fromFileUrl = url => Effect.try({
  try: () => NodeUrl.fileURLToPath(url),
  catch: cause => new BadArgument({
    module: "Path",
    method: "fromFileUrl",
    cause
  })
});
const toFileUrl = path => Effect.try({
  try: () => NodeUrl.pathToFileURL(path),
  catch: cause => new BadArgument({
    module: "Path",
    method: "toFileUrl",
    cause
  })
});
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerPosix = /*#__PURE__*/Layer.succeed(Path)({
  [TypeId]: TypeId,
  ...NodePath.posix,
  fromFileUrl,
  toFileUrl
});
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWin32 = /*#__PURE__*/Layer.succeed(Path)({
  [TypeId]: TypeId,
  ...NodePath.win32,
  fromFileUrl,
  toFileUrl
});
/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = /*#__PURE__*/Layer.succeed(Path)({
  [TypeId]: TypeId,
  ...NodePath,
  fromFileUrl,
  toFileUrl
});
//# sourceMappingURL=NodePath.js.map