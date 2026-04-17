# Tasks
- [ ] Task 1: 编写 `Runtime` 补齐的测试
  - [ ] 在 `src/internal/test/core/mock/Runtime.test.ts` 中测试 `runFork`, `runSync`, `runPromise` 等双态执行入口。
  - [ ] 优先使用 `BunTester` 导出的测试工具（如 `it.effect` 等）。
  
- [ ] Task 2: 编写 `Effect` 转换与流控制的测试
  - [ ] 在 `src/internal/test/core/effect.test.ts` 中测试 `from`, `tryMap`, `orElse`, `zipRight`, `tapBoth` 等。
  - [ ] 优先使用 `BunTester`。

- [ ] Task 3: 编写 批处理与缓存 的测试
  - [ ] 分别在 `batched.test.ts`, `persisted.test.ts`, `scopedCache.test.ts` 等文件中编写测试。
  - [ ] 验证请求合并、缓存命中与回退逻辑，使用 `BunTester` 辅助测试异步流。

- [ ] Task 4: 编写 `Layer` / `Context` 辅助扩展的测试
  - [ ] 在 `src/internal/test/core/layer.test.ts` 中测试 `withHelper` (LayerHelper) 的 `provideMerge`, `optional` 等功能。
  - [ ] 使用 `BunTester`。

- [ ] Task 5: 验证回归测试
  - [ ] 运行 `bun test src`，确保所有新增的测试通过。
  - [ ] 运行 `npm run build`，确保类型与构建正常。

# Task Dependencies
- Task 5 depends on Task 1, Task 2, Task 3, Task 4