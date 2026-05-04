import { NestedDirectoryJSON, Volume } from "memfs";
import type { ReadonlyFS } from "../../src/types";

export function createMemfs(vol: Volume | NestedDirectoryJSON): ReadonlyFS {
  if (!(vol instanceof Volume)) {
    vol = Volume.fromNestedJSON(vol);
  }
  return {
    async readFile(path: string) {
      return vol.readFileSync(path, "utf8") as unknown as string;
    },
    async stat(path: string) {
      const st = vol.statSync(path);
      return {
        isDirectory: () => st.isDirectory(),
        isSymbolicLink: () => st.isSymbolicLink(),
      };
    },
    async readdir(path: string) {
      return vol.readdirSync(path) as unknown as string[];
    },
  };
}
