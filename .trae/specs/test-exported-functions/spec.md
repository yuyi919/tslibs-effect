# 为导出函数编写测试 Spec

## Why
目前项目在 `src/core/` 等目录下提供了大量对齐 `effect-v3` 风格的底层导出函数和高阶流程控制工具（如 Runtime 补齐、Effect 转换、批处理、缓存、Layer 拓展等），但这些核心组件缺乏单元测试覆盖。为了保证项目的稳定性，避免在后续重构或版本升级时引入 regression，必须为其补充系统的测试覆盖。

## What Changes
- 在 `src/internal/test/core/` 目录下新增测试文件，针对核心导出的工具函数进行单元测试。
- 测试使用 `bun test` 框架，无需额外测试器，并优先使用项目内 `src/BunTester.ts` 导出的工具。
- 测试重点包括：
  - `Runtime` 相关的双态执行入口（`runFork`, `runSync`, `runPromise` 等）
  - `Effect` 的执行流与转换函数（`from`, `tryMap`, `orElse`, `zipRight`, `tapBoth` 等）
  - 批处理与缓存高阶函数（`batched`, `persisted`, `scopedCacheWith` 等）
  - Layer/Context 辅助扩展（`withHelper` / `LayerHelper` 相关逻辑）

## Impact
- Affected specs: 增加了对核心工具函数的行为规范和预期结果的显式校验。
- Affected code:
  - 新增测试文件：`src/internal/test/core/mock/Runtime.test.ts`
  - 新增测试文件：`src/internal/test/core/effect.test.ts`
  - 新增测试文件：`src/internal/test/core/effect/batched.test.ts`、`persisted.test.ts`、`scopedCache.test.ts`
  - 新增测试文件：`src/internal/test/core/layer.test.ts`

## ADDED Requirements
### Requirement: 单元测试覆盖
系统 SHALL 提供针对核心导出函数的测试用例，确保其主要执行路径和异常分支按预期工作。

#### Scenario: Runtime 补齐
- **WHEN** 传入 `Effect` 给 `runPromise`（通过柯里化或直接调用）
- **THEN** 能够正确返回 `Promise` 并解析为预期结果。

#### Scenario: Effect 流控制
- **WHEN** 使用 `orElse` 进行回退
- **THEN** 在原 Effect 失败时，正确执行回退 Effect 并返回其结果。

#### Scenario: 批处理与缓存
- **WHEN** 并发调用被 `batched` 包装的函数
- **THEN** 底层函数仅被调用一次（请求合并）。

## MODIFIED Requirements
### Requirement: 现存函数的稳健性
通过测试驱动开发的方式，在编写测试时若发现导出函数的潜在 Bug 或类型问题，SHALL 进行修复。

## REMOVED Requirements
无。