#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { LlamaCloud } from "@llamaindex/llama-cloud";

function prompt(question, { mask = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (mask) {
      process.stdout.write(question);
      let value = "";
      const onData = (char) => {
        const s = char.toString("utf8");
        if (s === "\n" || s === "\r" || s === "\r\n" || s === "\u0004") {
          process.stdin.removeListener("data", onData);
          process.stdin.setRawMode?.(false);
          process.stdin.pause();
          process.stdout.write("\n");
          rl.close();
          resolve(value);
        } else if (s === "\u0003") {
          process.exit(1);
        } else if (s === "\u007f" || s === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          value += s;
          process.stdout.write("*");
        }
      };
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// --- CLI args parsing ---------------------------------------------------------
// Usage: extract.js <input> [--out <dir> | -o <dir>]
// Positional fallbacks (for backward compatibility):
//   extract.js <input> <outDir>
const rawArgs = process.argv.slice(2);
const positional = [];
let outOverride = null;
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === "--out" || a === "-o") {
    outOverride = rawArgs[i + 1];
    i++;
  } else if (a.startsWith("--out=")) {
    outOverride = a.slice("--out=".length);
  } else if (a === "-h" || a === "--help") {
    console.log(
      "Usage: md-extract <input> [--out <dir>]\n\n" +
        "  <input>        Path to .pdf, .docx, .jpg, .jpeg or .png file.\n" +
        "  --out, -o      Output directory (default: directory of <input>).\n\n" +
        "Output: <outDir>/<basename>.md plus <outDir>/<basename>-assets/ for images."
    );
    process.exit(0);
  } else {
    positional.push(a);
  }
}
if (!outOverride && positional.length >= 2) {
  // legacy positional: second positional arg is output dir
  outOverride = positional[1];
}

let apiKey = process.env.LLAMA_CLOUD_API_KEY;
if (!apiKey) {
  apiKey = (await prompt("LLAMA_CLOUD_API_KEY: ", { mask: true })).trim();
  if (!apiKey) {
    console.error("API key is required.");
    process.exit(1);
  }
}

let inputArg = positional[0];
if (!inputArg) {
  inputArg = stripQuotes(await prompt("Path to file (.pdf, .docx, .jpg, .jpeg, .png): "));
  if (!inputArg) {
    console.error("File path is required.");
    process.exit(1);
  }
}

const absInput = path.resolve(inputArg);
if (!fs.existsSync(absInput)) {
  console.error(`File not found: ${absInput}`);
  process.exit(1);
}

const ext = path.extname(absInput).toLowerCase();
if (![".pdf", ".docx", ".jpg", ".jpeg", ".png"].includes(ext)) {
  console.error(`Unsupported extension '${ext}'. Use .pdf, .docx, .jpg, .jpeg or .png`);
  process.exit(1);
}

const baseName = path.basename(absInput, ext);
// Default output: sibling of the input file (same directory). This makes the
// produced .md live next to the source, which is the convention expected by
// the reverse-engineering / requirements-ingest skills.
const outputDir = path.resolve(outOverride ?? path.dirname(absInput));
const imagesDir = path.join(outputDir, `${baseName}-assets`);
fs.mkdirSync(outputDir, { recursive: true });

const client = new LlamaCloud({ apiKey });

console.log(`Uploading ${absInput} ...`);
const fileObj = await client.files.create({
  file: fs.createReadStream(absInput),
  purpose: "parse",
});
console.log(`  file_id: ${fileObj.id}`);

console.log("Parsing (tier: agentic) ...");
const result = await client.parsing.parse({
  file_id: fileObj.id,
  tier: "agentic",
  version: "latest",
  expand: ["markdown_full", "images_content_metadata"],
});

let markdown = result.markdown_full ?? "";

const imagesMeta = result.images_content_metadata?.images ?? [];
if (imagesMeta.length > 0) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
console.log(`Downloading ${imagesMeta.length} image(s) ...`);
for (const img of imagesMeta) {
  const name = img.filename;
  const url = img.presigned_url;
  if (!name || !url) {
    console.warn(`  skip (missing name/url):`, img);
    continue;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  skip ${name}: ${res.status} ${res.statusText}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(imagesDir, name), buf);
    console.log(`  saved ${baseName}-assets/${name}`);
  } catch (e) {
    console.warn(`  error ${name}: ${e.message}`);
  }
}

const mdImgRegex = /!\[[^\]]*\]\(([^)\s]+)\)/g;

// Rewrite markdown image refs to ./<basename>-assets/<name>
markdown = markdown.replace(mdImgRegex, (full, ref) => {
  if (/^https?:\/\//i.test(ref) || ref.startsWith("data:")) return full;
  const name = path.basename(ref);
  return full.replace(ref, `./${baseName}-assets/${name}`);
});

const mdPath = path.join(outputDir, `${baseName}.md`);
fs.writeFileSync(mdPath, markdown, "utf8");

console.log(`\nMarkdown: ${mdPath}`);
if (imagesMeta.length > 0) {
  console.log(`Assets:   ${imagesDir}`);
}
