# Tasks
- [ ] Task 1: 盘点示例与脚本现状
  - [ ] 列出当前仓库中应视为“示例/脚本/PoC”的文件清单（根目录与 `src/internal/**`）
  - [ ] 识别这些示例是否被构建配置引用（例如 `vite.config.ts` entry、package.json scripts）

- [ ] Task 2: 示例迁移到 `examples/`
  - [ ] 创建 `examples/` 目录并按主题分组（例如 `examples/icons/`, `examples/cluster/`）
  - [ ] 移动示例文件到 `examples/`（必要时调整相对导入路径与 shebang，但不改变逻辑语义）
  - [ ] 若构建配置引用了示例脚本路径，同步更新配置以保持现有命令可运行

- [ ] Task 3: 文档勘误（Effect v4 缓存语义）
  - [ ] 更新 `docs/batch-and-cache-guide.md`：移除/替换 `withRequestCaching` 相关描述，改为显式缓存开启方式（`RequestResolver.withCache` 或等价模式）
  - [ ] 在文档中补充“默认不缓存”的说明，并给出与 `icons.ts` 场景匹配的推荐写法

- [ ] Task 4: README 引用与说明更新
  - [ ] 更新 `README.md`：确保引用的文档链接路径正确；补充 `examples/` 目录定位与使用方式

- [ ] Task 5: 验证与回归
  - [ ] `npm run build`（tsc --build）通过
  - [ ] `npm run test`（bun test src）通过

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, Task 3
- Task 5 depends on Task 2, Task 3, Task 4
