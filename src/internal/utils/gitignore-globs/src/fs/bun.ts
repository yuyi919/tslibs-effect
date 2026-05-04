import * as fs from "node:fs/promises";
import { joinPosix } from "../path";
import type { ReadonlyFS, StatLike } from "../types";

export function createBunFS(): ReadonlyFS {
  return {
    async readFile(path: string) {
      return fs.readFile(path, "utf-8");
      return await Bun.file(path).text();
    },
    async readBytes(path: string) {
      return fs.readFile(path);
      return await Bun.file(path).bytes();
    },
    async stat(path: string): Promise<StatLike> {
      return fs.stat(path);
      return await Bun.file(path).stat();
    },
    async readdir(dirPath: string): Promise<string[]> {
      return fs.readdir(dirPath);
      // Bun.Glob 默认只返回文件；要包含目录必须 onlyFiles: false
      const entries = new Bun.Glob("*");
      const names: string[] = [];
      for await (const name of entries.scan({
        cwd: dirPath,
        dot: true,
        onlyFiles: false,
      })) {
        names.push(String(name));
      }
      return names;
    },
  };
}

export function existsBun(path: string): Promise<boolean> {
  return Bun.file(path)
    .stat()
    .then(() => true)
    .catch(() => false);
}

export function resolveInRoot(rootDir: string, rel: string) {
  return joinPosix(rootDir, rel);
}
