import * as fs from "node:fs";
import { joinPosix } from "../path";
import type { ReadonlyFS, StatLike } from "../types";

export function createBunFS(): ReadonlyFS {
  return {
    async readFile(path: string) {
      // console.log("readFile", path)
      return fs.readFileSync(path, "utf-8");
      // return await Bun.file(path).text();
    },
    async readBytes(path: string) {
      return fs.readFileSync(path);
      // return await Bun.file(path).bytes();
    },
    async lstat(path: string): Promise<StatLike> {
      // console.log("stat", path)
      return fs.lstatSync(path);
      // return await Bun.file(path).stat();
    },
    async readdir(dirPath: string): Promise<string[]> {
      // console.log("readdir", dirPath)
      return fs.readdirSync(dirPath);
      // Bun.Glob 默认只返回文件；要包含目录必须 onlyFiles: false
      // const entries = new Bun.Glob("*");
      // const names: string[] = [];
      // for await (const name of entries.scan({
      //   cwd: dirPath,
      //   dot: true,
      //   onlyFiles: false,
      // })) {
      //   names.push(String(name));
      // }
      // return names;
    },
  };
}

export function resolveInRoot(rootDir: string, rel: string) {
  return joinPosix(rootDir, rel);
}
