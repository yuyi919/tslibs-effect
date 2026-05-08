import {
  describe,
  expect,
  it,
  layer,
  waitFor,
} from "@yuyi919/tslibs-effect/BunTester";
import {
  Context,
  Effect,
  Layer,
  TestClock,
  TxRef,
} from "@yuyi919/tslibs-effect/effect-next";

describe("BunTester Guide Examples", () => {
  // --- 1. Introduction ---
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
    it.effect.skip("跳过这个 Effect 测试", () => Effect.fail("不会执行到这里"));
  });

  // --- 2. Common APIs ---
  it.effect("时间控制测试", () =>
    Effect.gen(function* () {
      let executed = false;
      const fiber = yield* Effect.sleep("10 seconds").pipe(
        Effect.tap(() => {
          return Effect.sync(() => (executed = true));
        }),
        Effect.fork
      );

      // TestClock 允许我们快进虚拟时间
      yield* TestClock.adjust("10 seconds");

      expect(executed).toBe(true);
    })
  );

  // 不会提供 TestClock 拦截环境，内部使用的是原生的 System 时钟
  it.live("真实的延迟测试", () =>
    Effect.gen(function* () {
      const start = Date.now();
      yield* Effect.sleep("10 millis"); // reduced from 100 for faster tests
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(10); // reduced from 100
    })
  );

  const unstableCall = () => Effect.succeed("ok");

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

  // --- 3. Dependency Injection ---
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
  });

  // --- 4. BunTester Exclusive Features ---
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
    expect(true).toBe(true);
  });

  it.gen("测试并发事务", function* () {
    const counter = yield* TxRef.make(0);

    // 模拟一个异步改变状态的动作
    yield* Effect.fork(
      Effect.sleep("100 millis").pipe(
        Effect.andThen(TxRef.update(counter, (n) => n + 1))
      )
    );

    // 优雅地等待条件满足，不会陷入忙轮询 (busy-waiting)
    yield* waitFor(counter, (val) => {
      if (val !== 1) throw new Error("not ready");
    });

    expect(yield* TxRef.get(counter)).toBe(1);
  });
});
