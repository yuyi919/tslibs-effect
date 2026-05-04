# gitignore-test-edgecases

用于测试 `gitignore-globs.ts` 的多个边缘用例目录集合。

## 运行方式

进入任一 case 目录后运行：

```bash
bun run ../../gitignore-globs.ts
```

或输出 JSON：

```bash
bun run ../../gitignore-globs.ts --json
```

## Case 列表

- `case-bom-escapes/`：BOM、`\#` / `\!` 转义、带空格的模式、被 ignore 目录下的 `.gitignore`（应被剪枝）
- `case-anchored/`：以 `/` 开头的锚定规则 vs 非锚定规则（验证只忽略根 build，不忽略 sub/build）
- `case-hidden/`：隐藏目录 `.cache/` 被 ignore（应剪枝），`.config/` 未 ignore（应读取其 `.gitignore`）
- `case-charclass/`：包含字符类 `dist[0-9]/`、单字符匹配 `file?.tmp`（用于验证剪枝/匹配转换）
- `case-negation-prune/`：父目录 ignore + 子目录否定（展示“剪枝优先”策略的限制：可能错过否定包含）

