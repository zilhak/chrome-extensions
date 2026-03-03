import { readdir, cp, rm, mkdir } from "fs/promises";
import { join } from "path";

const SRC = "src";
const DIST = "dist";

const extensions: Record<string, string[]> = {
  "ai-chat-manager": ["content.ts", "popup.ts"],
  "hotkey-to-page": ["background.ts", "launcher.ts"],
  "transaction-to-clip": ["devtools.ts", "panel.ts"],
};

// Clean dist
await rm(DIST, { recursive: true, force: true });

for (const [ext, entrypoints] of Object.entries(extensions)) {
  const srcDir = join(SRC, ext);
  const outDir = join(DIST, ext);

  await mkdir(outDir, { recursive: true });

  // Bundle TS entry points
  const result = await Bun.build({
    entrypoints: entrypoints.map((e) => join(srcDir, e)),
    outdir: outDir,
    format: "esm",
    target: "browser",
    minify: false,
  });

  if (!result.success) {
    console.error(`Build failed for ${ext}:`);
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Copy static files (HTML, CSS, JSON, icons)
  const files = await readdir(srcDir);
  for (const file of files) {
    if (file.endsWith(".ts")) continue;
    const srcPath = join(srcDir, file);
    const destPath = join(outDir, file);
    await cp(srcPath, destPath, { recursive: true });
  }

  console.log(`✓ ${ext}`);
}

console.log("\nBuild complete → dist/");
