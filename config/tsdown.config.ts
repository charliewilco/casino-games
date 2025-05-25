import { defineConfig } from "tsdown/config";

export default defineConfig({
	entry: ["src/index.mts"],
	outDir: "dist",
	clean: true,
	minify: true,
	publint: true,
	platform: "neutral",
	format: ["esm"],
	dts: true,
});
