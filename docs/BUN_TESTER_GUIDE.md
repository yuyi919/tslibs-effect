# BunTester 核心使用指南

BunTester 是为 `bun:test`（Bun 的原生测试运行器）量身定制的 Effect 测试封装层。
它的 API 设计高度对齐了官方的 `@effect/vitest`，旨在让你能够在 Bun 环境下无缝、优雅地测试包含异步、副作用、依赖注入和资源管理的 Effect 代码。

即使你从未使用过 `@effect/vitest`，这篇指南也会帮助你快速上手 Effect 专属的测试方法。

## 快速开始

在使用 Bun 测试 Effect 代码时，直接返回 Effect 是不会被运行器捕获的，你需要使用特定的包裹器。BunTester 提供了 `it.effect` 来替代普通的 `it`，并自动处理 Effect 的执行与错误。

```ts
import { Effect } from "@yuyi919/tslibs-effect/effect-next";
import { describe, expect, it } from "@yuyi919/tslibs-effect/BunTester";

describe("基础功能", () => {
  // 普通的同步测试
  it("普通测试", () => {
    expect(1 + 1).toBe(2);
  });

  // 使用 it.effect 测试 Effect 代码
  it.effect("测试一个 Effect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(42);
      expect(result).toBe(42);
    })
  );

  // 支持 skip / only / fails 等修饰符
  it.effect.skip("跳过这个 Effect 测试", () => 
    Effect.fail("不会执行到这里")
  );
});
```

## 常见测试 API 

### 1. `it.effect` (最常用)

将包含测试逻辑的 Effect 提交给运行器。它不仅仅是 `Effect.runPromise` 的简单包装，它还内置提供了测试常用的服务：
- 自动提供 **`TestClock`**（便于快进时间测试）
- 自动提供 **`TestConsole`**（拦截日志输出以进行验证）
- 自动包裹在 **`Scope`** 内（测试结束自动释放资源）

```ts
import { Effect, Context, Layer, TxRef } from "@yuyi919/tslibs-effect/effect-next";
import * as TestClock from "effect/testing/TestClock";
import { describe, expect, it, layer, waitFor } from "@yuyi919/tslibs-effect/BunTester";

it.effect("时间控制测试", () =>
  Effect.gen(function* () {
    let executed = false;
    const fiber = yield* Effect.sleep("10 seconds").pipe(
      Effect.tap(() => { executed = true }),
      Effect.fork
    );

    // TestClock 允许我们快进虚拟时间
    yield* TestClock.adjust("10 seconds");
    expect(executed).toBe(true);
  })
);
```

### 2. `it.live` (真实环境测试)

如果你不需要虚拟时间（`TestClock`）和拦截日志（`TestConsole`），而是想要执行**真实的延迟**（比如真实的 HTTP 请求测试），请使用 `it.live`。

```ts
// 不会提供 TestClock 拦截环境，内部使用的是原生的 System 时钟
it.live("真实的延迟测试", () =>
  Effect.gen(function* () {
    const start = Date.now();
    yield* Effect.sleep("100 millis"); 
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  })
);
```

### 3. `it.flakyTest` (重试不稳定测试)

有些涉及到竞态条件或网络调用的测试可能会偶尔失败（Flaky）。`it.flakyTest` 允许你提供一个 Effect 并给它设定超时或最大重试次数，只要在规定时间内容能成功一次，测试就算通过。

```ts
it.effect("不稳定的测试", () =>
  it.flakyTest(
    Effect.gen(function* () {
      // 可能会失败的逻辑
      const result = yield* unstableCall();
      expect(result).toBe("ok");
    }),
    "5 seconds" // 允许在 5 秒内多次重试
  )
);
```

## 依赖注入与 Layer 测试

Effect 的一大优势在于强大的依赖注入机制（Layer）。你可以使用 `it.layer()` 或顶层的 `layer()` 为一组测试预先提供环境，这类似于传统的 `beforeAll` / `afterAll`。

```ts
import { layer } from "@yuyi919/tslibs-effect/BunTester";
import { Context, Layer, Effect } from "@yuyi919/tslibs-effect/effect-next";

class Database extends Context.Tag("Database")<
  Database,
  { query: () => Effect.Effect<string> }
>() {}

const LiveDatabase = Layer.succeed(
  Database,
  Database.of({ query: () => Effect.succeed("data") })
);

// 为整个代码块注入 LiveDatabase
layer(LiveDatabase)("测试数据库相关功能", (it) => {
  it.effect("执行查询", () =>
    Effect.gen(function* () {
      // 在这里 Database 已经可用了
      const db = yield* Database;
      const result = yield* db.query();
      expect(result).toBe("data");
    })
  );

  // 也可以继续嵌套层级注入！
  it.layer(SomeOtherLayer)("嵌套层", (it) => {
    // ...
  });
});
```

*注意：`layer` 闭包内部会传递一个被绑定好上下文的局部 `it` 对象。所以你应该使用 `(it) => { it.effect(...) }`，而不要使用外部引入的全局 `it`。*

## BunTester 专属特性

在对齐 `@effect/vitest` 的基础之上，BunTester 根据常见的开发痛点提供了一些特有的增强 API。

### 1. `it.gen` 和 `it.scopedGen` 语法糖

在标准的 Effect 测试中，由于生成器风格最流行，我们经常要写样板代码 `() => Effect.gen(function* () { ... })`。
BunTester 直接将二者合二为一，极大减少了嵌套层级，代码更清爽。

```ts
import { describe, expect, it } from "@yuyi919/tslibs-effect/BunTester";
import { Effect } from "@yuyi919/tslibs-effect/effect-next";

// 标准写法
it.effect("普通的写法", () =>
  Effect.gen(function* () {
    expect(yield* Effect.succeed(1)).toBe(1);
  })
);

// 🍬 甜甜的写法 (等效于 it.effect + Effect.gen)
it.gen("更清爽的写法", function* () {
  expect(yield* Effect.succeed(1)).toBe(1);
});

// 对应地，还有针对 Scope 的甜甜写法 (等效于 it.scoped + Effect.gen)
it.scopedGen("带作用域的更清爽的写法", function* () {
  // ...
});
```

### 2. `waitFor`：优雅的轮询机制

测试包含 STM（Software Transactional Memory，软件事务内存）或其他基于引用（Ref/TxRef）的并发状态时，如果依赖于其他 Fiber 更新状态，你可能需要轮询检查。
BunTester 提供了一个 `waitFor` 工具，它利用了 Effect STM 的重试机制 (`Effect.txRetry`)，让测试并发状态更优雅。

```ts
import { it, waitFor } from "@yuyi919/tslibs-effect/BunTester";
import { TxRef, Effect } from "@yuyi919/tslibs-effect/effect-next";

it.gen("测试并发事务", function* () {
  const counter = yield* TxRef.make(0);
  
  // 模拟一个异步改变状态的动作
  yield* Effect.fork(
    Effect.sleep("100 millis").pipe(
      Effect.andThen(TxRef.update(counter, n => n + 1))
    )
  );

  // 优雅地等待条件满足，不会陷入忙轮询 (busy-waiting)
  yield* waitFor(counter, (val) => {
    if (val !== 1) throw new Error("not ready");
  });

  expect(yield* TxRef.get(counter)).toBe(1);
});
```

## 与 @effect/vitest 的差异与局限性

受限于 `bun:test` 自身的架构以及对 API 对齐的取舍，如果你要将已有的 `@effect/vitest` 项目迁移到 `BunTester` 上，需要注意以下差异：

### 1. `TestContext` 缺失
Vitest 允许在测试中接收一个 `ctx`（TestContext 对象），你可以在测试中调用 `ctx.skip()` 或者往 ctx 上挂载自定义变量。
BunTester 在内部处理中，由于 `bun:test` 对该模式的支持较弱，注入到测试函数中的 `ctx` 多数情况下只是一个 Stub（存根 `{}` 空对象），因此不要依赖测试函数参数注入的上下文控制逻辑。

### 2. `addEqualityTesters` 和 `describeWrapped`
* **`addEqualityTesters`**：在 `@effect/vitest` 中，可以通过它覆盖 `expect` 比较的相等性算法（例如对于特定自定义类型）。由于 Bun 的 `expect` 不支持动态添加这类机制，BunTester 移除了这个方法。
* **`describeWrapped`**：被移除，如果需要测试上下文的组合注入，建议全部通过顶层的 `layer()` 包装器来实现。

### 3. 断言修饰符的微小差异
在 `@effect/vitest` 中，处理属性测试与条件测试用的是 `it.for(cases)` 和 `it.fails()`，在 BunTester 中为了贴合 Bun 原生语法，映射成了 `it.each` 和 `it.fails`，因此：

```ts
// ❌ Vitest 风格
it.effect.for([1,2,3])("测试", ...);

// ✅ BunTester 风格
it.effect.each([1,2,3])("测试", ...);
```

### 4. 属性测试（Property Testing）的 Schema 支持
在 `it.prop` (基于 `fast-check` 的属性测试) 的实现中，全局回退版（fallback）目前直接抛出了 `"Schemas are not supported yet"` 异常。不过，在 `it.effect.prop` 等绑定的版本中，支持了将 `Schema` 转化为 `Arbitrary`。
因此建议在编写涉及 `effect/Schema` 的属性测试时，务必使用 `it.effect.prop` 等 Effect 强关联方法。

---

**总结**：`BunTester` 绝大部分情况下能平替 `@effect/vitest`，但在依赖极个别特殊测试上下文（Context 注入、定制比较器）时可能需要你微调测试代码的写法。而它额外附赠的 `it.gen` 和 `waitFor` 会显著提升日常写测试的体验！
