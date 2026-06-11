import type { PathLike } from "node:fs";
import type { SystemError, SystemErrorTag } from "effect/PlatformError";
import * as PlatformError from "effect/PlatformError";
import { errorMessage } from "../../../utils/error.js";

export const errnoExceptionToTag = (
  code?: string
): PlatformError.SystemErrorTag => {
  switch (code) {
    case "ENOENT":
      return "NotFound";
    case "EACCES":
      return "PermissionDenied";
    case "EEXIST":
      return "AlreadyExists";
    case "EISDIR":
    case "ENOTDIR":
      return "BadResource";
    case "EBUSY":
      return "Busy";
    case "ELOOP":
      return "BadResource";
    default:
      return "Unknown";
  }
};

/** @internal */
export const handleErrnoException =
  (module: SystemError["module"], method: string) =>
  (
    err: NodeJS.ErrnoException,
    [path]: [path: PathLike | number, ...args: Array<any>]
  ): PlatformError.PlatformError => {
    let reason: SystemErrorTag = errnoExceptionToTag(err.code);

    return PlatformError.systemError({
      _tag: reason,
      module,
      method,
      pathOrDescriptor: path as string | number,
      syscall: err.syscall,
      cause: err,
    });
  };

export const handleBadArgument = (method: string) => (err: unknown) =>
  PlatformError.badArgument({
    module: "FileSystem",
    method,
    description: errorMessage(err),
  });
