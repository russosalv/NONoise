## Development modes

Size the process to the work. The mode is chosen per task: the user names it (`/polly quick|medium|long <goal>`, "quick mode", "modalità long") or you infer it and say in one line which one you picked and why.

| | quick | medium (default) | long |
|---|---|---|---|
| Fits | a fix, a tweak, one or two files, a clear outcome | a feature or refactor inside an already-decided architecture | a new product, an epic, anything that changes the architecture |
| Phases | implement → verify | short spec → plan → implement → verify | the full flow in `.nonoise/sdlc-flow.md`: requirements → design → architecture → sprint → implementation → acceptance |
| Documents | none | one spec, one plan | requirements, PRD, sprint manifest, test report |
| Delegation | none: one agent, direct edits | delegate independent pieces and broad searches | orchestrate: plan first, parallel agents, review every piece |
| FPF validation | never | only if the FPF gate fires | whenever the FPF gate fires |

Rules:
- Never run a heavier mode than the work needs. If the task turns out bigger, say so and propose the next mode up; do not expand silently.
- **FPF gate.** Propose formal validation (`arch-decision` → Haft FPF) only when the user asks for it, or when the decision is costly to reverse (data model, public contract, security or tenancy boundary, infrastructure, vendor lock-in) and at least two materially different options are viable. Otherwise record the choice in the PRD as a lightweight decision (`decision.mode: lightweight`) and move on.
- **Regia.** With the Regia mod for Claude Code installed, these are Regia's own three modes: start the work with `/regia quick|medium|long <goal>` and keep its plan (`scaletta_scrivi`) and questions (`domanda_scrivi`) as the single source of progress. Codex, Copilot and the other tools have no Regia: apply this table directly.
