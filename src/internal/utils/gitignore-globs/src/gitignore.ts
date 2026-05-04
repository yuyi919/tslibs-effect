import { dirnamePosix, joinPosix, normalizeSlashes } from "./path";
import type { GitignoreGlob } from "./types";

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function unescapeGitignore(s: string): string {
  // gitignore 中反斜杠用于转义：\# \! \  等
  return s.replace(/\\(.)/g, "$1");
}

export function parseGitignoreFile(
  text: string,
  gitignoreRelPath: string
): GitignoreGlob[] {
  const out: GitignoreGlob[] = [];
  for (const line of splitLines(text)) {
    const item = toGlob(line, gitignoreRelPath);
    if (item) out.push(item);
  }
  return out;
}

export function toGlob(
  ruleRaw: string,
  gitignoreRelPath: string
): GitignoreGlob | null {
  let line = ruleRaw;

  // 去掉 BOM（偶尔会出现在文件开头）
  if (line && line.charCodeAt(0) === 0xfeff) line = line.slice(1);

  if (!line.trim()) return null;
  if (line.startsWith("#")) return null; // 注释（最小化处理：\# 在 unescape 后会变成 #，但这里按原始行判定）

  let negated = false;
  if (line.startsWith("!")) {
    negated = true;
    line = line.slice(1);
  }

  // 去掉行尾空白（真实语义更复杂，这里优先实用）
  line = line.trimEnd();

  const rule = normalizeSlashes(unescapeGitignore(line));
  if (!rule) return null;

  const baseDir = dirnamePosix(gitignoreRelPath);

  let r = rule;
  let anchored = false;
  if (r.startsWith("/")) {
    anchored = true;
    r = r.replace(/^\/+/, "");
  }

  const dirOnly = r.endsWith("/");
  if (dirOnly) r = r.replace(/\/+$/, "");

  const hasSlash = r.includes("/");

  let relGlob: string;
  if (anchored) relGlob = r || "*";
  else if (!hasSlash) relGlob = `**/${r}`;
  else relGlob = r;

  if (dirOnly) relGlob = relGlob ? `${relGlob}/**` : "**";

  const glob = joinPosix(baseDir, relGlob);

  return {
    file: normalizeSlashes(gitignoreRelPath),
    raw: ruleRaw,
    negated,
    glob,
  };
}
