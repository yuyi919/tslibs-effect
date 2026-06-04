import type { Volume } from "memfs";
import { createMemfs } from "../../src/fs/memfs.js";

export function fsFromVolume(vol: Volume) {
  return createMemfs(vol);
}
