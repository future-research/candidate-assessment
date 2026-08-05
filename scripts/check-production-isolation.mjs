import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const bannedText = [
  "support.js",
  ".dc.html",
  "DCLogic",
  "sc-if",
  "sc-for",
  "style-hover",
  "fonts.googleapis.com",
  "ui/uploads/",
];
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(target);
      return /\.(?:css|ts|tsx)$/.test(entry.name) ? [target] : [];
    }),
  );
  return nested.flat();
}

const failures = [];
for (const file of await sourceFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const text of bannedText) {
    if (source.includes(text)) failures.push(`${path.relative(root, file)} contains ${text}`);
  }

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;
    const resolved = path.resolve(path.dirname(file), specifier);
    const archiveRoot = path.join(root, "ui");
    if (resolved === archiveRoot || resolved.startsWith(`${archiveRoot}${path.sep}`)) {
      failures.push(`${path.relative(root, file)} imports prototype archive ${specifier}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Production isolation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Production isolation passed: src has no prototype runtime dependency.");
}
