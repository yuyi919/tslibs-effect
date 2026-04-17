const fs = require('fs');
const data = require('./data.json');

let md = "此次合并主要更新了项目的依赖，导致大量 `pnpm` 缓存文件被添加到 `.pnpm-store` 目录中。这些更改由包管理器自动生成，用于锁定和加速依赖项的安装，没有直接修改项目核心业务代码。\n\n";
md += "| 文件 | 变更 |\n";
md += "|------|---------|\n";

for (const file of data) {
  // convert absolute path to relative path if starts with /workspace/
  let relPath = file.path;
  if (relPath.startsWith('/workspace/')) {
    relPath = relPath.substring('/workspace/'.length);
  }
  md += `| ${relPath} | - 添加了 pnpm 缓存文件 |\n`;
}

fs.writeFileSync('output.md', md);
console.log("Done");
