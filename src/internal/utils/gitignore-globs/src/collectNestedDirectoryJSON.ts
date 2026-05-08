import { createBunFS } from "./fs/bun";
import { joinPosix, normalizeSlashes } from "./path";
import type {
  CollectNestedDirectoryJSONOptions,
  NestedDirectoryJSON,
  ReadonlyFS,
} from "./types";

function isLikelyGitDir(relPosix: string) {
  return (
    relPosix.includes("/.git/") ||
    relPosix.startsWith(".git/") ||
    relPosix === ".git" ||
    relPosix.endsWith("/.git")
  );
}

function isBinaryContent(bytes: Uint8Array | Buffer) {
  if (bytes.length === 0) return false;
  if (bytes.includes(0)) return true;

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return false;
  } catch {
    return true;
  }
}

async function readFileAsValue(fs: ReadonlyFS, path: string) {
  if (fs.readBytes) {
    const bytes = await fs.readBytes(path);
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    return isBinaryContent(buf) ? buf : buf.toString("utf8");
  }

  return await fs.readFile(path);
}

export async function collectNestedDirectoryJSON(
  options: CollectNestedDirectoryJSONOptions
): Promise<NestedDirectoryJSON> {
  const fs = options.fs ?? createBunFS();
  const rootDir = options.rootDir;
  const dot = options.dot ?? true;
  const skipGitDir = options.skipGitDir ?? false;

  async function walkDir(relDir: string): Promise<NestedDirectoryJSON> {
    const absDir = relDir ? joinPosix(rootDir, relDir) : rootDir;
    const node: NestedDirectoryJSON = {};
    const names = (await fs.readdir(absDir)).filter((name) => {
      if (name === "." || name === "..") return false;
      if (!dot && name.startsWith(".")) return false;
      return true;
    });

    names.sort((a, b) => a.localeCompare(b));

    for (const name of names) {
      const childRel = relDir ? `${relDir}/${name}` : name;
      const childRelPosix = normalizeSlashes(childRel);
      if (skipGitDir && isLikelyGitDir(childRelPosix)) continue;

      const childAbs = joinPosix(rootDir, childRelPosix);
      const st = await fs.lstat(childAbs);

      if (st.isSymbolicLink()) continue;

      if (st.isDirectory()) {
        node[name] = await walkDir(childRelPosix);
      } else {
        node[name] = await readFileAsValue(fs, childAbs);
      }
    }

    return node;
  }

  return await walkDir("");
}

export function nestedDirectoryJSONToVolumeInput(json: NestedDirectoryJSON) {
  return json;
}

export type { NestedDirectoryJSON };
