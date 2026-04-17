# 基于 Effect 框架的批处理与本地缓存优化指南

本指南基于代码库中 [icons.ts](../examples/icons.ts) 的实际案例，介绍如何使用 `@yuyi919/tslibs-effect` 提供的工具函数，在 Node.js / Bun 环境下优雅地实现**请求批处理 (Batching)**与**持久化缓存 (Persistent Caching)**，从而大幅提升脚本或服务的运行效率。

## 1. 核心概念

在使用 Effect 框架处理外部数据拉取（如 HTTP 请求、数据库查询）时，我们经常面临两个痛点：
1. **N+1 问题与并发控制**：短时间内触发大量相同的请求，导致目标服务器限流或被封禁。
2. **重复拉取耗时**：每次运行脚本都需要重新拉取体积庞大且变动不频繁的数据（如 Iconify 的 JSON 图标库）。

为了解决这些问题，我们可以结合以下 Effect 模式：
- **Batching（批处理）**：将短时间内发起的多个独立请求，自动收集、去重，并合并为一个批量请求（类似于 GraphQL DataLoader）。
- **Persistent Caching（持久化缓存）**：将请求结果持久化到本地文件系统（或 Redis 等 Key-Value 存储），跨进程/跨运行复用数据。

## 2. 批处理 (Batching)

在 [icons.ts](../examples/icons.ts) 中，我们通过 `Eff.batched` 或 `Eff.persistedBatch` 来定义一个支持自动批处理的请求函数。

### 定义批处理函数

假设我们需要根据 `id` 拉取数据：

```typescript
import { Eff, Schema } from "@yuyi919/tslibs-effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";

// 1. 定义底层单条数据的获取逻辑
const fetchWithId = (id: string) =>
  Eff.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(`https://api.example.com/data/${id}`);
    
    return yield* client.execute(request).pipe(
      // 校验状态码
      HttpClientResponse.filterStatusOk,
      // 解析 JSON
      HttpClientResponse.schemaBodyJson(Schema.Any),
      // 失败重试 3 次
      Eff.retry({ times: 3 }),
      // 异常兜底，返回空对象
      Eff.catchAll((e) => Eff.succeed({}))
    );
  });

// 2. 将其包装为批处理函数
const fetchBatched = Eff.batched(
  // 接收合并去重后的 ID 数组
  (ids: string[]) => {
    return Eff.gen(function* () {
      // 限制底层真实并发数为 2，防止并发过高
      const results = yield* Eff.all(ids.map(fetchWithId), { concurrency: 2 });
      
      // 返回结果数组，必须与传入的 ids 顺序/数量一致
      return results;
    });
  }
);
```

### 使用批处理函数

当你并发调用 `fetchBatched` 时，Effect 框架会自动将它们合并为一次调用传递给底层处理函数。

```typescript
const program = Eff.gen(function* () {
  // 这三个调用几乎同时发生
  // 框架会将 ["A", "B", "A"] 去重合并为 ["A", "B"]，传给 fetchBatched 的内部实现
  const [res1, res2, res3] = yield* Eff.all([
    fetchBatched("A"),
    fetchBatched("B"),
    fetchBatched("A"), // 重复的 ID 会被复用结果，不会发起新的真实请求
  ]);
});
```

## 3. 本地持久化缓存 (Persistent Caching)

纯粹的 Batching 只能在**当前进程的单次运行**中复用请求。如果我们需要跨运行复用（例如本地脚本缓存），则需要结合 `KeyValueStore` 进行持久化。

### 定义持久化批处理

在 `icons.ts` 中，我们使用了高级的 `Eff.persistedBatch` 来同时实现批处理与持久化。

```typescript
// 1. 定义数据的 Schema，用于校验缓存数据是否合法（防止毒数据）
const SchemaIconifyJSON = Schema.Any.pipe(
  Schema.refine(
    (a) => typeof a === "object" && a !== null && "prefix" in a && "icons" in a
  )
);

// 2. 定义持久化的批处理函数
const fetchIconifyJson = Eff.persistedBatch(
  // 标识符，用于作为缓存的 Key 前缀
  "fetchIconifyJson",
  // 底层批处理实现
  (ids: string[]) => Eff.all(ids.map(fetchWithId), { concurrency: 2 }),
  {
    // 定义缓存的存活时间 (TTL)
    timeToLive: (exit) => {
      // 如果请求成功且数据符合 Schema 预期，缓存 10 分钟
      if (Eff.Exit.isSuccess(exit) && Schema.is(SchemaIconifyJSON)(exit.value)) {
        return "10 minutes";
      }
      // 否则不缓存
      return "0 minutes";
    },
  }
);
```

### 注入文件系统存储层

默认情况下，`KeyValueStore` 是基于内存的。为了让缓存落盘到本地文件系统，我们需要在入口点提供具体的实现层（Layer）。

```typescript
import { Layer } from "effect";
import { KeyValueStore, Persistence } from "effect/unstable/persistence";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";

const program = Eff.gen(function* () {
  // 发起请求...
  const data = yield* fetchIconifyJson("mdi");
});

// 组装并运行
const RunnableLayer = Persistence.layerKvs.pipe(
  // 注入基于文件系统的 KeyValueStore，缓存将写入 "./icons_cache" 目录
  Layer.provideMerge(KeyValueStore.layerFileSystem("./icons_cache"))
);

Eff.runMain(program.pipe(Eff.provide(RunnableLayer)));

```

补充说明（Effect v4 缓存语义）：

- Effect v4 默认**不会**对 `RequestResolver` / `Effect.request` 做隐式缓存
- 若需要“同一次运行内”的请求级缓存，需要显式对 resolver 使用 `RequestResolver.withCache`

```ts
import { Effect, RequestResolver } from "effect";

const resolver = RequestResolver.makeBatched(/* ... */);
const cachedResolver = yield* RequestResolver.withCache(resolver, { capacity: 1024 });
```

## 4. 总结最佳实践

通过分析 [icons.ts](../examples/icons.ts) 的设计，我们总结出以下最佳实践：

1. **声明式的数据流**：使用 `Effect.gen` 编写类似同步代码的异步逻辑，通过 `pipe` 组合状态校验、序列化、重试和错误兜底（`catchAll`）。
2. **分离关注点**：将“拉取单条数据”、“限制并发与合并”以及“缓存策略”拆分为独立的配置项。
3. **防御性缓存**：**永远不要盲目信任缓存**。结合 `@effect/schema` 校验响应数据格式，并在 `timeToLive` 策略中动态决定缓存时间（成功才缓存，格式不对则丢弃），彻底杜绝“毒数据”污染本地环境。
4. **统一的环境注入**：业务逻辑（`program`）对缓存存放在内存还是磁盘完全无感，所有的副作用环境（`FileSystem`, `KeyValueStore`）都在入口处通过 `Layer` 统一注入。
