import * as fs from "node:fs/promises";
import { joinPosix } from "../path.js";
import type { ReadonlyFS, StatLike } from "../types.js";

export function createBunFS(): ReadonlyFS {
  return {
    async readFile(path: string) {
      return fs.readFile(path, "utf-8");
      // return await Bun.file(path).text();
    },
    async readBytes(path: string) {
      return fs.readFile(path);
      // return await Bun.file(path).bytes();
    },
    async lstat(path: string): Promise<StatLike> {
      return fs.lstat(path);
      // return await Bun.file(path).stat();
    },
    async readdir(dirPath: string): Promise<string[]> {
      // console.log("readdir", dirPath)
      return fs.readdir(dirPath);
    },
  };
}

export function resolveInRoot(rootDir: string, rel: string) {
  return joinPosix(rootDir, rel);
}
