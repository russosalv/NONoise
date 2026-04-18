# Installing Structurizr CLI — advisor-only

The `c4-doc-writer` skill **never auto-installs** Structurizr CLI. This follows the NONoise framework policy for third-party tooling (same rule applied to LSPs and voice-to-text tools): the skill prints the command and lets the user run it.

## Option A — Homebrew (macOS / Linux)

```bash
brew install structurizr-cli
structurizr-cli version
```

The formula is maintained at https://github.com/structurizr/cli.

## Option B — Docker one-shot (no install, any OS)

Runs the official image inline. Works on Windows, macOS, Linux identically.

```bash
docker run --rm \
  -v "$PWD:/usr/local/structurizr" \
  structurizr/cli \
  export -workspace /usr/local/structurizr/docs/architecture/c4/workspace.dsl \
    -format mermaid \
    -output /usr/local/structurizr/docs/architecture/c4/rendered
```

On Windows PowerShell, swap `"$PWD"` for `${PWD}`:

```powershell
docker run --rm `
  -v "${PWD}:/usr/local/structurizr" `
  structurizr/cli `
  export -workspace /usr/local/structurizr/docs/architecture/c4/workspace.dsl `
    -format mermaid `
    -output /usr/local/structurizr/docs/architecture/c4/rendered
```

## Option C — npm wrapper

Community wrapper, no JVM installed separately (it still downloads the Structurizr jar under the hood):

```bash
npm install -g @structurizr/cli
structurizr-cli version
```

Check the package is current on npm before recommending — the official flavour is the JVM build; the npm wrapper is convenient but not universally used.

## Option D — Structurizr Lite (interactive browser)

Runs a local web UI at `http://localhost:8080` that reads `workspace.dsl` live. Great for iterating on views.

```bash
docker run -it --rm -p 8080:8080 \
  -v "$PWD/docs/architecture/c4:/usr/local/structurizr" \
  structurizr/lite
```

Stop with `Ctrl+C`. No persistent state outside the mounted folder.

## Validating without rendering

If you only want to check the DSL parses:

```bash
structurizr-cli validate -workspace docs/architecture/c4/workspace.dsl
```

Fast feedback loop — runs in under a second for normal-size workspaces.

## Version pinning

The skill does not pin a CLI version. If the user's render breaks because of a DSL feature that requires a newer CLI, suggest upgrading (`brew upgrade structurizr-cli` or `docker pull structurizr/cli`) rather than downgrading the DSL.

## When NOT to install

If the user only runs `c4-doc-writer` once a month and is fine viewing the DSL as text in PR reviews, they do not need the CLI at all. The workspace.dsl is self-documenting enough that human reviewers can follow it. Install the CLI only when someone wants rendered diagrams for a stakeholder presentation or documentation site.
