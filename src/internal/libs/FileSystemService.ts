import { Schema } from "effect";
import type { File, OpenFlag, Size } from "effect/FileSystem";
import { FileSystem } from "effect/FileSystem";
import type { PlatformError } from "effect/PlatformError";
import type { Scope } from "effect/Scope";
import type { Sink } from "effect/Sink";

import * as Eff from "../../core/effect.js";
import * as Layer from "../../core/layer.js";
import { Memoize } from "../utils/decorators/index.js";
import { Glob } from "../utils/glob.js";
import { layerRealFs } from "./FileSystem/Backend.js";
import { Path } from "./FileSystem/Path.js";
import { BackendPlatformProvider } from "./FileSystem/Platform.js";

export declare namespace ApplicationFileSystem {
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
     * Read the destination of a symbolic link.
     */
    readonly readLink: (path: string) => Eff.Effect<string, PlatformError>;

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

  export interface ServiceWirteable {
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
    /**
     * Truncate a file to a specified length. If the `length` is not specified,
     * the file will be truncated to length `0`.
     */
    readonly truncate: (
      path: string,
      length?: bigint | number | Size
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Change the file system timestamps of the file at `path`.
     */
    readonly utimes: (
      path: string,
      atime: Date | number,
      mtime: Date | number
    ) => Eff.Effect<void, PlatformError>;
  }

  export interface ServiceExt {
    readonly isDir: (path: string) => Eff.Effect<boolean>;
    readonly isFile: (path: string) => Eff.Effect<boolean>;
    readonly existsSafe: (path: string) => Eff.Effect<boolean>;
    readonly readJson: (path: string) => Eff.Effect<unknown, Error>;
    readonly writeJson: (
      path: string,
      data: unknown,
      mode?: number
    ) => Eff.Effect<void, Error>;
    readonly ensureDir: (path: string) => Eff.Effect<void, Error>;
    readonly writeWithDirs: (
      path: string,
      content: string | Uint8Array,
      mode?: number
    ) => Eff.Effect<void, Error>;
    readonly readDirectoryEntries: (
      path: string
    ) => Eff.Effect<DirEntry[], Error>;
    readonly findUp: (
      target: string,
      start: string,
      stop?: string
    ) => Eff.Effect<string[], Error>;
    readonly up: (options: {
      targets: string[];
      start: string;
      stop?: string;
    }) => Eff.Effect<string[], Error>;
    readonly globUp: (
      pattern: string,
      start: string,
      stop?: string
    ) => Eff.Effect<string[], Error>;
    readonly glob: (
      pattern: string,
      options?: Glob.Options
    ) => Eff.Effect<string[], Error>;
    readonly globMatch: (pattern: string, filepath: string) => boolean;

    /**
     * Create a temporary directory.
     *
     * By default the directory will be created inside the system's default
     * temporary directory, but you can specify a different location by setting
     * the `directory` option.
     *
     * You can also specify a prefix for the directory name by setting the
     * `prefix` option.
     */
    readonly makeTempDirectory: (options?: {
      readonly directory?: string | undefined;
      readonly prefix?: string | undefined;
    }) => Eff.Effect<string, PlatformError>;
    /**
     * Create a temporary directory inside a scope.
     *
     * Functionally equivalent to `makeTempDirectory`, but the directory will be
     * automatically deleted when the scope is closed.
     */
    readonly makeTempDirectoryScoped: (options?: {
      readonly directory?: string | undefined;
      readonly prefix?: string | undefined;
    }) => Eff.Effect<string, PlatformError, Scope>;

    /**
     * Remove a file or directory.
     */
    readonly remove: (
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
     * Rename a file or directory.
     */
    readonly rename: (
      oldPath: string,
      newPath: string
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Create a writable `Sink` for the specified `path`.
     */
    readonly sink: (
      path: string,
      options?: {
        readonly flag?: OpenFlag | undefined;
        readonly mode?: number | undefined;
      }
    ) => Sink<void, Uint8Array, never, PlatformError>;
    /**
     * Copy a file from `fromPath` to `toPath`.
     */
    readonly copyFile: (
      fromPath: string,
      toPath: string
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Change the permissions of a file.
     */
    readonly chmod: (
      path: string,
      mode: number
    ) => Eff.Effect<void, PlatformError>;
    /**
     * Change the owner and group of a file.
     */
    readonly chown: (
      path: string,
      uid: number,
      gid: number
    ) => Eff.Effect<void, PlatformError>;
  }

  export interface Service
    extends ServiceReadonly,
      ServiceWirteable,
      ServiceExt {}
  export type ServiceProxy = Eff.Tag.Proxy<ApplicationFileSystem, Service>;

  export type Error = PlatformError | FileSystemError;

  export interface DirEntry {
    readonly name: string;
    readonly type: "file" | "directory" | "symlink" | "other";
  }
}

export class FileSystemError extends Schema.TaggedErrorClass<FileSystemError>()(
  "FileSystemError",
  {
    method: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  }
) {}

export class ApplicationFileSystem extends Eff.Service<ApplicationFileSystem>()(
  "@backend/platform/fs",
  {
    accessors: true,
    effect: Eff.gen(function* () {
      const fs = yield* FileSystem;
      const { join, dirname } = yield* Path;
      const readonly: ApplicationFileSystem.ServiceReadonly = {
        access: fs.access,
        exists: fs.exists,
        stat: fs.stat,
        lstat: fs.stat, // TODO: Check this is correct.
        readLink: fs.readLink, // TODO: Check this is correct.
        readdir: fs.readDirectory,
        readdirWithType: (
          path: string,
          options?: { readonly recursive?: boolean | undefined }
        ) =>
          fs.readDirectory(path, {
            ...options,
            withFileTypes: true,
          } as any) as unknown as Eff.Effect<
            import("node:fs").Dirent[],
            PlatformError,
            never
          >,
        readFile: fs.readFile,
        readFileString: fs.readFileString,
      };

      const existsSafe = Eff.fn("FileSystem.existsSafe")(function* (
        path: string
      ) {
        return yield* fs.exists(path).pipe(Eff.orElseSucceed(() => false));
      });

      const isDir = Eff.fn("FileSystem.isDir")(function* (path: string) {
        const info = yield* fs.stat(path).pipe(Eff.catch(() => Eff.void));
        return info?.type === "Directory";
      });

      const isFile = Eff.fn("FileSystem.isFile")(function* (path: string) {
        const info = yield* fs.stat(path).pipe(Eff.catch(() => Eff.void));
        return info?.type === "File";
      });

      const readDirectoryEntries = Eff.fn("FileSystem.readDirectoryEntries")(
        function* (
          dirPath: string,
          options?: { readonly recursive?: boolean | undefined }
        ) {
          const entries = yield* fs.readDirectory(dirPath, {
            // @ts-expect-error
            withFileTypes: true,
            ...options,
          });
          return yield* Eff.tryPromise({
            try: async () => {
              return (entries as unknown as import("node:fs").Dirent[]).map(
                (e): ApplicationFileSystem.DirEntry => ({
                  name: e.name,
                  type: e.isDirectory()
                    ? "directory"
                    : e.isSymbolicLink()
                      ? "symlink"
                      : e.isFile()
                        ? "file"
                        : "other",
                })
              );
            },
            catch: (cause) =>
              new FileSystemError({ method: "readDirectoryEntries", cause }),
          });
        }
      );

      const readJson = Eff.fn("FileSystem.readJson")(function* (path: string) {
        const text = yield* fs.readFileString(path);
        return JSON.parse(text);
      });

      const writeJson = Eff.fn("FileSystem.writeJson")(function* (
        path: string,
        data: unknown,
        mode?: number
      ) {
        const content = JSON.stringify(data, null, 2);
        yield* fs.writeFileString(path, content);
        if (mode) yield* fs.chmod(path, mode);
      });

      const ensureDir = Eff.fn("FileSystem.ensureDir")(function* (
        path: string
      ) {
        yield* fs.makeDirectory(path, { recursive: true });
      });

      const writeWithDirs = Eff.fn("FileSystem.writeWithDirs")(function* (
        path: string,
        content: string | Uint8Array,
        mode?: number
      ) {
        const write =
          typeof content === "string"
            ? fs.writeFileString(path, content)
            : fs.writeFile(path, content);

        yield* write.pipe(
          Eff.catchIf(
            (e) => e.reason._tag === "NotFound",
            () =>
              Eff.gen(function* () {
                yield* fs.makeDirectory(dirname(path), { recursive: true });
                yield* write;
              })
          )
        );
        if (mode) yield* fs.chmod(path, mode);
      });

      const glob = Eff.fn("FileSystem.glob")(function* (
        pattern: string,
        options?: Glob.Options
      ) {
        return yield* Eff.tryPromise({
          try: () => Glob.scan(pattern, options),
          catch: (cause) => new FileSystemError({ method: "glob", cause }),
        });
      });

      const findUp = Eff.fn("FileSystem.findUp")(function* (
        target: string,
        start: string,
        stop?: string
      ) {
        const result: string[] = [];
        let current = start;
        while (true) {
          const search = join(current, target);
          if (yield* fs.exists(search)) result.push(search);
          if (stop === current) break;
          const parent = dirname(current);
          if (parent === current) break;
          current = parent;
        }
        return result;
      });

      const up = Eff.fn("FileSystem.up")(function* (options: {
        targets: string[];
        start: string;
        stop?: string;
      }) {
        const result: string[] = [];
        let current = options.start;
        while (true) {
          for (const target of options.targets) {
            const search = join(current, target);
            if (yield* fs.exists(search)) result.push(search);
          }
          if (options.stop === current) break;
          const parent = dirname(current);
          if (parent === current) break;
          current = parent;
        }
        return result;
      });

      const globUp = Eff.fn("FileSystem.globUp")(function* (
        pattern: string,
        start: string,
        stop?: string
      ) {
        const result: string[] = [];
        let current = start;
        while (true) {
          const matches = yield* glob(pattern, {
            cwd: current,
            absolute: true,
            include: "file",
            dot: true,
          }).pipe(Eff.catch(() => Eff.succeed([] as string[])));
          result.push(...matches);
          if (stop === current) break;
          const parent = dirname(current);
          if (parent === current) break;
          current = parent;
        }
        return result;
      });

      return {
        ...readonly,
        mkdir: fs.makeDirectory,
        rm: fs.remove,
        writeFile: fs.writeFile,
        writeFileString: fs.writeFileString,

        utimes: fs.utimes,
        truncate: fs.truncate,

        makeTempDirectoryScoped: fs.makeTempDirectoryScoped,
        makeTempDirectory: fs.makeTempDirectory,
        remove: fs.remove,
        rename: fs.rename,
        sink: fs.sink,
        copyFile: fs.copyFile,
        chmod: fs.chmod,
        chown: fs.chown,
        existsSafe,
        isDir,
        isFile,
        readDirectoryEntries,
        readJson,
        writeJson,
        ensureDir,
        writeWithDirs,
        findUp,
        up,
        globUp,
        glob,
        globMatch: Glob.match,
      } satisfies ApplicationFileSystem.Service;
    }),
  }
) {
  static layer = this.Default;

  /**
   * @deprecated
   */
  static get defaultLayer() {
    return this.layer;
  }

  @Memoize
  static get layerReal(): Layer.Layer<
    BackendPlatformProvider | FileSystem | Path | ApplicationFileSystem
  > {
    return this.layer.pipe(Layer.provideMerge(layerRealFs()));
  }
}

export type FsServiceProxy = ApplicationFileSystem.ServiceProxy;
export { BackendPlatformProvider };
