# 项目维护：目录结构重组与文档化 Spec

## Why

当前仓库同时包含对 Effect/effect-soml 的 polyfill、二次导出与一些业务/工具模块，目录层级与“对外可导入的子路径”边界不够清晰，增加后续维护与协作（含 agent 自动化修改）的成本。

## What Changes

- 对 `src/` 进行目录结构重组，将“对外可导入的模块路径”与“内部实现/实验性代码/测试”明确分层
- 保持运行逻辑与类型语义不变；允许进行文件移动与 `import/export` 路径调整以保持构建与对外路径兼容
- 为人类与 agent 提供维护文档（以根目录 `README.md` 为入口），明确：
  - 项目目标与边界（polyfill + 二次导出，不考虑 treeShaking）
  - 对齐 effect-v3 常用命名的策略
  - 目录/模块分层、对外导出规则、测试与发布流程

## Impact

- Affected specs: 仓库目录组织、发布的子路径兼容策略、维护与贡献规范、文档体系
- Affected code:
  - `src/` 下目录与文件位置（移动/重命名）
  - 受移动影响的相对导入路径（仅路径调整，不改逻辑）
  - 可能需要保持现有对外子路径兼容的“薄封装/再导出”文件（仅 `export * from ...` 形式）
  - 文档文件（`README.md` 及必要的补充文档）

## ADDED Requirements

### Requirement: 目录分层

系统 SHALL 在 `src/` 下明确区分以下类别，并通过目录命名与文档清晰表达：

- 对外入口模块（与 `package.json#exports` 对齐）
- 对外子路径模块（当前存在 `src/core/*`, `src/libs/*`, `src/cluster/*` 等子路径）
- 内部实现（不建议消费者直接导入，面向维护者/测试）

#### Scenario: 分层后的可读性

- **WHEN** 维护者浏览 `src/` 目录
- **THEN** 能一眼识别哪些是对外入口/子路径，哪些是内部实现与测试

### Requirement: 子路径兼容策略

系统 SHALL 在不改变运行逻辑与类型语义的前提下，保证对外导入路径的兼容性；如需变更导入路径，必须显式标记为 **BREAKING** 并提供迁移说明。

#### Scenario: 兼容旧导入路径

- **WHEN** 使用者继续使用已有导入方式（例如 `@yuyi919/tslibs-effect/core/...`、`@yuyi919/tslibs-effect/libs/...` 等）
- **THEN** 构建与运行保持一致（或在文档中明确给出迁移路径）

### Requirement: 文档入口与维护约束

系统 SHALL 提供可供人类与 agent 阅读的维护文档，并包含以下信息：

- 项目定位、依赖与版本策略（peerDependencies）
- 导出策略（`index.ts` 与各子模块的职责）
- 目录结构说明（重组后）
- 变更约束（例如：不改逻辑、只改路径/导出、如何添加新对齐函数）
- 本地开发/测试/构建命令（bun + biome + tsc）

#### Scenario: agent 进行维护

- **WHEN** agent 需要新增/调整导出或重构目录
- **THEN** 能依据文档约束在不破坏对外导入路径与逻辑语义的前提下完成修改

## MODIFIED Requirements

### Requirement: 对齐 effect-v3 命名的二次导出

现有导出（例如 `src/index.ts` 与 `src/effect-next.ts` 等）SHALL 继续作为“对齐命名 + 简化使用”的稳定入口；目录重组不得改变其导出语义，只允许必要的路径更新。

## REMOVED Requirements

无
