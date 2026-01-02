import esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");

const entryPath = path.join(repoRoot, "src", "index.js");
const headerPath = path.join(repoRoot, "src", "userscript-header.txt");
const outFile = path.join(repoRoot, "ChatGPT_Usage.js");

const isWatch = process.argv.includes("--watch");

const USERSCRIPT_HEADER_RE =
  /^\s*\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==\s*[\r\n]+/m;

async function readUserscriptHeader() {
  const header = await readFile(headerPath, "utf8");
  const match = header.match(USERSCRIPT_HEADER_RE);
  if (!match) {
    throw new Error(
      `Userscript header not found in ${path.relative(repoRoot, headerPath)}`,
    );
  }
  return match[0].replaceAll("\r\n", "\n");
}

async function main() {
  const banner = await readUserscriptHeader();

  const options = {
    entryPoints: [entryPath],
    outfile: outFile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    charset: "utf8",
    banner: { js: banner },
    treeShaking: false,
    minify: false,
    sourcemap: isWatch,
    logLevel: "info",
  };

  if (isWatch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    // Keep the process alive in watch mode.
    process.stdin.resume();
  } else {
    await esbuild.build(options);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
