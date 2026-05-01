import { File, FileSystem, OpenFlag } from "effect/FileSystem";
import { PlatformError } from "effect/PlatformError";
import * as Eff from "../core/effect";
import * as Layer from "../core/layer";
import { Memoize } from "./decorators";
import { layerRealFs } from "./FileSystem/Backend";

export declare namespace PlatformFS {
  export interface ServiceReadonly {
    /**
     * Check if a file can be accessed.
     * You can optionally specify the level of access to check for.
     */
    readonly access: (
      path: string,
      options?: {
        readonly ok?: boolean | undefined;
        readonly readable?: boolean | undefined;
        readonly writable?: boolean | undefined;
      }
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Check if a path exists.
     */
    readonly exists: (path: string) => Eff.Effect<boolean, PlatformError>;

    /**
     * List the contents of a directory.
     *
     * You can recursively list the contents of nested directories by setting the
     * `recursive` option.
     */
    readonly readdir: (
      path: string,
      options?: {
        readonly recursive?: boolean | undefined;
      }
    ) => Eff.Effect<Array<string>, PlatformError>;

    readonly readdirWithType: (
      path: string,
      options?: { readonly recursive?: boolean | undefined }
    ) => Eff.Effect<Array<import("node:fs").Dirent>, PlatformError>;

    /**
     * Get information about a file at `path`.
     */
    readonly stat: (path: string) => Eff.Effect<File.Info, PlatformError>;

    /**
     * Get information about a file at `path`, preserving symbolic links.
     */
    readonly lstat: (path: string) => Eff.Effect<File.Info, PlatformError>;

    /**
     * Read the contents of a file.
     */
    readonly readFile: (path: string) => Eff.Effect<Uint8Array, PlatformError>;
    /**
     * Read the contents of a file.
     */
    readonly readFileString: (
      path: string,
      encoding?: string
    ) => Eff.Effect<string, PlatformError>;
  }

  export interface Service extends ServiceReadonly {
    /**
     * Remove a file or directory.
     */
    readonly rm: (
      path: string,
      options?: {
        /**
         * When `true`, you can recursively remove nested directories.
         */
        readonly recursive?: boolean | undefined;
        /**
         * When `true`, exceptions will be ignored if `path` does not exist.
         */
        readonly force?: boolean | undefined;
      }
    ) => Eff.Effect<void, PlatformError>;

    /**
     * Create a directory at `path`. You can optionally specify the mode and
     * whether to recursively create nested directories.
     */
    readonly mkdir: (
      path: string,
      options?: {
        readonly recursive?: boolean | undefined;
        readonly mode?: number | undefined;
      }
    ) => Eff.Effect<void, PlatformError>;

    /**
     * Write data to a file at `path`.
     */
    readonly writeFile: (
      path: string,
      data: Uint8Array,
      options?: {
        readonly flag?: OpenFlag | undefined;
        readonly mode?: number | undefined;
      }
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Write a string to a file at `path`.
     */
    readonly writeFileString: (
      path: string,
      data: string,
      options?: {
        readonly flag?: OpenFlag | undefined;
        readonly mode?: number | undefined;
      }
    ) => Eff.Effect<void, PlatformError>;
  }
  export type ServiceProxy = Eff.Tag.Proxy<PlatformFS, Service>;
}

export class PlatformFS extends Eff.Service<PlatformFS>()(
  "@backend/platform/fs",
  {
    effect: Eff.gen(function* () {
      const backendFs = yield* FileSystem;
      const read: PlatformFS.ServiceReadonly = {
        access: backendFs.access,
        exists: backendFs.exists,
        stat: backendFs.stat,
        lstat: backendFs.stat, // TODO: Check this is correct.
        readdir: backendFs.readDirectory,
        readdirWithType: (
          path: string,
          options?: { readonly recursive?: boolean | undefined }
        ) =>
          backendFs.readDirectory(path, {
            ...options,
            withFileTypes: true,
          } as any) as unknown as Eff.Effect<
            import("node:fs").Dirent[],
            PlatformError,
            never
          >,
        readFile: backendFs.readFile,
        readFileString: backendFs.readFileString,
      };
      return {
        ...read,
        mkdir: backendFs.makeDirectory,
        rm: backendFs.remove,
        writeFile: backendFs.writeFile,
        writeFileString: backendFs.writeFileString,
      } as PlatformFS.Service;
    }),
  }
) {
  static layer = this.Default;

  @Memoize
  static get layerReal() {
    return this.layer.pipe(Layer.provideMerge(layerRealFs()));
  }
}

export type FsServiceProxy = PlatformFS.ServiceProxy;
