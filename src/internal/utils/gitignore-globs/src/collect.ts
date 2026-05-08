import { createBunFS } from "./fs/bun.js";
import { parseGitignoreFile } from "./gitignore.js";
import { type CompiledRule, globToRegExp, isIgnored } from "./matcher.js";
import { joinPosix, normalizeSlashes } from "./path.js";
import type { CollectOptions, GitignoreGlob, ReadonlyFS } from "./types.js";

function isLikelyGitDir(relPosix: string) {
  return (
    relPosix.includes("/.git/") ||
    relPosix.startsWith(".git/") ||
    relPosix === ".git" ||
    relPosix.endsWith("/.git")
  );
}

async function exists(fs: ReadonlyFS, path: string): Promise<boolean> {
  try {
    await fs.lstat(path);
    return true;
  } catch {
    return false;
  }
}

export async function collectGitignoreGlobs(
  options: CollectOptions
): Promise<GitignoreGlob[]> {
  const fs = options.fs ?? createBunFS();
  const rootDir = options.rootDir;
  const skipGitDir = options.skipGitDir ?? true;

  const results: GitignoreGlob[] = [];
  const compiled: CompiledRule[] = [];

  async function walkDir(relDir: string) {
    const relDirPosix = normalizeSlashes(relDir)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
    if (relDirPosix) {
      // 目录用尾随 / 参与匹配，便于与 xxx/** 规则匹配
      if (isIgnored(`${relDirPosix}/`, compiled)) return;
      if (skipGitDir && isLikelyGitDir(relDirPosix)) return;
    }

    const gitignoreRel = relDirPosix
      ? `${relDirPosix}/.gitignore`
      : ".gitignore";
    const gitignoreAbs = joinPosix(rootDir, gitignoreRel);

    if (
      !(skipGitDir && isLikelyGitDir(gitignoreRel)) &&
      (await exists(fs, gitignoreAbs))
    ) {
      const text = await fs.readFile(gitignoreAbs);
      const parsed = parseGitignoreFile(text, gitignoreRel);
      for (const item of parsed) {
        results.push(item);
        compiled.push({
          glob: item.glob,
          negated: item.negated,
          re: globToRegExp(item.glob),
        });
      }
    }

    const absDir = relDirPosix ? joinPosix(rootDir, relDirPosix) : rootDir;
    const names = await fs.readdir(absDir);
    for (const name of names) {
      if (name === "." || name === "..") continue;
      if (skipGitDir && name === ".git") continue;
      if (!options.dot && name.startsWith(".")) continue;

      const childRel = relDirPosix ? `${relDirPosix}/${name}` : name;
      if (skipGitDir && isLikelyGitDir(childRel)) continue;

      const childAbs = joinPosix(rootDir, childRel);

      let st;
      try {
        st = await fs.lstat(childAbs);
      } catch {
        continue;
      }

      if (st.isSymbolicLink()) continue;
      if (!st.isDirectory()) continue;

      if (isIgnored(`${normalizeSlashes(childRel)}/`, compiled)) continue;
      await walkDir(childRel);
    }
  }

  await walkDir("");
  return results;
}
