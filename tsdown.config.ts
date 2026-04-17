// import SomePlugin from 'some-plugin'
import { defineConfig } from "tsdown";

export default defineConfig({
	//   plugins: [SomePlugin()],
	// entry: ["./src/**/*.{ts,tsx}"],
	entry: ["./next"],
	outDir: "dist3",
	minify: false,
	// unbundle: true,
	deps: {
		// skipNodeModulesBundle: true
		// alwaysBundle: false
		alwaysBundle: [/effect/],
	},
	target: "esnext",
	treeshake: {
		moduleSideEffects: [{ test: /effect/, sideEffects: false }],
		unknownGlobalSideEffects: false,
	},
});
