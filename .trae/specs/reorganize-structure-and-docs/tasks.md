# Tasks
- [x] Task 1: 代码库现状盘点（仅分析）
  - [x] 盘点当前 `src/` 目录下“对外入口模块”（如 `index.ts`, `Effect.ts` 等）与“对外子路径模块”（如 `core/`, `libs/`, `cluster/`）的实际可导入路径
  - [x] 识别内部实现/测试文件与对外 API 的边界（例如 `*.test.ts`、`mock/`、业务域 `cluster/domain`）
  - [x] 输出一份“目标目录结构草案 + 兼容策略”（写入 `README.md` 的目录结构章节草稿）

- [x] Task 2: 目录结构重组（不改逻辑语义）
  - [x] 设计并落地新的目录分层（例如引入 `src/internal/` 或等价方案），保证分层清晰
  - [x] 进行文件/目录移动；仅在必要时调整 `import/export` 路径以恢复构建
  - [x] 如对外子路径需要保持兼容：为旧路径添加薄再导出层（仅 `export * from ...`/`export type ...`），并在文档中说明
  - [x] 运行格式化/检查（biome）确保重组后风格一致

- [x] Task 3: 文档编写（README 为主，面向人类 + agent）
  - [x] 在根目录 `README.md` 增加：项目定位、安装/使用方式、导出策略、常用入口示例、与 effect-v3 命名对齐说明
  - [x] 在 `README.md` 增加：目录结构说明（重组后）、子路径兼容策略（含可能的迁移说明）
  - [x] 在 `README.md` 增加：维护者/agent 约束（不改逻辑、如何添加新导出/对齐函数、测试/构建命令）

- [x] Task 4: 验证与回归
  - [x] `bun test src` 通过
  - [x] `npm run build`（tsc --build）通过，产物结构满足 `package.json#exports` 的预期

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2, Task 3
