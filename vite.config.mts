import { defineConfig } from "vite";
import { resolve, basename, dirname, extname } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";

const MODULE_ID = "dispatch";

// Plugin to sync dev templates/lang to dist on change (for watch mode)
function syncPublicPlugin() {
	return {
		name: "sync-public",
		handleHotUpdate({ file, server }) {
			const publicDir = resolve(__dirname, "src/public");
			if (file.startsWith(publicDir)) {
				// Copy the changed file to dist
				const relative = file.slice(publicDir.length);
				const dest = resolve(__dirname, "dist", relative);
				const destDir = dirname(dest);

				// Ensure dest dir exists and copy file
				import("fs").then((fs) => {
					fs.mkdirSync(destDir, { recursive: true });
					fs.copyFileSync(file, dest);
					console.log(`[sync-public] ${basename(file)} -> dist${relative}`);
				});
			}
		},
	};
}

export default defineConfig(({ mode }) => {
	const isDev = mode === "development";

	return {
		base: `/modules/${MODULE_ID}/dist/`,
		publicDir: false,

		build: {
			outDir: "dist",
			emptyDirFirst: true,
			sourcemap: isDev,
			minify: isDev ? false : "esbuild",

			lib: {
				entry: resolve(__dirname, "src/main.ts"),
				name: "Dispatch",
				formats: ["es"],
				fileName: () => "dispatch.bundle.js",
			},

			rollupOptions: {
				output: {
					assetFileNames: (assetInfo) => {
						const name = assetInfo.name ?? "";
						const ext = extname(name);
						// Keep CSS in assets folder
						if (ext === ".css") {
							return "assets/dispatch.css";
						}
						return `assets/${name}`;
					},
				},
				// Mark masks module exports as external - we import from the masks module at runtime
				external: [
					// Foundry globals
					/^foundry/,
					// Masks module exports - these will be loaded at runtime
					/^\/modules\/masks-newgeneration-unofficial\//,
				],
			},
		},

		css: {
			devSourcemap: isDev,
		},

		plugins: [
			tailwindcss(),
			// Copy templates and lang files to dist
			viteStaticCopy({
				targets: [
					{ src: "src/public/templates/**/*", dest: "templates" },
					{ src: "src/public/lang/**/*", dest: "lang" },
					{ src: "src/public/module.json", dest: "." },
				],
			}),
			// Sync public files on change in watch mode
			syncPublicPlugin(),
		],

		server: {
			port: 30002,
			open: false,
			proxy: {
				// Proxy everything except our module to Foundry
				"^(?!/modules/dispatch)": {
					target: "http://localhost:30000",
					ws: true,
				},
			},
		},
	};
});
