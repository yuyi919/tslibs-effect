# AI Agent 文档与代码编写协同指南

本文档总结了在 `@yuyi919/tslibs-effect` 仓库中进行文档编写和功能封装时，人类与 AI Agent 协同工作的最佳实践与避坑指南。这不仅是为了给后续的 Agent 提供指导，也能帮助人类开发者更好地理解本库的设计哲学。

## 1. “一站式导入”原则 (The "One-Stop Import" Rule)

本库的核心目标之一是**聚合与二次导出**，减少开发者在多个 `effect/*` 包中寻找导入路径的认知负担。

### 🚨 常见误区
Agent 在编写文档或示例代码时，往往会习惯性地从官方库导入：
```ts
// ❌ 错误做法：让用户去零散导入
import { Effect, TxRef } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { it } from "@yuyi919/tslibs-effect/BunTester";
```

### ✅ 正确做法
始终**优先使用本库的对齐入口**。如果发现本库缺少某个常用类的导出（例如 `TxRef` 或 `TestClock`），**不要修改示例代码去迁就它，而是应该直接在源码（如 `src/effect-next.ts`）中补充导出**！
```ts
// ✅ 正确做法：统一从封装层导入
import { Effect, TxRef, TestClock } from "@yuyi919/tslibs-effect/effect-next";
import { it } from "@yuyi919/tslibs-effect/BunTester";
```
**行动准则：** 遇到示例代码无法使用本库导入的情况，Agent 应主动排查是否是本库遗漏了导出，并提议修改源码补充导出。

## 2. 避免使用相对路径 (Avoid Relative Paths in Docs)

文档（Markdown）中的示例代码经常会被人类开发者直接 Copy/Paste。

### 🚨 常见误区
Agent 喜欢根据当前文件的物理位置写相对路径：
```ts
// ❌ 错误做法：相对路径离开当前文档就失效了
import { it } from "../src/BunTester";
```

### ✅ 正确做法
在文档中，**强制使用完整的包名导入**，哪怕代码在仓库内部也一样。
```ts
// ✅ 正确做法：开箱即用，支持直接复制
import { it } from "@yuyi919/tslibs-effect/BunTester";
```

## 3. 及时对齐 Effect v4 (smol) 的命名变更

`Effect` 正在向 v4 (effect-smol) 演进，部分 API 发生了重命名。虽然本库为了兼容 v3 可能会保留旧别名，但在**编写新文档或示例时，必须使用 v4 的官方标准命名**。

* **案例**：`TRef` 已经被重命名为 `TxRef`。
* **行动准则**：在撰写文档时，Agent 应该主动核对最新的 Effect API，使用 `TxRef` 而不是历史包袱 `TRef`，以免误导新读者。

## 4. 文档的“可执行性”验证 (Executable Documentation)

Markdown 里写的代码很容易出现语法错误、逻辑漏洞或依赖缺失。

### 🚨 常见误区
Agent 仅凭“看起来没问题”就完成文档编写。比如：
```ts
it.effect("时间测试", () => Effect.gen(function* () {
  yield* Effect.sleep("10 seconds"); // 致命错误：这会阻塞主 Fiber
  yield* TestClock.adjust("10 seconds"); // 这里永远不会被执行
}));
```

### ✅ 正确做法
任何写进核心指南（如 `BUN_TESTER_GUIDE.md`）的代码，**必须**同步提取到 `examples/` 目录下（如 `examples/bunTesterGuide.test.ts`），并**实际运行测试 (`bun test`)**。
在上面的案例中，通过真实运行测试，我们发现必须将 `sleep` 放到后台运行 (`Effect.fork`)，才能让 `TestClock` 正常推进。
```ts
// ✅ 正确做法：经过真实测试验证的逻辑
const fiber = yield* Effect.sleep("10 seconds").pipe(Effect.fork);
yield* TestClock.adjust("10 seconds");
```
**行动准则：** Agent 在交付文档前，必须主动构建一个包含所有文档代码片段的测试/可执行脚本，运行 `pnpm run build && bun test ...`，确保 100% Pass 才能宣告任务完成。

## 5. 总结

当你（Agent）接手这个仓库的任务时，请时刻记住：
1. **聚合大于分散**：缺什么导出就补什么，别让用户去别的地方找。
2. **复制友好**：文档代码只用绝对包名。
3. **拥抱未来**：优先使用 Effect v4 的命名标准。
4. **实践出真知**：文档代码必须经过真实运行的洗礼。