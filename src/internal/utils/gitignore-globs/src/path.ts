import { dirname, join } from "../../pathe/_path";

export function normalizeSlashes(s: string): string {
  return s.replace(/\\/g, "/");
}

export function dirnamePosix(pathLike: string): string {
  return dirname(pathLike);
}

export function joinPosix(a: string, b: string): string {
  if (a === "." || a === "") return b;
  if (b === "." || b === "") return a;
  return join(a, b);
}
