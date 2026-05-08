# 示例目录迁移与缓存文档勘误 Spec

## Why

当前仓库存在一些“示例/脚本/PoC”分散在根目录与 `src/internal/` 之中，影响项目边界清晰度与维护效率。同时文档中存在对 Effect v4 缓存语义的遗留描述，需要勘误以避免误导使用者与 agent。

## What Changes

- 将仓库中的示例代码统一迁移至 `examples/` 目录，并在文档中明确“示例不属于稳定 API”的定位
- 修正示例代码本身：移除/替换遗留的 `withRequestCaching` 用法，避免读者从示例中获得错误结论；如示例需要缓存，改为演示 Effect v4 的显式缓存开启方式（`RequestResolver.withCache` 或等价机制）
- 更新批处理 + 缓存相关文档：纠正 `withRequestCaching` 在 Effect v4 中已不存在/默认不缓存的事实，改为说明 `RequestResolver.withCache`（或等价机制）如何显式开启缓存
- 更新 `README.md` 中对示例/文档的引用路径，确保链接可用
- **不直接引入新的对外 API**；仅做目录组织与文档维护（必要时调整构建/脚本入口以匹配新路径）

## Impact

- Affected specs: 示例与脚本的归档策略、维护文档准确性（尤其是 Effect v4 缓存语义）
- Affected code:
  - 根目录下示例脚本（如 `icons.ts`, `next.ts` 等）
  - `src/internal/` 下用于 PoC/演示的可执行脚本（如 `src/internal/cluster/*.ts` 中带 shebang 或主程序的文件）
  - `docs/` 与 `README.md` 的引用路径与内容描述
  - 可能受影响的构建配置（如 `vite.config.ts` 的 entry 指向示例脚本时，需要同步更新）

## ADDED Requirements

### Requirement: 示例归档目录

系统 SHALL 将示例代码集中放置在仓库根目录 `examples/` 下，并确保：

- 示例代码不被当作库的稳定 API 面的一部分
- 示例在目录命名与文档中具有清晰边界（示例/实验性/PoC）

#### Scenario: 阅读示例

- **WHEN** 维护者或使用者浏览仓库
- **THEN** 能在 `examples/` 中找到所有示例脚本，且不会与 `src/` 内的库代码混淆

### Requirement: Effect v4 缓存语义勘误

系统 SHALL 在文档中明确：

- Effect v4 默认不会对 Request 做缓存
- 若需要缓存，需要通过 `RequestResolver.withCache`（或对应模块的显式 cache 注入/包装 API）开启
- 现有文档中提及 `withRequestCaching` 的内容应被视为遗留描述并予以更正

#### Scenario: Agent 按文档改造脚本

- **WHEN** agent 按文档实现批处理与缓存
- **THEN** 不会使用已不存在的 `withRequestCaching`，而是使用 v4 推荐的显式缓存机制

### Requirement: 示例不误导

系统 SHALL 确保示例代码本身不包含已不存在或语义错误的 API 用法（例如 `withRequestCaching`），并且：

- 示例中提到“缓存”时必须展示显式缓存开启方式
- 示例中不需要缓存时，不应出现“关闭缓存/禁用缓存”的写法

#### Scenario: 读者复制示例代码

- **WHEN** 读者复制 `examples/` 下的示例到自己项目中
- **THEN** 不会因为示例包含遗留 API 而编译失败或形成错误认知

## MODIFIED Requirements

### Requirement: 批处理与缓存优化指南的准确性

现有批处理与缓存指南（`docs/batch-and-cache-guide.md`）SHALL 与 Effect v4 的真实行为一致，避免引导读者采用不存在或失效的 API。

## REMOVED Requirements

### Requirement: 默认/隐式请求缓存假设

**Reason**: Effect v4 默认不缓存，且 `withRequestCaching` 已不再存在，继续保留会误导维护者与使用者  
**Migration**: 文档与示例统一改为显式 `RequestResolver.withCache`（或等价模式）说明
