import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const watch = process.argv.includes("--watch");

mkdirSync(dist, { recursive: true });

const builds = [
  { entry: "src/content.ts", outfile: "content.js", format: "iife" },
  { entry: "src/injected.ts", outfile: "injected.js", format: "iife" },
];

async function runBuild() {
  copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
  copyFileSync(join(root, "src/content.css"), join(dist, "content.css"));

  for (const { entry, outfile, format } of builds) {
    await esbuild.build({
      entryPoints: [join(root, entry)],
      outfile: join(dist, outfile),
      bundle: true,
      format,
      target: ["chrome109"],
      minify: false,
      sourcemap: false,
    });
  }

  console.log("built → dist/");
}

if (watch) {
  const ctx = await esbuild.context({
    entryPoints: builds.map((b) => join(root, b.entry)),
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome109"],
  });
  await ctx.watch();
  console.log("watching...");
} else {
  await runBuild();
}
