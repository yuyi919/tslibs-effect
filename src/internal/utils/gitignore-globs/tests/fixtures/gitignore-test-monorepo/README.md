# gitignore-test-monorepo

这是一个用于测试 `gitignore-globs.ts` 的本地 fixture，模拟现代 TS monorepo 的多层嵌套结构（含 `packages/`、`apps/`、以及被 ignore 的 `node_modules/`、`dist/`）。

## 结构要点

- 根目录 `.gitignore` 忽略：
  - `node_modules/`（因此 `node_modules/**/.gitignore` 不应被扫描/读取）
  - `dist/`
  - 以及一些常见缓存目录
- `packages/pkg-b/.gitignore` 忽略 `dist/`（因此 `packages/pkg-b/dist/.gitignore` 也不应被读取）

## 运行验证

在本目录下运行：

```bash
bun run ../gitignore-globs.ts
```

期望输出中包含：
- `.gitignore`
- `packages/pkg-a/.gitignore`
- `packages/pkg-b/.gitignore`
- `packages/pkg-b/apps/app-x/.gitignore`

且**不包含**：
- `node_modules/also-ignored/.gitignore`
- `packages/pkg-a/node_modules/should-not-read/.gitignore`
- `packages/pkg-b/dist/.gitignore`

