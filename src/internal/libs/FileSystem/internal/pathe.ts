import { dirname, join, resolve } from "node:path";
import { Layer } from "effect";
import { Path as PlatformPath, TypeId } from "effect/Path";
import { BadArgument } from "effect/PlatformError";
import * as Eff from "../../../../core/effect.js";
import * as p from "../../../utils/pathe/index.js";

export const Pathe = Layer.suspend(() =>
  Layer.succeed(
    PlatformPath,
    PlatformPath.of({
      basename: p.basename,
      dirname: (path) => p.normalize(dirname(path)),
      extname: p.extname,
      format: p.format,
      isAbsolute: p.isAbsolute,
      join: (...path) => p.normalize(join(...path)),
      //   matchesGlob: p.matchesGlob,
      normalize: p.normalize,
      //   normalizeString: p.normalizeString,
      parse: p.parse,
      relative: p.relative,
      resolve: (...path) => p.normalize(resolve(...path)),
      sep: p.sep,
      toNamespacedPath: p.toNamespacedPath,
      [TypeId]: TypeId,
      fromFileUrl: function (url: URL): Eff.Effect<string, BadArgument> {
        throw new Error("Function not implemented.");
      },
      toFileUrl: function (path: string): Eff.Effect<URL, BadArgument> {
        throw new Error("Function not implemented.");
      },
    })
  )
);
