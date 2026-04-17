const { execSync } = require('child_process');
const fs = require('fs');

const files = [
  ".trae/specs/move-examples-and-update-caching-docs/checklist.md",
  ".trae/specs/move-examples-and-update-caching-docs/spec.md",
  ".trae/specs/move-examples-and-update-caching-docs/tasks.md",
  ".trae/specs/reorganize-structure-and-docs/checklist.md",
  ".trae/specs/reorganize-structure-and-docs/spec.md",
  ".trae/specs/reorganize-structure-and-docs/tasks.md",
  ".trae/specs/test-exported-functions/checklist.md",
  ".trae/specs/test-exported-functions/spec.md",
  ".trae/specs/test-exported-functions/tasks.md",
  "AGENTS.md",
  "README.md",
  "biome.json",
  "docs/batch-and-cache-guide.md",
  "docs/effect-smol-research.md",
  "examples/cluster/cluster/env.ts",
  "examples/cluster/cluster/health.ts",
  "examples/cluster/cluster/runtime.ts",
  "examples/cluster/cluster/sql.ts",
  "examples/cluster/domain/TickCron.ts",
  "examples/cluster/domain/mathematician.ts",
  "examples/cluster/domain/process-crasher.ts",
  "examples/cluster/runner.ts",
  "examples/cluster/test.ts",
  "examples/cluster/wf.ts",
  "examples/icons.ts",
  "examples/next.ts",
  "icons.ts",
  "package-lock.json",
  "package.json",
  "src/BunTester.ts",
  "src/FsUtils.ts",
  "src/GlobalScope.ts",
  "src/Persistence.ts",
  "src/Service.test.ts",
  "src/cluster/cluster/env.ts",
  "src/cluster/cluster/runtime.ts",
  "src/cluster/domain/TickCron.ts",
  "src/cluster/domain/mathematician.ts",
  "src/cluster/domain/process-crasher.ts",
  "src/cluster/test.ts",
  "src/cluster/wf.ts",
  "src/core/FiberRef.ts",
  "src/core/TaggedBrandContext.ts",
  "src/core/_helper.ts",
  "src/core/batched.ts",
  "src/core/cause.ts",
  "src/core/context.ts",
  "src/core/contracts.ts",
  "src/core/effect.ts",
  "src/core/effect/batched.ts",
  "src/core/effect/funcs.ts",
  "src/core/effect/persisted.ts",
  "src/core/effect/scopedCache.ts",
  "src/core/effect/shared.ts",
  "src/core/layer.ts",
  "src/core/logLevel.ts",
  "src/core/logger.ts",
  "src/core/mock/Effect.ts",
  "src/core/mock/Runtime.ts",
  "src/core/schedule.ts",
  "src/effect-next.ts",
  "src/internal/libs/DrainableWorker.test.ts",
  "src/internal/libs/DrainableWorker.ts",
  "src/internal/libs/KeyedCoalescingWorker.test.ts",
  "src/internal/libs/KeyedCoalescingWorker.ts",
  "src/internal/libs/Net.test.ts",
  "src/internal/libs/Net.ts",
  "src/internal/test/Service.test.ts",
  "src/internal/test/core/effect.test.ts",
  "src/internal/test/core/effect/batched.test.ts",
  "src/internal/test/core/effect/persisted.test.ts",
  "src/internal/test/core/effect/scopedCache.test.ts",
  "src/internal/test/core/layer.test.ts",
  "src/internal/test/core/mock/Runtime.test.ts",
  "src/libs/DrainableWorker.test.ts",
  "src/libs/DrainableWorker.ts",
  "src/libs/KeyedCoalescingWorker.test.ts",
  "src/libs/KeyedCoalescingWorker.ts",
  "src/libs/Net.test.ts",
  "src/libs/Net.ts",
  "tsconfig.json",
  "tsdown.config.ts",
  "vite.config.ts"
];

for (const file of files) {
  try {
    const diff = execSync(`git diff origin/master...trae/solo-agent-TcIcJ5 -- "${file}"`).toString();
    const isNew = diff.includes('new file mode');
    const isDeleted = diff.includes('deleted file mode');
    const isRename = diff.includes('rename from') && diff.includes('rename to');
    
    let summary = [];
    if (isNew) summary.push('新增文件');
    else if (isDeleted) summary.push('删除文件');
    else if (isRename) summary.push('移动或重命名文件');
    else summary.push('修改文件内容');
    
    // For core files, see what was changed if not too long
    if (!isNew && !isDeleted && diff.length > 0) {
       // just basic heuristic
       if (diff.includes('+import') || diff.includes('-import')) summary.push('更新导入依赖');
       if (diff.includes('function') || diff.includes('const') || diff.includes('class')) summary.push('重构或更新实现逻辑');
    }
    
    console.log(`| ${file} | - ${summary.join('<br>- ')} |`);
  } catch(e) {
  }
}
