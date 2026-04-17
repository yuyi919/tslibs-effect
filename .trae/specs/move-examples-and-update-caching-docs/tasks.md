# Tasks
- [x] Task 1: 盘点示例与脚本现状
  - [x] 列出当前仓库中应视为“示例/脚本/PoC”的文件清单（根目录与 `src/internal/**`）
  - [x] 识别这些示例是否被构建配置引用（例如 `vite.config.ts` entry、package.json scripts）

- [ ] Task 2: 示例迁移到 `examples/`
  - [x] 创建 `examples/` 目录并按主题分组（例如 `examples/icons/`, `examples/cluster/`）
  - [x] 移动示例文件到 `examples/`（必要时调整相对导入路径与 shebang，但不改变逻辑语义）
  - [x] 若构建配置引用了示例脚本路径，同步更新配置以保持现有命令可运行

- [ ] Task 3: 示例勘误（Effect v4 缓存语义）
  - [x] 扫描示例中遗留的 `withRequestCaching` 等无效 API 用法并移除
  - [x] 若示例需要缓存：改为使用 `RequestResolver.withCache`（或等价显式机制）演示；若不需要缓存：移除“禁用缓存”相关代码与叙述

- [ ] Task 4: 文档勘误（Effect v4 缓存语义）
  - [x] 更新 `docs/batch-and-cache-guide.md`：移除/替换 `withRequestCaching` 相关描述，改为显式缓存开启方式（`RequestResolver.withCache` 或等价模式）
  - [x] 在文档中补充“默认不缓存”的说明，并给出与示例场景匹配的推荐写法

- [ ] Task 5: README 引用与说明更新
  - [x] 更新 `README.md`：确保引用的文档链接路径正确；补充 `examples/` 目录定位与使用方式

- [x] Task 6: 验证与回归
  - [x] `npm run build`（tsc --build）通过
  - [x] `npm run test`（bun test src）通过

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 2, Task 4
- Task 6 depends on Task 2, Task 3, Task 4, Task 5
