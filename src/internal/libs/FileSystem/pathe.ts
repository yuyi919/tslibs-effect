import { Path as PlatformPath, TypeId } from "effect/Path";
import { BadArgument } from "effect/PlatformError";
import * as Eff from "../../../core/effect";
import * as p from "../../utils/pathe/_path";

export const Pathe = PlatformPath.of({
  basename: p.basename,
  dirname: p.dirname,
  extname: p.extname,
  format: p.format,
  isAbsolute: p.isAbsolute,
  join: p.join,
  //   matchesGlob: p.matchesGlob,
  normalize: p.normalize,
  //   normalizeString: p.normalizeString,
  parse: p.parse,
  relative: p.relative,
  resolve: p.resolve,
  sep: p.sep,
  toNamespacedPath: p.toNamespacedPath,
  [TypeId]: TypeId,
  fromFileUrl: function (url: URL): Eff.Effect<string, BadArgument> {
    throw new Error("Function not implemented.");
  },
  toFileUrl: function (path: string): Eff.Effect<URL, BadArgument> {
    throw new Error("Function not implemented.");
  },
});
