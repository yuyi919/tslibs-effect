import { Volume } from "memfs";
import { createMemfs } from "../../src/fs/memfs";

export function fsFromVolume(vol: Volume) {
  return createMemfs(vol);
}
