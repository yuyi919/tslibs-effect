import { normalizeSlashes } from "./path";

export type CompiledRule = {
  glob: string;
  negated: boolean;
  re: RegExp;
};

export function globToRegExp(glob: string): RegExp {
  // 简易 glob -> RegExp（用于剪枝）：
  // - **/ => (?:.*/)?   （允许匹配 0..N 层目录）
  // - ** => .*
  // - *  => [^/]*
  // - ?  => [^/]
  // - [...] => 字符类（最小支持）
  const g = normalizeSlashes(glob);
  let out = "^";

  for (let i = 0; i < g.length; i++) {
    const ch = g[i]!;

    if (ch === "[") {
      const end = g.indexOf("]", i + 1);
      if (end !== -1) {
        const content = g.slice(i + 1, end);
        const safe = content.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
        out += `[${safe}]`;
        i = end;
        continue;
      }
      out += "\\[";
      continue;
    }

    if (ch === "*") {
      if (g[i + 1] === "*") {
        while (g[i + 1] === "*") i++;
        if (g[i + 1] === "/") {
          i++;
          out += "(?:.*/)?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^/]*";
      }
      continue;
    }

    if (ch === "?") {
      out += "[^/]";
      continue;
    }

    if ("\\.^$+()[]{}|".includes(ch)) {
      out += `\\${ch}`;
      continue;
    }

    out += ch;
  }

  out += "$";
  return new RegExp(out);
}

export function isIgnored(
  pathRelPosix: string,
  rules: CompiledRule[]
): boolean {
  let ignored = false;
  for (const r of rules) {
    if (r.re.test(pathRelPosix)) ignored = !r.negated;
  }
  return ignored;
}
