import { mapValues } from "es-toolkit";
import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: { entry: ["./examples/icons.ts"], formats: ["es"] },
    target: "esnext",
    minify: true,
    rolldownOptions: {
      output: {
        minify: true,
      },
      platform: "node",
      external: [/^node:/, "glob"],
      treeshake: {
        annotations: true,
        moduleSideEffects: [{ test: /./, sideEffects: false }],
        unknownGlobalSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
  },
  pack: {
    entry: [
      "./src/*.ts",
      "./src/libs/*.ts",
      "./src/internal/utils/*.ts",
      "./src/internal/libs/*.ts",
      "!**/*.test.ts",
    ],
    outputOptions: {
      comments: {
        legal: true,
        annotation: true,
        jsdoc: false,
      },
    },
    deps: {
      neverBundle: [/^bun(:|-)/, /^node(:|-)/],
    },
    fixedExtension: false,
    platform: "node",
    target: "es2017",
    treeshake: {
      unknownGlobalSideEffects: false,
    },
    unbundle: true,
    exports: {
      enabled: true,
      devExports: true,
      customExports(exports, { isPublish }) {
        return mapValues(exports, (p) =>
          isPublish && p.endsWith(".js")
            ? {
                types: p.replace(/.js$/, ".d.ts").replace(/dist\//, "types/"),
                default: p,
              }
            : typeof p === "object"
              ? p.default
              : p
        );
      },
    },
    onSuccess: "vp run build:dts",
    dts: false,
  },
  fmt: {
    indentStyle: "space",
    indentWidth: 2,
    printWidth: 80,
    endOfLine: "lf",
    overrides: [
      {
        files: ["**/src/**/*.ts"],
        options: {
          jsxQuoteStyle: "double",
          trailingCommas: "es5",
          semicolons: "always",
          arrowParentheses: "always",
          quoteStyle: "double",
          bracketSpacing: true,
        },
      },
    ],
  },
  lint: {
    options: { typeAware: true, typeCheck: false },
  },
});
