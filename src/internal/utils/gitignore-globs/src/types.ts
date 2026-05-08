export type StatLike = {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
};

/**
 * 为了支持注入自定义 fs（例如 memfs），定义最小可用接口。
 * - 路径建议使用 POSIX（/）格式。
 */
export type ReadonlyFS = {
  readFile(path: string): Promise<string>;
  readBytes?(path: string): Promise<Uint8Array | Buffer>;
  lstat(path: string): Promise<StatLike>;
  readdir(path: string): Promise<string[]>;
};

export type NestedDirectoryJSONValue = NestedDirectoryJSON | string | Buffer;

export type NestedDirectoryJSON = {
  [name: string]: NestedDirectoryJSONValue;
};

export type GitignoreGlob = {
  /** .gitignore 文件相对路径（root-relative, POSIX） */
  file: string;
  /** 原始规则行 */
  raw: string;
  /** 是否为否定规则（以 ! 开头） */
  negated: boolean;
  /** 转换后的 glob（root-relative, POSIX） */
  glob: string;
};

export type CollectOptions = {
  /** 扫描根目录（绝对或相对均可，取决于 fs 实现） */
  rootDir: string;
  /** 注入自定义 fs；默认使用 Bun 实现 */
  fs?: ReadonlyFS;
  /**
   * 是否包含 dot entries（如 .config、.cache）。
   * 默认 true（更符合 .gitignore 的实际使用场景）
   */
  dot?: boolean;
  /**
   * 是否跳过 .git 目录（默认 true）
   */
  skipGitDir?: boolean;
};

export type CollectNestedDirectoryJSONOptions = {
  /** 扫描根目录 */
  rootDir: string;
  /** 注入自定义 fs；默认使用 Bun 实现 */
  fs?: ReadonlyFS;
  /** 是否包含 dot entries，默认 true */
  dot?: boolean;
  /** 是否跳过 .git 目录，默认 false */
  skipGitDir?: boolean;
};
