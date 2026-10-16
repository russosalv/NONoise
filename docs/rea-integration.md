# REA in NONoise

REA is optional shipped-artifact analysis. `--with-rea`, `brownfield`, and `full`
activate project registration and the vendored `reverse-engineer-anything`
skill. The lightweight native `rea-setup` skill is available in every profile;
merely installing that instruction file does not install/start the REA server.

## Project registration

`REA_VERSION` in `packages/create-nonoise/src/rea.ts` pins `rea-agents@6.5.0`.
Claude Code and Copilot CLI share project `.mcp.json`:

```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "rea-agents@6.5.0", "mcp"],
      "env": { "REA_MCP_INPUT_SCHEMA_PROFILE": "compact" }
    }
  }
}
```

Codex uses project `.codex/config.toml`:

```toml
[mcp_servers.rea]
command = "npx"
args = ["-y", "rea-agents@6.5.0", "mcp"]
startup_timeout_sec = 120

[mcp_servers.rea.env]
REA_MCP_INPUT_SCHEMA_PROFILE = "compact"
```

Registration preserves unrelated servers/settings. Existing conflicting REA
entries are reported and retained for a scoped manual resolution. TOML is fully
parsed before and after an append; malformed documents and sealed inline
server tables are preserved. Equivalent quoted/user formatting is accepted
without rewriting when the pinned launcher, compact schemas and timeout match. Repeating an
unchanged registration preserves bytes and timestamps. Symlinked destination
files, parent directories and project aliases are refused. No REA registration
is written to global client settings, and NONoise never invokes `rea setup`.
The MCP host invokes npx when it starts the server; npm can download the package
to its cache at that time. Registration itself does not execute or download REA.

The vendor skill and references use NONoise's SHA-256 ownership manifest:
pristine files can be upgraded; edited/user-owned files remain unchanged.
The complete upstream skill (entrypoint plus six references) is stored under
`packages/skills/vendor/rea/reverse-engineer-anything/`. Provenance, MIT license
and upstream disclaimer are copied into `.nonoise/rea/`. Upstream commit:
`f9ccacca2cbf7c7f1c338cddd19160fc0a778074`. Connection/recovery instructions
are adapted to project-only NONoise activation, and npm examples are pinned;
analysis recipes and evidence guidance are retained.

## Activation during an investigation

For source-less .NET DLL/EXE, Electron/app.asar, HAR/SAZ, SQLite, APK, native
binaries, firmware, or questions about an app/site without source, the analysis
skill checks project REA registration before requiring Graphify. With REA
connected, it uses the server directly within the authorized task scope.

If registration is missing, `rea-setup` gives one sentence explaining why REA
helps and requests one confirmation covering installation and authority to
analyze the target (owned software or a customer's authorized software).
Existing explicit consent covering both scopes is reused. Without consent,
nothing is installed. After consent it runs:

```sh
create-nonoise --upgrade . --with-rea
```

The agent then asks the user to restart/reconnect and approve the project server
if the client requires it. A configured but disconnected server needs connection
repair, not another installation. Polly only recommends this handoff; it does
not install while advising. Complete source repositories retain ordinary
repository/Graphify analysis. REA Evidence feeds the incremental dossier without
pretending binaries were source-indexed or bypassing its explicit save trigger.

The upstream disclaimer distinguishes artifact inspection from execution,
interception, device changes and third-party interaction. Target ownership is
not blanket authorization for all operations. The skill preserves those scope
boundaries without adding another routine activation prompt.

## Doctor and validation

`create-nonoise doctor .` reports project registration, pinned/observed version,
missing vendored skill, unsafe paths, and runtime compatibility. REA requires
Node >=22.19; upstream's exact supported ranges are
`^22.19.0 || ^24.11.0 || >=26.0.0`. It advertises 172 tools. Compact input schemas
reduce their context cost but do not make a large tool catalog free. Registration
checks do not prove an MCP connection or the availability of optional engines.

On 2026-10-16, `npx -y rea-agents@6.5.0 --help` exited 0 with Node `v22.23.3`,
printing `rea@6.5.0` and the command catalog. The smoke check ran from `/tmp`
with a disposable home and npm cache under `/tmp/nonoise-rea-proof-*`, so npm
acquisition did not modify `/home/lab`. No upstream setup command ran and no
analysis target was executed. The npm warning concerned deprecated
`prebuild-install@7.1.3`; it did not prevent the command from succeeding.

Unit coverage includes all three hosts, pinning/compact schemas, timeout,
unrelated-entry preservation, repeatability, conflicting/malformed JSON and TOML,
quoted/dotted TOML collisions, symlinks, managed vendor edits, doctor findings,
and skill activation/routing contracts. The contracts first failed against
absent/previous instructions and then passed after the skill changes. Native
frontmatter is checked with the repository's strict YAML tests; the optional
Python skill validator could not run because PyYAML is absent.

An independent scenario review confirmed combined consent for customer binaries,
direct use when connected, reconnection when disconnected, no CLI-download
workaround after refusal, and Polly remaining advisor-only.
