import { defineConfig } from "vite";

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
});
