import { afterEach, describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectNestedDirectoryJSON,
  type NestedDirectoryJSON,
} from "../src/collectNestedDirectoryJSON.js";

const tempRoots: string[] = [];

async function createTempRoot() {
  const dir = await mkdtemp(join(tmpdir(), "nested-directory-json-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("collectNestedDirectoryJSON", () => {
  test("应收集完整目录结构：空目录为对象，文本文件为 string，二进制文件为 Buffer", async () => {
    const rootDir = await createTempRoot();

    await mkdir(join(rootDir, "packages", "pkg-a", "src"), { recursive: true });
    await mkdir(join(rootDir, "assets"), { recursive: true });
    await mkdir(join(rootDir, "empty-dir"), { recursive: true });

    await writeFile(join(rootDir, "README.md"), "# demo\n");
    await writeFile(
      join(rootDir, "packages", "pkg-a", "src", "index.ts"),
      "export const answer = 42;\n"
    );
    await writeFile(
      join(rootDir, "assets", "logo.bin"),
      Buffer.from([0x00, 0xff, 0x89, 0x50])
    );

    const json = (await collectNestedDirectoryJSON({
      rootDir,
    })) as NestedDirectoryJSON;

    expect(json["README.md"]).toBe("# demo\n");
    expect((json.packages as NestedDirectoryJSON)["pkg-a"]).toBeDefined();
    expect(
      (
        ((json.packages as NestedDirectoryJSON)["pkg-a"] as NestedDirectoryJSON)
          .src as NestedDirectoryJSON
      )["index.ts"]
    ).toBe("export const answer = 42;\n");
    expect(json["empty-dir"]).toEqual({});

    const logo = (json.assets as NestedDirectoryJSON)["logo.bin"];
    expect(Buffer.isBuffer(logo)).toBeTrue();
    expect(Array.from(logo as Buffer)).toEqual([0x00, 0xff, 0x89, 0x50]);
  });

  test("应保留点文件与点目录", async () => {
    const rootDir = await createTempRoot();

    await mkdir(join(rootDir, ".config"), { recursive: true });
    await writeFile(join(rootDir, ".gitignore"), "node_modules/\n");
    await writeFile(
      join(rootDir, ".config", "settings.json"),
      '{ "ok": true }\n'
    );

    const json = await collectNestedDirectoryJSON({ rootDir });

    expect(json[".gitignore"]).toBe("node_modules/\n");
    expect((json[".config"] as NestedDirectoryJSON)["settings.json"]).toBe(
      '{ "ok": true }\n'
    );
  });
});
