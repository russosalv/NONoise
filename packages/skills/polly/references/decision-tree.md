# Polly — decision tree in full

This file expands the decision tree sketched in `SKILL.md` into concrete
prompts. Read when Polly needs the exact phrasing for a step, or when a step
needs adaptation.

## Step 0 — Voice input hint

See `voice-tools.md`. Fire once per session, before any other prompt.

## Step 1 — Greenfield or brownfield

Exact prompt (EN):
> Is this a **greenfield** project (something new, starting from scratch) or
> **brownfield** (an existing codebase we need to analyze or extend)?

Adaptation (IT):
> Questo è un progetto **greenfield** (nuovo, da zero) o **brownfield**
> (codice esistente da analizzare o estendere)?

Wait for an explicit answer. Do not infer from directory contents — an empty
`docs/` tree is produced by both paths.

## Greenfield — Step 2.1 — Stack

Prompt:
> What's the stack you're building? Short form is fine — "Node + React",
> "Python FastAPI", "Flutter app", "data pipeline in dbt", "CLI in Rust".
> If you're not sure yet, say "not decided" and we'll figure it out together
> during arch-brainstorm.

Record the answer in your working memory — later steps (`arch-brainstorm`,
`sprint-manifest`, `atr`) will use it. Don't write it to disk yet.

## Greenfield — Step 2.2 — Existing source material

Prompt:
> Do you already have any material about this project — meeting notes,
> email threads, briefs, regulatory documents, sketches, a PRD draft? Even
> rough stuff counts.

If **yes**:
1. Ask where the files are.
2. Engage `requirements-ingest` to organize them under
   `docs/requirements/<domain>/sources/`. `requirements-ingest` will ask its
   own questions about domain and ownership.
3. When it returns, note the domains created and carry them into Step 2.3.

If **no**: skip, move to Step 2.3.

## Greenfield — Step 2.3 — Requirements elicitation

Prompt:
> Let's capture what we know about the project. I'll engage
> `bmad-agent-analyst` — it runs a structured elicitation, asks questions
> like "who are the users?", "what's the core problem?", "what counts as
> success?". Takes 10-20 minutes. OK to start?

If the user wants a lighter touch, substitute `bmad-advanced-elicitation`
(single-round, no agent persona).

Output lives in `docs/requirements/<domain>/`.

## Greenfield — Step 2.4 — PRD drafting

Prompt:
> Now the PRD. I'll engage `superpowers:brainstorming` — it drafts a first
> PRD version, we iterate together. Then it'll land in `docs/prd/`.

**Fallback** if `superpowers:brainstorming` is not installed: see
`fallback-messages.md` § brainstorming. In short: draft the PRD
conversationally following `docs/prd/README.md` conventions.

## Greenfield — Step 2.5 — Architecture options

Prompt:
> With the PRD in place, let's explore architecture options. I'll engage
> `arch-brainstorm` — it reads the PRD, the requirements, and
> `docs/architecture/01-constraints.md`, then produces a decision document
> with 2-3 alternative designs scored against constraints.

Output lands in `docs/prd/<feature-slug>/arch-brainstorm.md` (per the skill's
own convention).

## Greenfield — Step 2.6 — Architecture decision

Prompt:
> Time to pick one architecture and commit to it. I'll engage
> `arch-decision` — it takes the brainstorm doc, runs Quint FPF validation
> (`quint-fpf` as a sub-skill), and produces an ADR in
> `docs/architecture/adr/NNNN-<slug>.md`.

Output is a signed ADR plus a "Impact on docs/architecture/" checklist the
architect applies manually.

## Greenfield — Step 2.7 — Sprint breakdown

Prompt:
> The architecture is set. Time to break it into a sprint. I'll engage
> `sprint-manifest` — it produces **one** aggregated manifest at
> `docs/sprints/Sprint-N/sprint-manifest.md` listing all the vertical slices
> we'll ship in this sprint.

Ask for the sprint number if the user hasn't specified.

## Greenfield — Step 2.8 — Implementation loop

Prompt:
> For each item in the sprint manifest, I'll engage `atr` — it writes the
> acceptance artifact, guides you through the TDD cycle, and lands test +
> implementation in the right places. Ready to start with the first item?

Stay in the loop: after each `atr` pass, return to Polly and ask "next
item?". Polly is the conductor across items.

## Brownfield — Step 3.1 — Code path

Prompt:
> Where's the code? Absolute path or relative to the scaffold root.

If the code is inside the scaffold (same repo), check that `.git` exists so
`graphify` can scan. If it's in a sibling repo, note the path.

## Brownfield — Step 3.2 — Graphify setup

Prompt:
> I'll engage `graphify-setup` first — it verifies Python is installed and
> `graphify` is on PATH. Then we'll run `graphify .` in your code path to
> index the repo. That's the raw material for the reverse-engineering pass.

If `graphify-setup` reports Python missing, show the install instructions
and offer the user the chance to install manually, then retry.

## Brownfield — Step 3.3 — Reverse engineering

Prompt:
> Now I'll engage `reverse-engineering` — it reads the graphify index and
> produces a subject-driven understanding document under
> `docs/support/reverse/<subject-slug>/`. The skill is interactive: it will
> pause and ask before writing, and will explore with you before committing
> anything to disk.

`reverse-engineering` has a strong "don't write without permission" rule —
trust it, don't override.

## Brownfield — Step 3.4 — Existing source material

Identical to greenfield Step 2.2. If there are emails / calls / briefs about
the legacy system, route them through `requirements-ingest` before moving
to arch-brainstorm.

## Brownfield — Step 3.5 onward

From arch-brainstorm onward, brownfield == greenfield. The same skills, the
same prompts. The difference is that `arch-brainstorm` in brownfield mode
also reads `docs/support/reverse/` — the skill figures this out on its own.

## Orthogonal entry points

See `SKILL.md` § "Orthogonal entry points" for the routing table. Each entry
is a one-shot handoff — engage the specialist, then return to the user with
the result.
