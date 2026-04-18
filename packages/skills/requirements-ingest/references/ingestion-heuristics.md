# Ingestion heuristics

Practical reference for phase 2 (EXTRACT) and phase 3 (STRUCTURE) of `requirements-ingest`. These are the patterns the skill scans for when walking raw documents, and the rules it uses to group candidates into a clean domain/feature structure.

## Signal taxonomy

The skill classifies each extracted candidate by **signal type**. A single sentence can carry multiple signals.

### 1. Functional signals (who does what)

Marks a concrete capability the product must offer.

**Verbs of capability**:

- `must be able to`, `should allow`, `needs to`, `has to`, `is required to`
- `can`, `may`, `shall`, `will`
- `we want`, `we need`, `it would be useful if`
- `the user can`, `enables <actor> to`, `lets <actor>`

**Actor mentions**:

- `the user`, `the admin`, `the operator`, `the reviewer`, `the stakeholder`
- `the customer`, `the employee`, `the visitor`, `the guest`
- `the system`, `the service` (when "the system" is the actor performing something, not the subject being acted on)

**Trigger phrases**:

- `when <event>`, `upon <event>`, `as soon as <event>`
- `if <condition>`, `whenever <event>`
- `on <action>`, `after <action>`, `before <action>`

**Outcome phrases**:

- `so that <outcome>`, `in order to <outcome>`, `to <outcome>`
- `with the goal of`, `which lets us`, `resulting in`

**Canonical template**: `<actor> <verb> <object> <trigger> <outcome>` →
`The billing operator triggers monthly invoice generation on day 1 so that finance approval is ready within 24h.`

### 2. Business-rule signals (what is always true)

Marks an invariant the domain imposes, independent of any specific flow.

**Invariant verbs**:

- `always`, `never`, `must not`, `may not`
- `at all times`, `under no circumstances`, `in every case`
- `for every <entity>`, `no <entity> may`

**Constraint phrases**:

- `no more than N`, `at most N`, `up to N`
- `at least N`, `no fewer than N`
- `within N <unit>`, `before <deadline>`, `after <deadline>`
- `exactly one`, `exactly N`, `unique per <scope>`

**Compliance phrases**:

- `per <regulation>`, `as required by <law>`, `in accordance with <norm>`
- `GDPR`, `SOC2`, `HIPAA`, `PCI-DSS`, `ISO 27001`, or any local regulation
- `audit trail required`, `retention N years`, `right to erasure`

### 3. UI / UX signals (likely benefits from a mockup)

Marks a candidate whose precise shape depends on an interface design.

**Interface nouns**:

- Layouts: `screen`, `page`, `view`, `panel`, `dashboard`, `tab`
- Components: `form`, `grid`, `table`, `list`, `card`, `tile`
- Controls: `button`, `link`, `dropdown`, `select`, `checkbox`, `radio`, `switch`, `toggle`, `slider`
- Containers: `dialog`, `modal`, `sidebar`, `drawer`, `popover`, `tooltip`, `wizard`, `stepper`

**Layout verbs**:

- `display`, `show`, `render`, `list`, `paginate`, `sort`, `filter`, `search`
- `highlight`, `group`, `collapse`, `expand`

**Data-surface verbs**:

- `export`, `download`, `print`, `share`, `copy`
- `upload`, `import`, `attach`

When this signal is present, the skill asks at end of phase 2 whether a mockup exists for the candidate.

### 4. Out-of-scope signals

Marks an explicit exclusion — things the source document itself declares not in scope.

**Exclusion verbs**:

- `will not`, `does not`, `shall not`, `is not`
- `out of scope`, `not in scope`, `outside this release`, `not in this phase`
- `later`, `future`, `next phase`, `v2`, `deferred`

**Negation trigger**:

- `we are not building`, `we are not supporting`, `no <feature>`, `without <feature>`
- `<feature> is deferred to <phase>`, `<feature> will be handled separately`

### 5. Open-question signals

Marks a point the source document itself leaves undecided.

**Placeholder markers**:

- `TBD`, `TBC`, `to be decided`, `to be confirmed`, `to be discussed`
- `open question`, `still deciding`, `still thinking`
- `?`, `[?]`, `???` (contextual — check that it is a genuine placeholder, not punctuation)

**Doubt verbs**:

- `maybe`, `perhaps`, `possibly`, `likely`
- `we are not sure`, `unclear`, `depends on <X>`

---

## Extraction pass — operational procedure

For each input document, the skill runs this procedure:

1. **Structure pass**: read the document top-to-bottom, noting headings, sections, tables, and any explicit requirements section. Keep a position marker for every candidate (section number, page, timestamp).

2. **Signal pass**: scan sentence-by-sentence for the 5 signal types. When a signal fires, extract the full sentence as the candidate's `quote` field.

3. **Normalization pass**: for each candidate, distill the signal into the canonical 1-sentence `what` ("<actor> <verb> <object>"), fill `who` and `why` if stated, and tag the `signals` list.

4. **ID assignment**: give each candidate an incremental `CR-NNN` ID, stable for the session.

5. **Deduplication pass**: across the full candidate list (all sources pooled), group semantically-equivalent candidates. Two candidates are equivalent if:
   - Same actor AND same capability, even if wording differs
   - Same business rule, even if phrased differently
   - Same out-of-scope exclusion, even if phrased differently

   Merging rule:
   - Keep the clearer `what` / `why`
   - Union `source` references (no loss of traceability)
   - Flag any substantive difference as an **open point** attached to the merged candidate

6. **UI flagging**: candidates with UI signals are flagged for the end-of-phase mockup question.

7. **Open-question pass**: every source `TBD` or placeholder becomes a candidate with signal `open-question` and no `who/what/why` — those are exactly what the skill needs the user to resolve.

---

## Domain and feature grouping

### Domain rules

A **domain** is a coarse functional area. The goal: **few, stable domains**. A proliferation of near-duplicate domains is the worst outcome of ingestion.

**Prefer existing domains**. Always check the tree under `docs/requirements/` first. If an incoming candidate fits an existing domain even loosely, use it.

**Examples of good domains**:

- `billing`, `signup`, `checkout`, `reporting`
- `notifications`, `admin-console`, `search`, `profile`
- `integrations` (for outbound / 3rd-party connectors when they cluster)

**Anti-examples**:

- `billing-system` — the `-system` suffix adds nothing
- `invoicing` when `billing` already exists — merge into `billing`
- `user-feature` — too generic
- `new-things-2026` — not a functional domain, just a time box

**Rule of thumb**: if you can imagine ≥ 3 distinct features living under the domain, it's a good domain. If not, it is probably one feature inside a larger domain.

### Feature rules

A **feature** is a cohesive set of requirements inside a domain. One file per feature.

**Grouping heuristics**:

- Candidates sharing **same actor + same outcome** → likely one feature.
- Candidates from the **same section of the source document** → often one feature (sources tend to cluster related asks).
- Candidates that are **variations of one capability** (different inputs, different cases) → one feature with multiple acceptance criteria, not multiple features.
- Candidates with **different actors but shared data / workflow** → could be one feature with multiple personas, or two features that reference each other. Lean toward separate features when the personas have different primary outcomes.

**Good feature slugs**: `invoice-generation`, `email-verification`, `password-reset`, `export-to-csv`, `bulk-approval`, `order-tracking`

**Anti-examples**:

- `billing-invoice-generation` — redundant (the domain is already `billing`)
- `generate-invoices` — verb-first; prefer noun-first (`invoice-generation`)
- `invoices` — too broad; every invoice-related ask would collapse into it
- `feature-1` — meaningless

**When in doubt, ask**. Phase 3 always presents the proposed breakdown for user confirmation.

---

## Conflict resolution rules

During merging and structuring, conflicts will appear. The skill never resolves them silently. Canonical moves:

| Conflict type | Resolution |
|---|---|
| Two sources state different quantitative thresholds | Keep both quotes, flag open point "source A says X, source B says Y — confirm" |
| Two sources state different actors | Keep both, flag open point "primary actor unclear — confirm" |
| One source says in scope, another says out of scope | Default to out-of-scope in the file, flag open point "source A includes this, source B excludes it — confirm intent" |
| Source leaks implementation ("use Redis", "POST /foo") | Park as open point ("source suggests <mechanism> — consider during arch-brainstorm"), do not include in acceptance criteria |
| Source uses conditional language ("maybe", "probably") | Keep as candidate with `open-question` signal; do not treat as firm requirement |

---

## Source-document kinds and parking rules

**Default destination for every kind**: `docs/requirements/<domain>/sources/<filename>`. Filename conventions below describe only the naming pattern — not separate destinations.

### Call transcripts / meeting notes

- Filename: `<YYYY-MM-DD>-<short-slug>.<ext>`
- Date = date of the meeting (from document or user)
- Slug = feature or focus, kebab-case
- Examples:
  - `docs/requirements/billing/sources/2026-04-10-billing-kickoff.md`
  - `docs/requirements/user-signup/sources/2026-04-15-ux-review.md`
- **Exception**: if the meeting spans ≥ 2 domains (company kick-off, quarterly planning, multi-team review), park at top-level `docs/calls/<YYYY-MM-DD>-<short-slug>.<ext>` and reference from each affected feature file.

### Stakeholder briefs (PDF, DOCX)

- Filename: `<slug>.<ext>`; no date prefix (briefs are less temporal than calls)
- If the brief has natural versioning (v1, v2), include it: `finance-brief-q2-v2.pdf`
- Example: `docs/requirements/billing/sources/finance-team-brief-q2.pdf`
- **Exception**: if the brief is reused across multiple domains (vendor spec, regulatory standard), park under the shared `docs/support/<legacy|research|vendor|regulatory>/` as declared by `docs/support/README.md`.

### Emails / chat excerpts

- Filename: `<YYYY-MM-DD>-<slug>.md`
- Convert the excerpt to markdown when possible; preserve sender / recipient / date in the file header
- Example: `docs/requirements/billing/sources/2026-04-16-email-tax-rules.md`

### Markdown notes (user-authored)

- Filename: `<slug>.md`
- Let the user decide: leave in place (if already under `docs/` and the user prefers not to move) or park under the target domain's `sources/`
- Never silently move

### Mockups / wireframes / screenshots

- Filename: `<feature>-<NN>.<ext>` where `NN` is an incremental index (`signup-01.png`, `signup-02.png`)
- Example: `docs/requirements/user-signup/sources/signup-flow-01.png`
- Reference from the requirement file's `source_documents` with `kind: mockup`

### Sub-organization inside `sources/` (optional)

If a domain accumulates many files, the user can freely sub-organize — e.g. `sources/calls/`, `sources/emails/`, `sources/mockups/`. The skill does not impose the sub-structure; only the top-level `sources/` is mandatory.

### Copy vs move

Default to **copy**, never move silently. Ask the user if unsure. Users often want to keep the original path for external reasons (shared drive, email attachment, tool export).

---

## Quality bar before writing files

Before phase 4 starts writing, every candidate and every proposed `(domain, feature)` row must pass:

- [ ] `what` is a single concrete capability, rule, or constraint
- [ ] `source` points to a parked (or to-be-parked) document with a section reference
- [ ] UI candidates have been asked about mockups (accepted or declined)
- [ ] Semantic duplicates merged
- [ ] Source disagreements flagged as open points
- [ ] Domain exists or has been explicitly approved by the user as new
- [ ] Feature slug is noun-first, scoped, and distinct from siblings

If any candidate fails the bar, fix it before writing — files once on disk are much more painful to clean up than candidates in memory.
