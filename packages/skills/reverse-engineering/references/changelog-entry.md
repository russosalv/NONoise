<!--
Template for CHANGELOG.md entries of a reverse-engineering dossier.
Used in Step 6.2 of the reverse-engineering skill.

Replace {{...}} placeholders with the real values of the current run.
Prepend this entry at the top of CHANGELOG.md — newest versions on top.

All fields are required unless marked optional. Use "none" / "n/a" rather
than omitting a field — the structure should stay identical across entries
for easy review.
-->

## v{{NEXT_VERSION}} — {{DATE}}

**Type**: {{TYPE}}
<!-- One of:
- "initial"               (first version, v1.0)
- "regeneration M1"        (minor bump, incremental chapter update — the default)
- "regeneration M1 with new chapters"  (minor bump that also adds new chapters)
- "failed regeneration (partial)"  (some chapters failed — list them below)
-->

**Inputs**:
- Document folders indexed: {{DOC_FOLDERS_WITH_STATS}}
  <!-- e.g. "docs/sprints/Sprint-3 (33 files, ~150k tokens) — re-indexed with --update"
              "docs/calls/2026-04-10-billing-kickoff (1 file) — initial" -->
- Subject source graph: {{SUBJECT_SOURCE_DESC}}
  <!-- e.g. "<local_path>/legacy-billing (4210 nodes, 18930 edges) — reused"
              "services/payments (512 nodes, 2103 edges) — re-indexed"
              "skipped (document-only reverse)" -->

**User intent**:

> {{USER_INTENT_VERBATIM}}
<!-- Copy verbatim the consolidated intent confirmed in Step 4.3. Do not reword. -->

**Changes**:

{{BULLET_LIST_OF_CHANGES}}
<!-- One bullet per impacted chapter, derived from the sub-agent's summary:
- `NN-<slug>.md` — short description of what changed
-->

**Impacted chapters**: {{LIST_OF_NN}}
<!-- e.g. "10, 15, 17, 27" or "10, 15, 17, 27, + new 31" -->

**New chapters**: {{NEW_CHAPTERS_OR_NONE}}
<!-- e.g. "31-auth-flow.md" or "none" -->

**Unchanged chapters**: {{UNCHANGED_COUNT}} of {{TOTAL_COUNT}}

**Warnings / open points raised by sub-agents**:

{{WARNINGS_OR_NONE}}
<!-- If any sub-agent surfaced warnings (contradictions with existing chapters,
     open points that need business validation, missing sources), list them here.
     Otherwise write "none". -->

{{SOURCE_LESS_BLOCK_OR_EMPTY}}
<!-- ONLY present when source_less_run = true for this version. Omit the whole
     block (including this comment) if the run had source indexing. Format:

- ⚠️ Executed WITHOUT source indexing (user explicitly skipped at Q3/Q4).
  Source-less chapters: NN, NN, NN.
  Re-run with source indexing to upgrade.
-->

**Sources consulted**:

{{SOURCES_LIST}}
<!-- Top-level references the sub-agents used beyond the chapter itself:
- `docs/sprints/Sprint-3/<file>.md`
- `docs/calls/2026-04-10-billing-kickoff/<file>.md`
- `<source_path>/<module>/<file>` (function `X`)
-->

---
