# @yuyi919/tslibs-effect

个人使用的 Effect/effect-soml polyfill + 二次导出库，用来简化日常使用（不考虑 tree-shaking），并对齐 effect-v3 常用的功能与命名习惯。

## 目标与边界

- 提供统一入口，减少分散的 `effect/*` 导入
- 在不改变语义的前提下，对齐/补齐常用的 effect-v3 风格命名与 API 组织方式
- 以“可维护、可读、对 agent 友好”为优先目标

非目标：

- tree-shaking 友好（本库倾向聚合与再导出）
- 覆盖 effect 的全部模块（按需增补）

## 安装

该包使用 peerDependencies 依赖 `effect` 与部分 `@effect/*` 包。请在你的项目中显式安装对应版本。

```bash
npm i @yuyi919/tslibs-effect
```

## 使用方式

### 主入口（推荐）

主入口会聚合导出 `effect` 的绝大多数内容，并提供一些对齐后的命名空间：

```ts
import { Effect, Layer, Option } from "@yuyi919/tslibs-effect";

const program = Effect.succeed(1).pipe(Effect.map((n) => n + 1));
```

### 子路径入口（稳定入口，适合精确引用）

`package.json#exports` 允许按文件/目录深度导入（子路径包含 `/` 也可用），例如：

```ts
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import * as Cause from "@yuyi919/tslibs-effect/Cause";
import * as Net from "@yuyi919/tslibs-effect/libs/Net";
```

约定：

- `@yuyi919/tslibs-effect/<Name>`：`src/<Name>.ts` 对应的入口文件（更稳定）
- `@yuyi919/tslibs-effect/core/*`：兼容/补齐层（可用但更偏实现细节）
- `@yuyi919/tslibs-effect/libs/*`、`@yuyi919/tslibs-effect/cluster/*`：内部/实验性能力（路径可用，但不保证长期稳定；如需稳定 API 建议提升到根入口文件）

## 目录结构

`src/` 目录按“公开入口 / 兼容层 / 内部实现”分层组织：

```text
src/
  index.ts                    # 主入口（聚合导出）
  effect-next.ts               # effect-v3 风格对齐入口
  *.ts                         # 公开子路径入口（例如 Effect.ts、Layer.ts 等）

  core/                        # polyfill/对齐的实现层（历史路径，仍可导入）

  libs/                        # 兼容层：薄再导出到 internal/libs
  cluster/                      # 兼容层：薄再导出到 internal/cluster

  internal/                    # 内部实现与测试（不建议消费者直接耦合）
    libs/
    cluster/
    test/
```

兼容策略：

- `src/libs/**`、`src/cluster/**` 目前为薄再导出层，真实实现位于 `src/internal/**`
- 目的：在保持旧导入路径可用的同时，明确“内部实现/实验性代码”的边界，降低后续维护成本

## 维护约束（人类 + agent）

- 不引入逻辑/类型语义变更：目录重组、迁移文件时，仅允许调整 `import/export` 路径以恢复构建
- 保持对外导入路径兼容：移动对外可导入的模块时，默认需要保留旧路径的薄再导出层（`export * from "..."`）
- 新增稳定 API：优先新增根目录 `src/<Name>.ts` 作为门面入口，再由内部实现提供能力
- 避免把测试/PoC 当作公共 API：优先放在 `src/internal/**`，不要依赖其文件路径做外部集成

## 开发与验证

```bash
npm run check
npm run build
bun test src
```

> **参考文档**：
> - 关于 Effect v4 演进方向的调研，请参考 [Effect-SMOL 研究笔记](./docs/effect-smol-research.md)。
> - 关于如何利用本库进行批处理与本地缓存优化的案例，请参考 [基于 Effect 框架的批处理与本地缓存优化指南](./docs/batch-and-cache-guide.md)。

## 后续维护方向（规划入口）

- 依赖升级与 beta 版本跟进（effect / @effect/*）
- 补齐对齐 effect-v3 的常用函数/命名
- 对外 API 面梳理：将常用能力提升为稳定的 `src/<Name>.ts` 门面入口
