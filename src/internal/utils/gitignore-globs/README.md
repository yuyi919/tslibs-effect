# gitignore-globs

把“递归读取多层 `.gitignore` 并转换为 glob”的脚本拆分为一个 Bun 项目，支持注入自定义 fs（例如 `memfs`）并使用 `bun test` 做单元测试。

## 使用（CLI）

在任意目录运行：

```bash
bun run /path/to/gitignore-globs/src/cli.ts
```

输出 JSON：

```bash
bun run /path/to/gitignore-globs/src/cli.ts --json
```

## 作为库使用（支持自定义 fs）

```ts
import { collectGitignoreGlobs } from "./src/collect";

const results = await collectGitignoreGlobs({
  rootDir: process.cwd(),
  // fs: 你自己的实现（例如 memfs）
});
```

## 测试

在项目目录执行：

```bash
bun install
bun test
```

> 说明：为了实现“父目录被 ignore 时不再深入”，当前实现会**剪枝优先**。这意味着如果存在 `vendor/` 被 ignore、但又有 `!vendor/keep/` 这样的否定规则，严格语义下应该进入 `vendor/keep/`，而剪枝策略可能会直接跳过整个 `vendor/`。如果你希望同时满足严格语义与性能，可再加一层“基于否定规则的例外白名单”来决定是否允许继续深入。

