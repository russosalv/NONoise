---
name: requirements-ingest
description: Dialogic skill that turns raw business input (PDFs, DOCX, markdown notes, stakeholder emails, call transcripts, meeting summaries) into structured requirement files under `docs/requirements/<domain>/<feature>.md`, following NONoise conventions. USE AS PRE-STEP before `arch-brainstorm` — it converts unstructured stakeholder material into a stable set of functional/business requirements the architect can safely reason about. Also produces cross-references to source material parked in `docs/calls/` or `docs/support/`. Triggers — "ingest these requirements", "turn this document into requirement files", "process this call transcript", "extract requirements from <file>", "requirements-ingest", "break this brief into features". Also triggers without explicit mention when the user hands over raw documents (PDF, DOCX, email text) and asks to "organize them into the project" or "prepare for arch-brainstorm".
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral
---

> **Before running this skill's procedure: ask the user to describe the full scope in one message (who, what, why, constraints, success criteria). Treat the rest of this document as a schema to fill against their answer, not a turn-by-turn questionnaire. Only ask follow-up questions for genuine blockers.**

# requirements-ingest — From raw input to structured requirements

This skill is the **pre-architectural ingestion step** of NONoise. It takes raw, unstructured business material (PDFs, DOCX, markdown notes, email text, stakeholder call transcripts, meeting summaries) and turns it into a clean set of requirement files under `docs/requirements/<domain>/<feature>.md` — each with a stable structure (who / what / why / acceptance criteria / out-of-scope) and explicit cross-references back to the source documents.

It exists to solve a recurring problem: raw stakeholder input is noisy, overlapping, often contradictory, and mixes functional requests with implementation hints. Feeding that directly to `arch-brainstorm` leads to poor PRDs because the architect has to extract and disambiguate requirements on the fly. This skill does that extraction **explicitly and interactively**, so by the time `arch-brainstorm` runs the requirement space is already organized.

## Position in the workflow

```
┌──────────────────┐   ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│ requirements-    │──▶│ arch-       │──▶│ arch-        │──▶│ sprint-manifest  │
│ ingest           │   │ brainstorm  │   │ decision     │   │                  │
│ (THIS SKILL)     │   │             │   │              │   │                  │
│ raw input →      │   │ PRD from    │   │ validate via │   │ promote to       │
│ structured       │   │ requirements│   │ quint-fpf    │   │ sprint manifest  │
│ requirements     │   │             │   │              │   │                  │
└──────────────────┘   └─────────────┘   └──────────────┘   └──────────────────┘
      PRE-STEP              STEP 1            STEP 2              STEP 3
```

The skill is the natural front door for any new engagement where the product team hands the architect a pile of documents. It can also be invoked later, mid-project, to absorb fresh stakeholder input (a new call transcript, a revised brief) without disrupting the existing requirement corpus.

## What this skill does

1. **Collects raw input** — paths to PDF, DOCX, markdown notes, email text, call transcripts, stakeholder summaries. Asks the user interactively if no paths are provided.
2. **Reads the project source of truth** — `docs/architecture/` (for constraints and existing component registry) and `docs/requirements/` (for existing domains/features, to avoid duplicates and respect naming).
3. **Extracts candidate requirements** — walks through each input document and surfaces discrete functional/business asks.
4. **Proposes a domain / feature breakdown** — groups candidates by functional domain and feature; presents the breakdown to the user for confirmation.
5. **Dialogs with the user** to disambiguate, deduplicate, and fill gaps — one question at a time, multiple-choice when possible.
6. **Writes requirement files** under `docs/requirements/<domain>/<feature>.md` with standard frontmatter and sections.
7. **Parks source documents** in a single per-domain bucket `docs/requirements/<domain>/sources/` (one place per domain — everything that fed `<feature>.md` lives right next to it) and cross-references them from each requirement file. Only cross-domain / shared material goes to the top-level `docs/calls/` (multi-domain meetings) or `docs/support/` (shared research, vendor docs, regulatory, legacy analyses).
8. **Suggests the next step** — invoke `arch-brainstorm area <domain-or-feature>` to start the architectural design.

## What this skill does NOT do

- **Does not produce architectural decisions** — no diagrams, no technology choices, no component design. That is `arch-brainstorm`'s job.
- **Does not validate anything formally** — no Quint FPF run, no reliability score. That is `arch-decision`'s job.
- **Does not break work into sprint tasks** — no user stories, no vertical slices, no CL1/CL2 confidence. That is `sprint-manifest`'s job.
- **Does not write code** — it only produces requirement documents.
- **Does not speculate** — if a raw document is ambiguous, the skill asks the user; it does not invent acceptance criteria.
- **Does not edit `docs/architecture/`** — requirements live in `docs/requirements/`, architecture in `docs/architecture/`. Those are separate.

## Working language

The skill follows the project working language:

1. If `nonoise.config.json` at the repo root has a `language` field, use that.
2. Otherwise, infer from the dominant language of the input documents and of existing files under `docs/requirements/`.
3. Fallback: English.

Whatever language is chosen, all frontmatter field **names** stay in English (`title`, `domain`, `feature`, `status`, `created_at`, `source_documents`, …). Only the free-text content follows the project language.

## Possible inputs

| User input | Skill action |
|---|---|
| `requirements-ingest` (no args) | Ask the user for paths to raw documents, one at a time |
| `requirements-ingest <path1> <path2> ...` | Start from those paths |
| "ingest these files: A, B, C" | Treat A, B, C as the input set |
| "process this call transcript from yesterday" | Treat it as a single-source ingestion — park under the target domain's `docs/requirements/<domain>/sources/<YYYY-MM-DD>-<slug>.md` if domain-specific; under top-level `docs/calls/` only if the meeting spans multiple domains |
| "add these new requirements to domain `billing`" | Targeted ingestion: constrain output to `docs/requirements/billing/`; allow creating new features inside it but do not create new domains |

**Before starting real work**, the skill must always:

1. Confirm the **list of input documents** and their **kind** (call transcript / PDF brief / email / DOCX / markdown note / other).
2. Check whether `docs/requirements/` and `docs/architecture/` exist — if either is missing, stop and redirect the user to run `npx create-nonoise` first (the folders are part of the standard scaffold).
3. Decide whether this is a **first-time ingestion** (empty `docs/requirements/`) or an **incremental ingestion** (existing requirements — must respect existing domain/feature names).

---

## Flow — 4 phases

### Phase 1: COLLECT — gather raw input and load project context

**Goal**: have all source documents in hand and know the current state of `docs/requirements/` and `docs/architecture/` before proposing anything.

#### Actions

1. **Gather input paths** — if not provided, ask the user one at a time:

   > What raw documents do you want to ingest? Give me one path per message. Write `done` when finished.

   Accept absolute paths, relative paths (from repo root), and remote URLs (if your tool chain supports fetching). For each path, ask its **kind**:

   > `<path>` — what kind is this? (1) Call transcript / meeting notes, (2) Stakeholder PDF / DOCX brief, (3) Email or chat excerpt, (4) Markdown note, (5) Other

2. **Read each input document** in full. For PDFs and DOCX, use whatever reader the environment provides; for binary formats without a reader, stop and ask the user to pre-convert to text or markdown.

3. **Load project context**:
   - `docs/architecture/01-constraints.md` (if present) — absolute constraints, so requirements never violate them silently.
   - `docs/architecture/04-components.md` (if present) — component registry, to align domain names with existing components when sensible.
   - `docs/requirements/` — full tree. Note every existing `<domain>/` folder and every `<feature>.md` already present.
   - `nonoise.config.json` — working language, project-level preferences.

4. **Summarize the landing zone** to the user in ~100 words before extracting:

   > I read 3 input documents (1 call transcript, 2 PDF briefs). The project already has 2 requirement domains (`billing`, `checkout`) with 5 features total. Architecture constraints include: no long-running cron jobs; all async work must use the existing event bus. Ready to extract candidate requirements from the inputs. Confirm?

#### Phase 1 checkpoint

- [ ] List of input documents confirmed with their kinds
- [ ] Each input read in full
- [ ] Existing `docs/requirements/` tree in memory
- [ ] Architecture constraints in memory
- [ ] Working language decided
- [ ] Landing-zone summary presented

**Ask for confirmation** before moving to phase 2.

---

### Phase 2: EXTRACT — surface candidate requirements

**Goal**: walk each input document and produce a flat list of **candidate requirements** — atomic, deduplicated, traceable back to the source.

#### Extraction heuristics

For each input document:

1. **Scan for functional signals**:
   - Verbs of capability: "must be able to", "should allow", "needs to", "we want", "the user can", "enables".
   - Actor mentions: "the user", "the admin", "the operator", "the system".
   - Trigger phrases: "when X happens", "if Y", "upon Z".
   - Outcome phrases: "so that", "in order to", "to achieve".

2. **Scan for business-rule signals**:
   - Invariants: "always", "never", "only if", "must not".
   - Constraints: "no more than", "at least", "within N seconds".
   - Compliance phrases: "per regulation", "GDPR", "SOC2", any referenced norm.

3. **Scan for UI / UX signals** (these mark candidates that likely benefit from a mockup):
   - Interface nouns: screen, page, form, grid, table, button, dialog, modal, wizard, stepper, tab, dashboard, panel, filter, dropdown, checkbox, radio.
   - Layout verbs: display, render, show, list, paginate, sort, filter, search.

4. **Scan for out-of-scope signals**:
   - Exclusion verbs: "will not", "out of scope", "not in this release", "later", "future".

5. **Scan for open questions** (things the source document itself leaves undecided):
   - "TBD", "to be confirmed", "open question", "TBC", placeholder markers.

For each signal, produce a **candidate row**:

| Field | Content |
|---|---|
| `id` | temporary ID `CR-NNN` (incremental across the ingestion session) |
| `source` | path + section / page / timestamp |
| `who` | actor (if stated) or `?` |
| `what` | the capability, rule, or constraint in 1 sentence |
| `why` | the outcome (if stated) or `?` |
| `signals` | functional / business-rule / UI / out-of-scope / open-question |
| `quote` | the original sentence from the source, verbatim (short) |

#### Deduplication

After the first pass, group semantically-equivalent candidates across documents. When two candidates overlap:

- Merge them into one, keep **all** `source` references
- Use the more specific `what` / `why` as the canonical version
- Flag any disagreement between sources ("Document A says within 5s, document B says within 10s") as an **open point** — do not silently pick one

#### UI-heavy candidates

For each candidate flagged with UI signals, ask the user once at the end of extraction:

> Candidate `CR-NNN` describes an interface: *"<short what>"*. Do you have a mockup, wireframe, or screenshot that should be linked from the requirement? (yes — paste path / no / not yet)

If the user provides a mockup path, store it as an additional `source_documents` entry when the requirement is written.

#### Phase 2 checkpoint

- [ ] Each input scanned for all 5 signal types
- [ ] Candidate list produced with `id`, `source`, `who`, `what`, `why`, `signals`, `quote`
- [ ] Semantic duplicates merged with all sources kept
- [ ] Disagreements between sources flagged as open points
- [ ] UI-heavy candidates asked about mockups

**Show the candidate list to the user** and ask for confirmation / corrections before moving to phase 3. Typical format: a markdown table. If the list is long (> 30 rows), split by source document.

---

### Phase 3: STRUCTURE — propose domain / feature breakdown

**Goal**: turn the flat candidate list into a two-level structure (`<domain>/<feature>`) that matches the project's conventions and existing corpus.

#### Domain selection

A **domain** is a coarse functional area. Typical examples: `billing`, `signup`, `checkout`, `reporting`, `notifications`, `admin-console`. Prefer **existing domains** under `docs/requirements/` over inventing new ones.

For each candidate, propose a domain. If multiple domains plausibly apply, ask the user:

> Candidate `CR-NNN` (*"<short what>"*) could live under:
> 1. `billing` (existing)
> 2. `reporting` (existing)
> 3. `<new-domain-slug>` (new)
>
> Which one?

Never create a new domain silently. Always ask.

#### Feature grouping

A **feature** is a cohesive set of requirements inside a domain. Example inside `billing`: `invoice-generation`, `payment-methods`, `refunds`. Feature files live at `docs/requirements/<domain>/<feature>.md`.

Heuristics:

- Candidates sharing the same actor + same outcome → likely one feature
- Candidates that always appear together in the same section of the source documents → likely one feature
- Candidates that differ only in minor variations → likely acceptance criteria of one feature, not separate features

Propose the feature breakdown as a table:

| Domain | Feature | Candidate IDs | New or existing? |
|---|---|---|---|
| billing | invoice-generation | CR-001, CR-003, CR-007 | new |
| billing | payment-methods | CR-002, CR-004 | existing (adds to file) |
| signup | email-verification | CR-005, CR-006 | new |
| signup | social-login | CR-008 | new |

Ask the user to confirm the breakdown before writing anything.

#### Naming conventions

- **Domain slug**: kebab-case, lowercase, singular or functional name (`billing`, not `billings`; `reporting`, not `reports-module`). Stable over time.
- **Feature slug**: kebab-case, lowercase, describes the capability (`invoice-generation`, not `generate-invoices` or `invoices`). One feature per file.

#### Phase 3 checkpoint

- [ ] Every candidate mapped to a domain
- [ ] Every candidate mapped to a feature within that domain
- [ ] New domains / features explicitly confirmed by the user
- [ ] Existing features (when adding to them) identified
- [ ] Breakdown table confirmed

**Ask for explicit confirmation** before starting to write files.

---

### Phase 4: WRITE — produce requirement files and park sources

**Goal**: for each `(domain, feature)` in the confirmed breakdown, write or update the requirement file; for each source document, park it under the target domain's `sources/` subfolder and cross-reference it.

#### Source document parking — one bucket per domain

**Default destination for every source**: `docs/requirements/<domain>/sources/<filename>` (free-form inside, no sub-categorization). The rationale: everything that fed a given feature file lives right next to it — no hunting across multiple top-level folders.

Date-prefix the filename when the document has a chronology (calls, emails, versioned briefs): `<YYYY-MM-DD>-<short-slug>.<ext>`. Example filenames inside `docs/requirements/billing/sources/`:

- `2026-04-18-business-kickoff.md` — call transcript
- `vendor-payment-api-spec.pdf` — stakeholder brief (no date needed; version is in the filename if relevant)
- `2026-04-10-email-thread-invoice-rules.md` — email thread
- `finance-team-notes.md` — note the user wrote
- `mockup-invoice-list-v2.png` — UI mockup

Sub-categorization inside `sources/` is **not required**. If a domain accumulates many files of a kind, the user can organize freely (`sources/calls/`, `sources/emails/`, `sources/mockups/`) — the skill does not impose the structure.

**Exceptions — when to use top-level `docs/calls/` or `docs/support/` instead**:

- **Multi-domain meeting** — a call that genuinely spans 2+ domains (company-wide kick-off, quarterly planning, cross-team review). Park at `docs/calls/<YYYY-MM-DD>-<slug>.<ext>`, and every affected feature file adds an entry to `source_documents` referencing that path.
- **Cross-domain shared material** — a vendor spec used across many features, a regulatory standard (GDPR, PCI-DSS, etc.), a legacy analysis that informs multiple domains. Park under the existing `docs/support/<legacy|research|vendor|regulatory>/<slug>.<ext>` buckets (these are declared in `docs/support/README.md`).

**Decision rule**: if in doubt, prefer per-domain (`sources/`). Promote to top-level only when a second domain actually cites the same file.

Before moving files, **ask the user** whether to copy or move. Default: copy (preserve the original path the user referenced). Never silently delete originals.

#### Requirement file — mandatory structure

For each `(domain, feature)`:

```markdown
---
title: "<Readable feature title>"
domain: <domain-slug>
feature: <feature-slug>
status: draft
source_documents:
  - path: docs/requirements/user-signup/sources/2026-04-18-business-user-signup.md
    kind: call-transcript
    sections: ["3.2 OTP flow"]
  - path: docs/requirements/user-signup/sources/vendor-payment-api-spec.pdf
    kind: brief
    sections: ["pp. 12-14"]
created_at: YYYY-MM-DD
authors: [<name-or-stakeholder>]
---

# <Readable feature title>

> **Domain**: `<domain-slug>` • **Feature**: `<feature-slug>`
> **Status**: `draft` — ingested from raw input on YYYY-MM-DD
> **Source documents**: see frontmatter `source_documents`

## Who needs it

<1-3 sentences naming the actor / persona / stakeholder and the context in which they operate.>

## What they need to do

<Prose description of the capability, in the project's working language. Use short paragraphs, not implementation details. 1-3 paragraphs.>

## Why — the outcome

<The business / user outcome this enables. Tie it back to the source document when possible ("per the vendor brief, this reduces churn by…").>

## Acceptance criteria

Observable, testable criteria. Use Given-When-Then when it clarifies; use numbered bullets when it does not. Each criterion must be falsifiable.

1. **Given** <precondition>, **when** <action>, **then** <observable outcome>.
2. ...

## Business rules

Invariants and constraints that always hold, independent of a specific scenario.

- <rule 1>
- <rule 2>

## Out-of-scope

Explicit exclusions — things a reader might reasonably assume are covered but are not, in this requirement.

- <excluded item> — <short reason / deferred to where>

## Open points

TBDs, disagreements between sources, missing information. Every open point must be resolved before `arch-brainstorm` runs.

- [ ] <open point 1> — <source of uncertainty>
- [ ] <open point 2> — <source of uncertainty>

## Source quotes

Verbatim quotes from the source documents that ground this requirement. Useful when the team later wants to check whether the ingestion preserved intent.

> "<quote 1>" — source: `sources/2026-04-18-business-user-signup.md` §3.2
>
> "<quote 2>" — source: `sources/vendor-payment-api-spec.pdf` p. 13
```

#### Updating an existing requirement file

If the feature file already exists (incremental ingestion):

1. Read it first.
2. Merge new candidates into the relevant sections (Acceptance criteria, Business rules, Out-of-scope, Open points).
3. Append to `source_documents` in the frontmatter — do not overwrite.
4. Append new quotes to `## Source quotes` — do not overwrite.
5. Keep a short change-log note at the bottom under `## Ingestion history` (append-only):

   ```markdown
   ## Ingestion history

   - 2026-04-18 — added CR-005, CR-006 from `sources/2026-04-18-business-user-signup.md`
   - 2026-03-02 — initial ingestion from `sources/vendor-payment-api-spec.pdf`
   ```

#### Cross-references

After all files are written, update (or create) `docs/requirements/<domain>/README.md` with a short index of features in the domain:

```markdown
# Domain — `<domain-slug>`

<1-2 paragraphs: what this functional domain covers, stakeholders, scope.>

## Features

| Feature | Status | Description |
|---|---|---|
| [invoice-generation](./invoice-generation.md) | draft | <1-sentence description> |
| [payment-methods](./payment-methods.md) | draft | <1-sentence description> |

## Source documents referenced

Per-domain (in `./sources/`):
- [sources/2026-04-18-business-kickoff.md](./sources/2026-04-18-business-kickoff.md)
- [sources/vendor-payment-api-spec.pdf](./sources/vendor-payment-api-spec.pdf)

Cross-domain (top-level, only when shared with other domains):
- [docs/calls/2026-04-10-quarterly-planning.md](../../calls/2026-04-10-quarterly-planning.md)
- [docs/support/regulatory/gdpr-art-7.md](../../support/regulatory/gdpr-art-7.md)
```

#### Self-review before saving

For each requirement file, mentally re-read and verify:

- **Traceability**: every acceptance criterion traces back to at least one source quote or open point.
- **Testability**: every acceptance criterion is observable and falsifiable.
- **Scope**: the feature file is focused on one cohesive capability, not a grab-bag.
- **Placeholders**: every `?` from phase 2 is either resolved or listed as an open point.
- **Out-of-scope**: at least one explicit exclusion is stated (if nothing is out of scope, that itself is worth noting).
- **No implementation**: no tech stack, no class names, no endpoints. If implementation leaked in from a source document, either move it to an open point ("the source suggests X — confirm during arch-brainstorm") or drop it.

Fix inline before saving.

#### Phase 4 checkpoint

- [ ] Source documents parked (or existing paths confirmed)
- [ ] Each `(domain, feature)` written with mandatory sections
- [ ] Existing files merged rather than overwritten
- [ ] `docs/requirements/<domain>/README.md` created or updated
- [ ] Every file passes self-review

---

## Phase 5: HANDOFF — close the loop

**Goal**: summarize, hand over to the architect, and suggest the next step.

#### Actions

1. **Summarize** to the user what was produced — paths, count of new features, count of updated features, list of open points that still block `arch-brainstorm`.

2. **Request review** explicitly:

   > Review the requirement files before proceeding. If you want changes, tell me. Otherwise the next step is **`arch-brainstorm area <domain-or-feature>`** for any area you want to design.

3. **User gate**: do not declare the skill complete until the user gives the green light or requests changes.

4. **If the user requests changes**: return to phase 2 (re-extract), phase 3 (re-structure), or phase 4 (re-write) depending on the nature of the change.

5. **If the user approves**, explicitly suggest the next skill per area:

   > Requirements are in place. To proceed to architectural design, invoke:
   >
   > **`arch-brainstorm area <domain>`** (pick one domain at a time)
   >
   > `arch-brainstorm` will read the requirement files under `docs/requirements/<domain>/` as part of its DISCOVER phase and use them to seed the architectural dialog.

#### Phase 5 checkpoint

- [ ] User received the summary
- [ ] User approved (or requested changes have been applied)
- [ ] Next step explicitly suggested

---

## Naming and frontmatter

See [`references/requirement-file-template.md`](./references/requirement-file-template.md) for the full template. Summary:

- **Domain folder**: `docs/requirements/<domain-slug>/`
- **Feature file**: `docs/requirements/<domain-slug>/<feature-slug>.md`
- **Domain index** (optional but recommended): `docs/requirements/<domain-slug>/README.md`

Mandatory requirement-file frontmatter:

```yaml
---
title: "<Readable feature title>"
domain: <domain-slug>
feature: <feature-slug>
status: draft | reviewed | superseded
source_documents:
  - path: <relative-or-absolute-path>
    kind: call-transcript | brief | email | note | mockup | other
    sections: ["<optional section references>"]
created_at: YYYY-MM-DD
authors: [<name-or-stakeholder>]
---
```

Lifecycle:

- `draft` — just ingested, not yet reviewed by the architect or a senior stakeholder
- `reviewed` — confirmed correct by the team; ready to feed `arch-brainstorm`
- `superseded` — replaced by another feature file (state `superseded_by` field inline)

---

## Resuming mid-flow

If the user has already started a previous ingestion session (candidates produced, not all written):

1. Ask whether to **resume** or **start over**.
2. If resuming, re-read existing `docs/requirements/` tree, parse any partial files, and continue from the last confirmed phase checkpoint.

The skill is stateless between invocations — state lives entirely in the files already produced on disk.

---

## Anti-patterns

1. **Writing requirement files without confirming the breakdown** — phase 3 confirmation is mandatory; skipping it produces files with bad domain/feature slugs that then pollute the corpus.
2. **Silently creating new domains** — always ask. A proliferation of near-duplicate domains (`billing`, `invoicing`, `payments`) is a hard mess to clean up later.
3. **Inventing acceptance criteria from thin air** — if the source document does not support a criterion, mark it as an open point. Never hallucinate to produce a "complete-looking" file.
4. **Dropping disagreements between sources** — if document A says X and document B says Y, both must appear as an open point. Picking one silently is the worst failure mode of ingestion.
5. **Leaking implementation into requirements** — no endpoints, no class names, no tech stack choices. Those belong in PRDs, not here.
6. **Overwriting existing files** — always merge when the feature already exists. Use ingestion history to preserve audit trail.
7. **Skipping the handoff** — until the user approves, the skill is not complete.

---

## When NOT to use this skill

- **Architectural brainstorming** → `arch-brainstorm`
- **PRD validation** → `arch-decision`
- **Sprint promotion** → `sprint-manifest`
- **Bug reports / incidents** → do not file as requirements; use the project's issue tracker
- **Pure legacy analysis** (no forward-looking requirements) → park directly under `docs/support/legacy/` without going through ingestion
- **Meeting notes you just want to archive** — if there is nothing actionable, park under `docs/calls/` (cross-domain) or the relevant `docs/requirements/<domain>/sources/` directly without creating requirement files

---

## References

- [`references/requirement-file-template.md`](./references/requirement-file-template.md) — Full template for a requirement file
- [`references/ingestion-heuristics.md`](./references/ingestion-heuristics.md) — Signal patterns, deduplication rules, domain-naming guidance
- Sibling skill `arch-brainstorm` — the natural next step after ingestion
- Sibling skill `arch-decision` — validation step after `arch-brainstorm`
- Sibling skill `sprint-manifest` — promotion to sprint
- Project folder: `docs/requirements/README.md` — ships with the NONoise scaffold, describes the folder purpose
