/**
 * @since 4.0.0
 */

import * as Crypto from "node:crypto";
import type * as NFS from "node:fs";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { effectify } from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import { pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Error from "effect/PlatformError";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { omitBy } from "es-toolkit";
import { errorMessage, unknownError } from "../../utils/error";
import { CurrentWorkingDirectory } from "./Cwd";
import { handleBadArgument, handleErrnoException } from "./internal/utils";
import { BackendPlatformProvider } from "./Platform";

export function makeOfficialFileSystem(cwd?: string) {
  const makeFileSystem = Effect.flatMap(
    Effect.all({
      backend: Effect.serviceOption(FileSystem.WatchBackend),
      platform: Effect.fromYieldable(BackendPlatformProvider),
    }),
    Effect.fnUntraced(function* ({
      platform: { Os: OS, path, fs: NFS },
      backend,
    }) {
      // 解析并标准化传入的 cwd
      const resolvedCwd = cwd ? cwd : yield* CurrentWorkingDirectory;
      const resolve = (p: string) =>
        resolvedCwd ? path.resolve(resolvedCwd, p) : p;

      // == access
      const access = ((): FileSystem.FileSystem["access"] => {
        const nodeAccess = effectify(
          NFS.access,
          handleErrnoException("FileSystem", "access"),
          handleBadArgument("access")
        );
        return (path, options) => {
          let mode = NFS.constants.F_OK;
          if (options?.readable) {
            mode |= NFS.constants.R_OK;
          }
          if (options?.writable) {
            mode |= NFS.constants.W_OK;
          }
          return nodeAccess(resolve(path), mode);
        };
      })();

      // == copy
      const copy = ((): FileSystem.FileSystem["copy"] => {
        const nodeCp = effectify(
          NFS.cp,
          handleErrnoException("FileSystem", "copy"),
          handleBadArgument("copy")
        );
        return (fromPath, toPath, options) =>
          nodeCp(resolve(fromPath), resolve(toPath), {
            force: options?.overwrite ?? false,
            preserveTimestamps: options?.preserveTimestamps ?? false,
            recursive: true,
          });
      })();

      // == copyFile
      const copyFile = (() => {
        const nodeCopyFile = effectify(
          NFS.copyFile,
          handleErrnoException("FileSystem", "copyFile"),
          handleBadArgument("copyFile")
        );
        return (fromPath: string, toPath: string) =>
          nodeCopyFile(resolve(fromPath), resolve(toPath));
      })();

      // == chmod
      const chmod = (() => {
        const nodeChmod = effectify(
          NFS.chmod,
          handleErrnoException("FileSystem", "chmod"),
          handleBadArgument("chmod")
        );
        return (path: string, mode: number) => nodeChmod(resolve(path), mode);
      })();

      // == chown
      const chown = (() => {
        const nodeChown = effectify(
          NFS.chown,
          handleErrnoException("FileSystem", "chown"),
          handleBadArgument("chown")
        );
        return (path: string, uid: number, gid: number) =>
          nodeChown(resolve(path), uid, gid);
      })();

      // == link
      const link = (() => {
        const nodeLink = effectify(
          NFS.link,
          handleErrnoException("FileSystem", "link"),
          handleBadArgument("link")
        );
        return (existingPath: string, newPath: string) =>
          nodeLink(resolve(existingPath), resolve(newPath));
      })();

      // == makeDirectory
      const makeDirectory = ((): FileSystem.FileSystem["makeDirectory"] => {
        const nodeMkdir = effectify(
          NFS.mkdir,
          handleErrnoException("FileSystem", "makeDirectory"),
          handleBadArgument("makeDirectory")
        );
        return (path, options) =>
          nodeMkdir(resolve(path), {
            recursive: options?.recursive ?? false,
            mode: options?.mode,
          });
      })();

      // == makeTempDirectory
      const makeTempDirectoryFactory = (
        method: string
      ): FileSystem.FileSystem["makeTempDirectory"] => {
        const nodeMkdtemp = effectify(
          NFS.mkdtemp,
          handleErrnoException("FileSystem", method),
          handleBadArgument(method)
        );
        return (options) =>
          Effect.suspend(() => {
            const prefix = options?.prefix ?? "";
            let directory =
              typeof options?.directory === "string"
                ? resolve(options.directory)
                : OS.tmpdir();
            // 确保目录路径以分隔符结尾
            directory = path.join(directory, ".");
            return nodeMkdtemp(
              prefix ? path.join(directory, prefix) : directory + "/"
            );
          });
      };
      const makeTempDirectory = makeTempDirectoryFactory("makeTempDirectory");

      // == remove
      const removeFactory = (
        method: string
      ): FileSystem.FileSystem["remove"] => {
        const nodeRm = effectify(
          NFS.rm,
          handleErrnoException("FileSystem", method),
          handleBadArgument(method)
        );
        return (path, options) =>
          nodeRm(resolve(path), {
            recursive: options?.recursive ?? false,
            force: options?.force ?? false,
          });
      };
      const remove = removeFactory("remove");

      // == makeTempDirectoryScoped
      const makeTempDirectoryScoped =
        ((): FileSystem.FileSystem["makeTempDirectoryScoped"] => {
          const makeDirectory = makeTempDirectoryFactory(
            "makeTempDirectoryScoped"
          );
          const removeDirectory = removeFactory("makeTempDirectoryScoped");
          return (options) =>
            Effect.acquireRelease(makeDirectory(options), (directory) =>
              Effect.orDie(removeDirectory(directory, { recursive: true }))
            );
        })();

      // == open
      const openFactory = (method: string): FileSystem.FileSystem["open"] => {
        const nodeOpen = effectify(
          NFS.open,
          handleErrnoException("FileSystem", method),
          handleBadArgument(method)
        );
        const nodeClose = effectify(
          NFS.close,
          handleErrnoException("FileSystem", method),
          handleBadArgument(method)
        );

        return (path, options) =>
          pipe(
            Effect.acquireRelease(
              nodeOpen(resolve(path), options?.flag ?? "r", options?.mode),
              (fd) => Effect.orDie(nodeClose(fd))
            ),
            Effect.map((fd) =>
              makeFile(
                FileSystem.FileDescriptor(fd),
                options?.flag?.startsWith("a") ?? false
              )
            )
          );
      };
      const open = openFactory("open");

      const makeFile = (() => {
        const nodeReadFactory = (method: string) =>
          effectify(
            NFS.read,
            handleErrnoException("FileSystem", method),
            handleBadArgument(method)
          );
        const nodeRead = nodeReadFactory("read");
        const nodeReadAlloc = nodeReadFactory("readAlloc");
        const nodeStat = effectify(
          NFS.fstat,
          handleErrnoException("FileSystem", "stat"),
          handleBadArgument("stat")
        );
        const nodeTruncate = effectify(
          NFS.ftruncate,
          handleErrnoException("FileSystem", "truncate"),
          handleBadArgument("truncate")
        );

        const nodeSync = effectify(
          NFS.fsync,
          handleErrnoException("FileSystem", "sync"),
          handleBadArgument("sync")
        );

        const nodeWriteFactory = (method: string) =>
          effectify(
            NFS.write,
            handleErrnoException("FileSystem", method),
            handleBadArgument(method)
          );
        const nodeWrite = nodeWriteFactory("write");
        const nodeWriteAll = nodeWriteFactory("writeAll");

        class FileImpl implements FileSystem.File {
          readonly [FileSystem.FileTypeId]: typeof FileSystem.FileTypeId;
          readonly fd: FileSystem.File.Descriptor;
          private readonly append: boolean;

          private position: bigint = BigInt(0);

          constructor(fd: FileSystem.File.Descriptor, append: boolean) {
            this[FileSystem.FileTypeId] = FileSystem.FileTypeId;
            this.fd = fd;
            this.append = append;
          }

          get stat() {
            return Effect.map(nodeStat(this.fd), makeFileInfo);
          }

          get sync() {
            return nodeSync(this.fd);
          }

          seek(offset: FileSystem.SizeInput, from: FileSystem.SeekMode) {
            const offsetSize = FileSystem.Size(offset);
            return Effect.sync(() => {
              if (from === "start") {
                this.position = offsetSize;
              } else if (from === "current") {
                this.position = this.position + offsetSize;
              }

              return this.position;
            });
          }

          read(buffer: Uint8Array) {
            return Effect.suspend(() => {
              const position = this.position;
              return Effect.map(
                nodeRead(this.fd, { buffer, position }),
                (bytesRead) => {
                  const sizeRead = FileSystem.Size(bytesRead);
                  this.position = position + sizeRead;
                  return sizeRead;
                }
              );
            });
          }

          readAlloc(size: FileSystem.SizeInput) {
            const sizeNumber = Number(size);
            return Effect.suspend(() => {
              const buffer = Buffer.allocUnsafeSlow(sizeNumber);
              const position = this.position;
              return Effect.map(
                nodeReadAlloc(this.fd, { buffer, position }),
                (bytesRead): Option.Option<Buffer> => {
                  if (bytesRead === 0) {
                    return Option.none();
                  }

                  this.position = position + BigInt(bytesRead);
                  if (bytesRead === sizeNumber) {
                    return Option.some(buffer);
                  }

                  const dst = Buffer.allocUnsafeSlow(bytesRead);
                  buffer.copy(dst, 0, 0, bytesRead);
                  return Option.some(dst);
                }
              );
            });
          }

          truncate(length?: FileSystem.SizeInput) {
            return Effect.map(
              nodeTruncate(this.fd, length ? Number(length) : undefined),
              () => {
                if (!this.append) {
                  const len = BigInt(length ?? 0);
                  if (this.position > len) {
                    this.position = len;
                  }
                }
              }
            );
          }

          write(buffer: Uint8Array) {
            return Effect.suspend(() => {
              const position = this.position;
              return Effect.map(
                nodeWrite(
                  this.fd,
                  buffer,
                  undefined,
                  undefined,
                  this.append ? undefined : Number(position)
                ),
                (bytesWritten) => {
                  const sizeWritten = FileSystem.Size(bytesWritten);
                  if (!this.append) {
                    this.position = position + sizeWritten;
                  }
                  return sizeWritten;
                }
              );
            });
          }

          private writeAllChunk(
            buffer: Uint8Array
          ): Effect.Effect<void, Error.PlatformError> {
            return Effect.suspend(() => {
              const position = this.position;
              return Effect.flatMap(
                nodeWriteAll(
                  this.fd,
                  buffer,
                  undefined,
                  undefined,
                  this.append ? undefined : Number(position)
                ),
                (bytesWritten) => {
                  if (bytesWritten === 0) {
                    return Effect.fail(
                      Error.systemError({
                        module: "FileSystem",
                        method: "writeAll",
                        _tag: "WriteZero",
                        pathOrDescriptor: this.fd,
                        description: "write returned 0 bytes written",
                      })
                    );
                  }

                  if (!this.append) {
                    this.position = position + BigInt(bytesWritten);
                  }

                  return bytesWritten < buffer.length
                    ? this.writeAllChunk(buffer.subarray(bytesWritten))
                    : Effect.void;
                }
              );
            });
          }

          writeAll(buffer: Uint8Array) {
            return this.writeAllChunk(buffer);
          }
        }

        return (
          fd: FileSystem.File.Descriptor,
          append: boolean
        ): FileSystem.File => new FileImpl(fd, append);
      })();

      // == makeTempFile
      const makeTempFileFactory = (
        method: string
      ): FileSystem.FileSystem["makeTempFile"] => {
        const makeDirectory = makeTempDirectoryFactory(method);
        return Effect.fnUntraced(function* (options) {
          const directory = yield* makeDirectory(options);
          const random = Crypto.randomBytes(6).toString("hex");
          const name = path.join(
            directory,
            options?.suffix ? `${random}${options.suffix}` : random
          );
          yield* writeFile(name, new Uint8Array(0));
          return name;
        });
      };
      const makeTempFile = makeTempFileFactory("makeTempFile");

      // == makeTempFileScoped
      const makeTempFileScoped =
        ((): FileSystem.FileSystem["makeTempFileScoped"] => {
          const makeFile = makeTempFileFactory("makeTempFileScoped");
          const removeDirectory = removeFactory("makeTempFileScoped");
          return (options) =>
            Effect.acquireRelease(makeFile(options), (file) =>
              Effect.orDie(
                removeDirectory(path.dirname(file), { recursive: true })
              )
            );
        })();

      // == readDirectory
      const readDirectory: FileSystem.FileSystem["readDirectory"] = (
        path,
        options
      ) =>
        Effect.tryPromise({
          try: () => NFS.promises.readdir(resolve(path), options),
          catch: (err) =>
            handleErrnoException("FileSystem", "readDirectory")(err as any, [
              path,
            ]),
        });

      // == readFile
      const readFile = (path: string) =>
        Effect.callback<Uint8Array, Error.PlatformError>((resume, signal) => {
          try {
            NFS.readFile(resolve(path), { signal }, (err, data) => {
              if (err) {
                resume(
                  Effect.fail(
                    handleErrnoException("FileSystem", "readFile")(err, [path])
                  )
                );
              } else {
                resume(Effect.succeed(data));
              }
            });
          } catch (err) {
            resume(Effect.fail(handleBadArgument("readFile")(err)));
          }
        });

      // == readLink
      const readLink = (() => {
        const nodeReadLink = effectify(
          NFS.readlink,
          handleErrnoException("FileSystem", "readLink"),
          handleBadArgument("readLink")
        );
        return (path: string) => nodeReadLink(resolve(path));
      })();

      // == realPath
      const realPath = (() => {
        const nodeRealPath = effectify(
          NFS.realpath,
          handleErrnoException("FileSystem", "realPath"),
          handleBadArgument("realPath")
        );
        return (path: string) => nodeRealPath(resolve(path));
      })();

      // == rename
      const rename = (() => {
        const nodeRename = effectify(
          NFS.rename,
          handleErrnoException("FileSystem", "rename"),
          handleBadArgument("rename")
        );
        return (oldPath: string, newPath: string) =>
          nodeRename(resolve(oldPath), resolve(newPath));
      })();

      // == stat
      const makeFileInfo = (stat: NFS.Stats): FileSystem.File.Info => ({
        type: stat.isFile()
          ? "File"
          : stat.isDirectory()
            ? "Directory"
            : stat.isSymbolicLink()
              ? "SymbolicLink"
              : stat.isBlockDevice()
                ? "BlockDevice"
                : stat.isCharacterDevice()
                  ? "CharacterDevice"
                  : stat.isFIFO()
                    ? "FIFO"
                    : stat.isSocket()
                      ? "Socket"
                      : "Unknown",
        mtime: Option.fromNullishOr(stat.mtime),
        atime: Option.fromNullishOr(stat.atime),
        birthtime: Option.fromNullishOr(stat.birthtime),
        dev: stat.dev,
        rdev: Option.fromNullishOr(stat.rdev),
        ino: Option.fromNullishOr(stat.ino),
        mode: stat.mode,
        nlink: Option.fromNullishOr(stat.nlink),
        uid: Option.fromNullishOr(stat.uid),
        gid: Option.fromNullishOr(stat.gid),
        size: FileSystem.Size(stat.size),
        blksize:
          stat.blksize !== undefined
            ? Option.some(FileSystem.Size(stat.blksize))
            : Option.none(),
        blocks: Option.fromNullishOr(stat.blocks),
      });
      const stat = (() => {
        const nodeStat = effectify(
          NFS.stat,
          handleErrnoException("FileSystem", "stat"),
          handleBadArgument("stat")
        );
        return (path: string) =>
          Effect.mapEager(nodeStat(resolve(path)), makeFileInfo);
      })();

      // == symlink
      const symlink = (() => {
        const nodeSymlink = effectify(
          NFS.symlink,
          handleErrnoException("FileSystem", "symlink"),
          handleBadArgument("symlink")
        );
        return (target: string, path: string) =>
          nodeSymlink(target, resolve(path)); // target 不解析，保持相对路径语义
      })();

      // == truncate
      const truncate = (() => {
        const nodeTruncate = effectify(
          NFS.truncate,
          handleErrnoException("FileSystem", "truncate"),
          handleBadArgument("truncate")
        );
        return (path: string, length?: FileSystem.SizeInput) =>
          nodeTruncate(
            resolve(path),
            length !== undefined ? Number(length) : undefined
          );
      })();

      // == utimes
      const utimes = (() => {
        const nodeUtimes = effectify(
          NFS.utimes,
          handleErrnoException("FileSystem", "utime"),
          handleBadArgument("utime")
        );
        return (path: string, atime: number | Date, mtime: number | Date) =>
          nodeUtimes(resolve(path), atime, mtime);
      })();

      // == watch (改进后的实现，支持 cwd 和回调路径拼接)
      const watchNode = (absolutePath: string) => {
        return Stream.unwrap(
          Effect.abortSignal.pipe(
            Effect.mapEager((signal) => {
              console.log("NFS.watch.watchNode", absolutePath);
              return Stream.fromAsyncIterable(
                NFS.promises.watch(absolutePath, {
                  recursive: true,
                  signal,
                }),
                (error) =>
                  Error.systemError({
                    module: "FileSystem",
                    _tag: "Unknown",
                    method: "watch",
                    pathOrDescriptor: absolutePath,
                    cause: error,
                  })
              ).pipe(
                Stream.map((e): FileSystem.WatchEvent | null => {
                  console.log("NFS.watch", e.eventType, e.filename);
                  if (!e.filename) return null;
                  const fullPath = path.join(absolutePath, e.filename);
                  switch (e.eventType) {
                    case "rename": {
                      try {
                        NFS.statSync(fullPath);
                        return {
                          _tag: "Create",
                          path: fullPath,
                        };
                      } catch (error) {
                        return {
                          _tag: "Remove",
                          path: fullPath,
                        };
                      }
                    }
                    case "change": {
                      return {
                        _tag: "Update",
                        path: fullPath,
                      };
                    }
                  }
                }),
                Stream.filter((e) => e !== null)
              );
            })
          )
        );
        // console.log("NFS.watch.watchNode", absolutePath);
        // return Stream.callback<FileSystem.WatchEvent, Error.PlatformError>(
        //   (queue) => {
        //     // console.log("NFS.watch.watchNode", absolutePath);
        //     const watcher = NFS.watch(
        //       absolutePath,
        //       {
        //         recursive: true,
        //       },
        //       (event, relativePath) => {
        //         // console.log("NFS.watch", event, relativePath);
        //         if (!relativePath) return;
        //         // 将回调中的相对路径转为绝对路径
        //         const fullPath = path.join(absolutePath, relativePath);
        //         switch (event) {
        //           case "rename": {
        //             try {
        //               NFS.statSync(fullPath);
        //               Queue.offerUnsafe(queue, {
        //                 _tag: "Create",
        //                 path: fullPath,
        //               });
        //             } catch (error) {
        //               Queue.offerUnsafe(queue, {
        //                 _tag: "Remove",
        //                 path: fullPath,
        //               });
        //             }
        //             // Effect.runPromise(
        //             //   Effect.matchCauseEffectEager(stat, makeFileInfo, {
        //             //     onSuccess: (_) =>
        //             //       Queue.offer(queue, {
        //             //         _tag: "Create",
        //             //         path: fullPath,
        //             //       }),
        //             //     onFailure: (_) =>
        //             //       Queue.offer(queue, {
        //             //         _tag: "Remove",
        //             //         path: fullPath,
        //             //       }),
        //             //   })
        //             // );
        //             return;
        //           }
        //           case "change": {
        //             Queue.offerUnsafe(queue, {
        //               _tag: "Update",
        //               path: fullPath,
        //             });
        //             return;
        //           }
        //         }
        //       }
        //     );
        //     watcher.on("error", (error) => {
        //       Queue.failCauseUnsafe(
        //         queue,
        //         Cause.fail(
        //           Error.systemError({
        //             module: "FileSystem",
        //             _tag: "Unknown",
        //             method: "watch",
        //             pathOrDescriptor: absolutePath,
        //             cause: error,
        //           })
        //         )
        //       );
        //     });
        //     watcher.on("close", () => {
        //       // console.log("NFS.watch.close");
        //       Queue.endUnsafe(queue);
        //     });
        //     return Effect.acquireRelease(Effect.succeed(watcher), (watcher) =>
        //       Effect.sync(() => {
        //         watcher.close();
        //       })
        //     );
        //   }
        // );
      };
      const watch = (
        backend: Option.Option<FileSystem.WatchBackend["Service"]>,
        path: string
      ) => {
        const resolvedPath = resolve(path);
        return backend.pipe(
          Option.map((_) =>
            Stream.unwrap(
              Effect.mapEager(stat(resolvedPath), (stat) =>
                _.register(resolvedPath, stat).pipe(
                  Option.getOrElse(() => watchNode(resolvedPath))
                )
              )
            )
          ),
          Option.getOrElse(() => watchNode(resolvedPath))
        );
      };

      // == writeFile
      const writeFile: FileSystem.FileSystem["writeFile"] = (
        path,
        data,
        options
      ) =>
        Effect.callback<void, Error.PlatformError>((resume, signal) => {
          try {
            NFS.writeFile(
              resolve(path),
              data,
              omitBy(
                {
                  signal,
                  ...options,
                },
                (value) => value === undefined
              ),
              (err) => {
                if (err) {
                  resume(
                    Effect.fail(
                      handleErrnoException("FileSystem", "writeFile")(err, [
                        path,
                      ])
                    )
                  );
                } else {
                  resume(Effect.void);
                }
              }
            );
          } catch (err) {
            console.error(err);
            resume(Effect.fail(handleBadArgument("writeFile")(err)));
          }
        });

      return FileSystem.make({
        access,
        chmod,
        chown,
        copy,
        copyFile,
        link,
        makeDirectory,
        makeTempDirectory,
        makeTempDirectoryScoped,
        makeTempFile,
        makeTempFileScoped,
        open,
        readDirectory,
        readFile,
        readLink,
        realPath,
        remove,
        rename,
        stat,
        symlink,
        truncate,
        utimes,
        watch(path) {
          return watch(backend, path);
        },
        writeFile,
      });
    })
  );

  /**
   * @since 1.0.0
   * @category Layers
   */
  const layer = Layer.effect(FileSystem.FileSystem, makeFileSystem);
  return layer;
}
