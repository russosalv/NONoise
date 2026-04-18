# md-extractor

Node.js CLI that converts documents (PDF, DOCX, JPG, JPEG, PNG) into structured Markdown via the **LlamaCloud** parsing service (tier `agentic`). In addition to text, it downloads every image embedded in the document, saves them into a sibling `<basename>-assets/` folder, and rewrites the Markdown image references to point at the local assets folder (`./<basename>-assets/<name>`).

This tool is meant to turn official source documents (PDFs, DOCX specs, images of diagrams) into a Markdown version that can be indexed by `graphify`, consumed by the `reverse-engineering` and `requirements-ingest` skills, or simply grep'd by humans and AI assistants. **The extracted markdown — not the raw PDF — is the canonical source of truth that graphify indexes.**

## What it does, in short

1. Reads `LLAMA_CLOUD_API_KEY` from the environment, or prompts for it.
2. Takes the source file path as the first CLI argument (or prompts for it).
3. Uploads the file to LlamaCloud (`files.create` with `purpose: "parse"`).
4. Runs the `agentic` parser to extract `markdown_full` + image metadata.
5. Writes the extracted `<basename>.md` **next to the source file** (same directory, same basename).
6. Saves every image into `<basename>-assets/` **next to the `.md`** and rewrites links `![...](...)` to `./<basename>-assets/<name>`.

Supported extensions: `.pdf`, `.docx`, `.jpg`, `.jpeg`, `.png`. Anything else is rejected.

## Output contract (important)

**By default the output lives next to the input.** This is the contract the `reverse-engineering` / `requirements-ingest` skills rely on: they look for a sibling `.md` next to every `.pdf` and, if it exists, treat it as the canonical source instead of the raw PDF.

| Input | Default output |
|-------|----------------|
| `docs/requirements/<domain>/sources/Spec.pdf` | `docs/requirements/<domain>/sources/Spec.md` + `docs/requirements/<domain>/sources/Spec-assets/` |
| `docs/support/reverse/<subject>/.meta/raw/Doc.pdf` | `docs/support/reverse/<subject>/.meta/raw/Doc.md` + `Doc-assets/` |
| `any/path/file.pdf` | `any/path/file.md` + `any/path/file-assets/` |

The tool does **not** impose where the source PDF must live — it only guarantees that the extracted `.md` is a sibling of the PDF. You decide where to put the source; downstream skills find the `.md` automatically.

Use `--out <dir>` (or `-o <dir>`) if you want the output somewhere else. A legacy positional second argument also still works.

## Dependencies

- Node.js (ESM, requires `type: "module"` — already set in `package.json`).
- npm package: `@llamaindex/llama-cloud` (public, MIT).
- A LlamaCloud account with an API key.

Install:

```bash
cd tools/md-extractor
npm install
```

## Configuration

The API key can be provided in two ways:

- **Env var**: `LLAMA_CLOUD_API_KEY=...` — the tool reads it silently and does not prompt.
- **Interactive prompt**: if the env var is missing, the tool prompts for it on stdin (masked input).

```bash
# bash / zsh
export LLAMA_CLOUD_API_KEY="llx-..."

# PowerShell (current session)
$env:LLAMA_CLOUD_API_KEY = "llx-..."
```

## Usage

Two equivalent ways (npm script or direct invocation).

```bash
# from the workspace root
node tools/md-extractor/extract.js "<path-to-file>" [--out "<output-dir>"]

# or enter the folder and run via npm
cd tools/md-extractor
npm start -- "<path-to-file>"
```

With no arguments, the tool prompts for the path interactively.

### Arguments

| Flag / position | Description | Default |
|-----------------|-------------|---------|
| `<input>` (1st positional) | Path to the source file | prompted at runtime |
| `--out <dir>` / `-o <dir>` | Output directory | directory of the input file (sibling) |
| `<outDir>` (2nd positional, legacy) | Output directory | same as `--out` |

## Example

```bash
node tools/md-extractor/extract.js "docs/requirements/billing/sources/BillingSpec.pdf"
```

Produces:

```
docs/requirements/billing/sources/
├── BillingSpec.pdf              # source (unchanged)
├── BillingSpec.md               # extracted Markdown
└── BillingSpec-assets/          # extracted images
    ├── page_1_image_1_v2.jpg
    ├── page_1_image_2_v2.jpg
    └── ...
```

### What the extracted Markdown is good for

- Feeding `graphify` (it indexes the `.md`, not the `.pdf`).
- Feeding the `reverse-engineering` skill (looks for sibling `.md` next to every `.pdf`).
- Feeding the `requirements-ingest` skill (source of truth for requirements lives in `docs/requirements/<domain>/sources/*.md`).
- Being directly readable and grep-able by Claude Code / Copilot / any assistant — no need to open the PDF.

## Operational notes

- The `agentic` tier consumes LlamaCloud credits — mind the cost for large files.
- The uploaded PDF stays on LlamaCloud until the service-side retention policy expires.
- If the Markdown already contains absolute URLs (`http(s)://`) or `data:` inline images, they are left untouched — only local/relative references are rewritten to `./<basename>-assets/`.
- The `<basename>-assets/` folder is only created when the document actually has images.
- If the output `.md` or any asset already exists it is overwritten without asking.
