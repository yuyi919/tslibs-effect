# effect-soml 研究笔记

> 本文档记录了关于 `effect-soml` 的概念、特性及使用场景的调研总结。

## 1. 概述与定位

在广泛的 TypeScript `Effect` 官方生态（如 `@effect/schema`, `@effect/platform` 等）中，不存在名为 `effect-soml` 的标准模块。根据代码库上下文，`effect-soml` 实际上指代的是**当前项目 (`@yuyi919/tslibs-effect`) 自身**——一个基于 Effect 生态构建的“个人增强版二次导出库与垫片 (Polyfill)”。

这个库的核心诉求是：在不考虑摇树优化（Tree-shaking）的前提下，大幅度简化对 `Effect` 庞大生态的使用难度，并对齐 `effect-v3` 的一些常用功能和命名。

## 2. 核心概念 (Core Concepts)

- **聚合与门面模式 (Aggregation & Facade):** 将零散的 `effect/*` 生态模块进行高度聚合，提供一个“开箱即用”的统一门面入口。
- **语义对齐 (Semantic Alignment):** 在不改变底层逻辑语义的前提下，利用 Polyfill 补齐或对齐 `effect-v3` 版本的常用功能与命名习惯，消除版本碎片化带来的心智负担。
- **Agent 友好 (AI-Agent Friendly):** 明确将“可维护、可读、对 AI 编程助手友好”作为最高优先级，通过清晰统一的模块导出路径，降低 AI 在编写代码时产生幻觉（如错误导入路径）的概率。

## 3. 主要特性 (Features)

- **统一且分层的导出系统:**
  - **主入口 (`index.ts`):** 聚合导出绝大多数核心能力（如 `Effect`, `Layer`, `Option` 等）。
  - **子路径入口 (`src/<Name>.ts`):** 提供稳定、精确的按需引入（如 `@yuyi919/tslibs-effect/Cause`）。
  - **薄再导出层:** 将 `libs/` 和 `cluster/` 作为对内部实现 (`internal/`) 的包装，在保持旧导入路径可用的同时，隔离实验性代码。
- **功能补齐与增强 (Polyfills):**
  - 提供了对日志和追踪跨度的简化包装，将日志级别与 Span 生命周期进行链式整合。
  - 扩展了 Effect 的构造方法，例如支持通过原生 `AbortSignal` 进行中断控制（`fromAbortSignal`），以及更便捷的时间测算工具（`logElapsed`）。
  - 提供对 `GlobalScope` 及内存缓存管理 (`Layer.MemoMap`) 的全局控制。

## 4. 典型使用场景 (Use Cases)

- **日常服务端开发与快速原型:** 在 Node.js 或 Bun 运行环境下，开发者可以直接从该库的根目录导入一切所需，避免繁琐地查阅官方各个分散子包的文档。
- **AI 辅助编码规范化:** 团队或个人在使用 Trae / Cursor 等 AI 工具时，提供这个库作为基础依赖，能够约束 AI 严格遵循 `effect-v3` 的 API 风格生成代码。
- **旧项目平滑过渡:** 作为核心兼容层，承载旧版本 Effect 代码的向下兼容工作，使得业务代码在不修改调用方式的情况下即可对齐新版底层特性。
