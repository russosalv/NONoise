# Qwen/Qoder compatibility design

## Intent

NONoise presents Qwen Code as one of the external executors provided by the
Claude Regia plugin. Qoder exposes the same compatible headless workflow under
a different shell command on some installations. A project that has only
`qoder`, or has an incompatible `qwen` alongside a compatible `qoder`, must get
the same Regia executor without a second configuration surface.

The runtime implementation belongs in `russosalv/claude-regia`; NONoise owns
the installation and user-facing documentation that describes it.

## Goals

- Keep the existing executor identity, tools, configuration keys, storage and
  swarm value as `qwen`.
- Run jobs through either `qwen` or `qoder`, selecting an actually compatible
  binary rather than relying only on command presence.
- Cover fresh jobs, resumed jobs, live-process discovery, stall detection,
  `/regia doctor`, executor availability and Qwen companion plugin installation.
- Describe the executor consistently as Qwen/Qoder in Regia and NONoise.
- Preserve all current Qwen behavior when a compatible `qwen` is installed.

## Non-goals and anti-goals

- Do not add `qoder` as a new NONoise AI-tool choice or a fourth Regia external
  executor.
- Do not add `qoder_avvia`, `qoder_riprendi`, a second config key, a second job
  directory or a second row/count in the Regia pane.
- Do not silently choose an installed command that lacks the flags Regia needs.
- Do not modify or absorb unrelated local work, including NONoise's untracked
  `packages/skills/vendor/graphify/` directory or the diverged historical
  `../claude-regia` checkout.

## Constraints

- Regia's current shell contract needs headless print mode, permission mode,
  strict MCP isolation, explicit session IDs, named jobs, a working directory,
  model selection and optional reasoning effort.
- On the development machine, `qwen 0.28.0` and `qoder 1.1.93` are both present,
  but only Qoder exposes Regia's current option contract. Presence or `--version`
  alone is therefore insufficient.
- Qoder's dispatcher ultimately runs a process named `qodercli`, and its
  session activity is stored below `~/.qoder/projects`; Qwen uses `qwen` and
  `~/.qwen/projects`.
- Existing work and logs remain under `~/.claude/regia/qwen`, so resume and
  history stay compatible across a switch between the two commands.
- A session must be resumed by the same CLI family that created it because
  Qwen and Qoder persist session payloads under different roots.

## Approaches considered

### Selected: transparent alias with capability detection

Keep `qwen` as the internal executor and select the first compatible command,
preferring `qwen` and falling back to `qoder`. Compatibility is established
from the command's help output and the flags Regia actually passes. The launcher
and TypeScript availability check use the same contract. Process parsing accepts
`qwen`, `qoder` and `qodercli`, while the UI reports the concrete command in
diagnostics and otherwise presents the executor as Qwen/Qoder.

This preserves existing configuration and makes mixed installations safe.

### Rejected: command-presence fallback

Try `qwen` whenever it exists and use `qoder` only when it does not. This is
smaller, but selects the incompatible `qwen` on the development machine and
fails only after a job has been launched.

### Rejected: separate Qoder executor

Add new tools, configuration and UI for Qoder. This duplicates the Qwen path,
creates migration questions and conflicts with the requested same-executor
semantics.

## Regia changes

1. Add a small, testable resolver for the Qwen-compatible CLI. It probes
   `qwen`, then `qoder`, accepts only the required option contract, returns the
   chosen command and version, and produces a useful unavailable reason.
2. Make executor availability, `/regia doctor` and dependency/plugin checks
   use that resolver. The Qwen companion plugin is eligible when either
   compatible command is available.
3. Make `script/qwen-esegui` perform the same resolution before launch. A new
   job records the chosen command beside its other metadata. A resumed job
   reuses that exact compatible command; for a legacy job without metadata,
   infer the family from the matching session file when possible and otherwise
   use the current compatible resolver. If the recorded family is unavailable
   or incompatible, fail clearly instead of attempting the other family.
4. Extend process parsing to recognise the Qwen-family command basenames
   `qwen`, `qoder` and `qodercli`, including processes wrapped by `timeout`.
   They still produce executor `qwen` and use the existing job name and folder
   metadata.
5. During stall checks, search the session ID under both
   `~/.qwen/projects` and `~/.qoder/projects`; use the newest matching session
   file as a sign of life.
6. Update Regia's README, command descriptions and diagnostic wording to say
   Qwen/Qoder while leaving the stable tool and config names unchanged.

## NONoise changes

NONoise continues to install `regia@claude-regia`; it does not launch the
executor itself. Update its Regia documentation, install documentation, skills
catalog, top-level README and generated development-modes wording so users know
that the `qwen` executor accepts either compatible CLI. Source comments that
claim Regia checks only `qwen` are corrected. Generated snapshots are refreshed
only for deliberate documentation/template output changes.

## Tests and verification

Regia tests are written first and cover:

- only compatible `qwen` installed;
- only compatible `qoder` installed;
- incompatible `qwen` plus compatible `qoder` selects Qoder;
- neither command compatible reports Qwen/Qoder unavailable;
- launcher arguments for a fresh and resumed Qoder job;
- `ps` parsing for `qoder` and `qodercli` without counting interactive or
  unrelated shell commands;
- plugin eligibility and doctor/executor output;
- stall activity found under `~/.qoder/projects`.

Then run Regia's TypeScript/plugin tests and both launcher shell suites. In
NONoise, build the bundled assets, run focused native-vendor/snapshot tests,
review snapshot diffs, and finally run the complete `create-nonoise` Vitest
suite and repository typechecks relevant to changed packages.

## Delivery boundaries

Implementation will use a clean checkout/worktree based on the latest
`russosalv/claude-regia` `origin/main`, not the local diverged historical clone.
No push, release, version bump or commit is part of this change unless requested
separately.
