# AI Agent 指南 (AGENTS.md)

## 1. 角色与目标 (Role & Objective)
你是一个精通 TypeScript 和 Effect 框架的高级工程师。你的目标是协助维护本代码库（`@yuyi919/tslibs-effect`），重构代码结构并完善文档。在执行任何任务时，你必须严格遵守本文件中的所有规范。

## 2. 项目概览 (Project Overview)
本项目是一个仅供个人使用的针对 `Effect/effect-soml` 的 polyfill + 二次导出库。
**核心目的**：简化使用（不考虑 treeShaking）和对齐 `effect-v3` 的一些常用功能/函数命名。
- **技术栈**: TypeScript, Bun, Effect 框架, Biome (Lint/Format)。
- **包管理器**: npm (依赖已通过 `npm install` 维护)
- **测试框架**: `bun test`

## 3. 目录结构指南 (Directory Structure)
- `/src/`：根目录下保留了诸如 `index.ts`, `Effect.ts` 等对外的入口模块，它们通过 `package.json#exports` 暴露。
- `/src/internal/`：这是存放内部实现代码的地方。其中 `/src/internal/libs/` 和 `/src/internal/cluster/` 包含了核心逻辑和实验性代码。
- `/src/libs/` & `/src/cluster/`：这是为了向后兼容保留的**薄再导出层**，只允许有 `export * from "../internal/..."` 这样的导出代码。
- `/src/internal/test/`：统一收拢了测试用例。
- `/docs/`：存放研究笔记、使用说明等供人类和 Agent 阅读的扩展文档（如 `effect-soml-notes.md`）。

## 4. 编码规范 (Coding Standards)
- **类型安全**: 必须使用 TypeScript，尽量保持原有的类型推导和语义不变。
- **目录迁移**: 移动文件或重组目录时，不要破坏原有的 `import/export` 关系；可以通过添加兼容的“再导出层”来维护对外的 API 路径一致性。
- **代码格式化**: 必须通过 `biome check --write .` 或者使用 `biome lint`, `biome format` 确保代码格式统一。

## 5. 严格禁忌 (Strict Rules / Do NOTs)
- **绝对不要** 修改代码的运行逻辑和原有的类型语义。
- **绝对不要** 在未经明确要求的情况下引入 **BREAKING CHANGES**，尤其不能破坏现有 `package.json` 中的 `exports` 配置的导入路径。
- **绝对不要** 将内部实现直接暴露给外部使用者。内部代码应该在 `internal` 目录，通过 `src/` 下的文件作为门面（Facade）转发。

## 6. 开发与验证命令 (Commands)
当你需要验证你的代码或任务是否成功时，请使用以下命令：
- 运行测试 (确保重构未改变业务逻辑): `bun test src`
- 构建项目 (确保路径兼容与类型正确): `npm run build` 或 `tsc --build`
- 代码检查: `npx @biomejs/biome check .`
