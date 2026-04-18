---
name: atr
description: Acceptance Test Runner — reads acceptance criteria from a sprint manifest and/or requirements files, generates a machine-readable testbook, executes it via Playwright against the running app, produces markdown reports with screenshots, and maintains a backlog of failures. Optionally pushes failures to an external tracker (VibeKanban integration planned as future work). Use this skill when the user mentions acceptance testing, testbook, running tests against the app, producing a stakeholder-friendly test plan, verifying the app against the sprint manifest, or pushing test failures to a tracker. Triggers — `/atr generate`, `/atr run`, `/atr doc`, `/atr push`, "run acceptance tests", "generate testbook for sprint N", "check the app against the manifest", "create a readable test plan for stakeholders". Language — reports and testbook descriptions follow the project's working language (inferred from the sprint manifest / requirements content, or from `nonoise.config.json` `language` if set; defaults to English).
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral; output under docs/sprints/Sprint-N/acceptance/
---

# atr — Acceptance Test Runner

AI-driven acceptance testing. Reads **acceptance criteria** (from the sprint manifest and, optionally, from requirements files), generates **structured test cases**, executes them via **Playwright** (through the `playwright-cli` sibling skill), and produces **markdown reports with screenshots** plus a **backlog of failures**.

Everything stays under `docs/sprints/Sprint-N/acceptance/` — one folder per sprint, alongside the sprint manifest and promoted PRDs.

## Commands

### `/atr generate`

Reads a sprint manifest (`docs/sprints/Sprint-N/sprint-manifest.md`) — and optionally related requirements from `docs/requirements/` — and generates a testbook YAML covering the acceptance criteria of every task / user story in the sprint.

**Usage**:
- `/atr generate` — uses the most recent sprint folder under `docs/sprints/`
- `/atr generate docs/sprints/Sprint-5/sprint-manifest.md` — specific sprint

### `/atr run`

Executes a testbook and produces markdown reports with screenshots.

**Usage**:
- `/atr run` — uses the latest testbook, runs against `app_url` declared in the testbook (or `http://localhost:3000` as a neutral default)
- `/atr run docs/sprints/Sprint-5/acceptance/testbook.yml` — specific testbook
- `/atr run --url https://staging.example.com` — run against a remote environment
- `/atr run docs/sprints/Sprint-5/acceptance/testbook.yml --url https://staging.example.com` — both

### `/atr doc`

Generates a stakeholder-friendly markdown document from a testbook YAML — for product owners, business analysts, project managers, customers — describing what will be tested in natural language without technical artifacts.

**Usage**:
- `/atr doc` — uses the latest testbook, writes next to it
- `/atr doc docs/sprints/Sprint-5/acceptance/testbook.yml` — specific testbook

### `/atr push`

Reads `backlog.md` and creates issues on an external tracker for each failure.

**Supported integrations (current + planned)**:
- **VibeKanban via MCP** — planned future integration; the skill will be wired to it once the MCP server is part of the NONoise bundle. Reference template is already in `references/vibekanban.md`.
- **GitHub Issues / Azure DevOps / Jira / Linear** — out of scope for v1; user can still use `/atr push` to produce a structured backlog that their own export skill or CI job can consume.

**Usage**: `/atr push` (uses the latest backlog) or `/atr push docs/sprints/Sprint-5/acceptance/backlog.md`

---

## Phase 1: Generate (`/atr generate`)

### Input

- **Primary**: `docs/sprints/Sprint-N/sprint-manifest.md` — user stories + macro tasks with acceptance criteria, areas_covered
- **Secondary (enrichment)**: `docs/requirements/<domain>/<feature>.md` if referenced from the manifest — for additional business context and edge cases not explicit in the manifest
- **Tertiary (enrichment)**: promoted PRDs at `docs/sprints/Sprint-N/<area>/NN-<study>.md` — may contain specific acceptance-test hints in §N-2 "Testing strategy"

If no input path is provided, scan `docs/sprints/` for the most recent sprint folder.

### Process

1. **Read the sprint manifest** completely
2. **Identify sections** — one per **area** covered in the sprint (from `areas_covered` in the manifest frontmatter). One report file per area.
3. **Extract testable requirements** — from the manifest's:
   - Task list (`## 4. Macro functional tasks` — each task's "Acceptance test" becomes a test case)
   - User stories (`## 3. User stories` — each US becomes a test suite grouping its related tasks)
   - Risks (`## 7. Risks and mitigations` — may become edge-case tests)
   - If a task's acceptance test is too abstract, read the relevant promoted PRD's `§N-2 Testing strategy > Acceptance` section for more detail
4. **Generate Playwright steps** per test:
   - Navigation: `goto`, `click` on sidebar/tab links
   - Interaction: `fill`, `click`, `select` for forms and filters
   - Verification: `snapshot` (read accessibility tree), `screenshot` (capture PNG), `eval` (DOM queries)
   - Waits: `wait` for async content to appear
5. **Write testbook YAML** to `docs/sprints/Sprint-N/acceptance/testbook.yml`

### ID convention

Test IDs derive from the **area slug** of the sprint manifest — take the uppercase initials of the area slug's words, joined with `-`, plus a 3-digit sequential suffix:

| Area slug | Prefix |
|---|---|
| `user-signup` | `US-` |
| `pdf-export` | `PE-` |
| `payment-reconciliation` | `PR-` |
| `notifications-push` | `NP-` |
| `settings` | `SET-` (if single word, take first 2-3 letters) |

Number sequentially within each prefix: `US-001`, `US-002`, etc.

If the user wants to override the prefix (e.g. collision with another area), they can set it in the testbook frontmatter manually.

### Testbook YAML schema

```yaml
meta:
  sprint: 5
  sprint_manifest: "docs/sprints/Sprint-5/sprint-manifest.md"
  generated: "YYYY-MM-DDTHH:MM:SSZ"
  app_url: "http://localhost:3000"
  auth:
    # the skill DOES NOT hardcode auth mechanism.
    # Fill this based on your project's auth flow — examples:
    #   type: "none"
    #   type: "basic" ; credentials_env: "ATR_BASIC_CREDS"
    #   type: "oidc" ; provider: "auth0" ; test_user_env: "ATR_USER"
    #   type: "custom" ; see references/auth-flows.md for how to wire your own
    type: "none"
  language: "en"   # report language, inferred from project (en/it/es/...)

sections:
  - id: <area-slug>
    title: "Area title (from manifest)"
    manifest_ref: "§4 task T1, T2"
    report_file: "report-<area-slug>.md"
    tests:
      - id: US-001
        title: "Test title (derived from task acceptance test)"
        manifest_ref: "§4 T1"
        preconditions:
          - "User authenticated as test user"
          - "Application open at /signup"
        steps:
          - action: goto
            target: "/signup"
          - action: wait
            duration: 2
          - action: screenshot
            filename: "US-001-signup-form.png"
            caption: "Signup form rendered"
          - action: snapshot
            verify:
              - "Email input visible"
              - "'Start signup' button visible"
          - action: eval
            script: "document.querySelectorAll('input').length"
            expected: ">= 1"
          - action: click
            description: "Submit the signup form"
            target_hint: "'Start signup' button"
          - action: fill
            description: "Enter email"
            target_hint: "Email input in signup form"
            value: "alice@example.com"
          - action: note
            text: "Manual verification recommended for accessibility labels"
        expected:
          - "Signup session created"
          - "OTP email delivered to configured test inbox"
        skip: false
        skip_reason: ""
```

### Step actions reference

| Action | Fields | Maps to |
|--------|--------|---------|
| `goto` | `target` (relative or absolute URL) | `playwright-cli goto {app_url}{target}` |
| `wait` | `duration` (seconds) | `sleep {duration}` |
| `screenshot` | `filename`, `caption` | `playwright-cli screenshot --filename=screenshots/{filename}` |
| `snapshot` | `verify` (list of strings) | `playwright-cli snapshot`, then AI checks verify items |
| `eval` | `script`, `expected` | `playwright-cli eval "{script}"`, then AI compares the result |
| `click` | `description`, `target_hint` | `playwright-cli snapshot` then `playwright-cli click {ref}` |
| `fill` | `description`, `target_hint`, `value` | `playwright-cli fill {ref} "{value}"` |
| `select` | `description`, `target_hint`, `value` | `playwright-cli snapshot` + select option |
| `note` | `text` | No browser action — the AI records a manual note |

**IMPORTANT for `click`, `fill`, `select`**: these use `target_hint` (a human description), not a Playwright ref. At execution time, the AI must:

1. Run `playwright-cli snapshot`
2. Find the element matching `target_hint` in the snapshot
3. Use the actual ref from the snapshot to perform the action

Refs change between sessions — never cache them.

### Skip rules

Set `skip: true` with an appropriate `skip_reason` when:
- The feature is not yet implemented in the current sprint (the manifest lists it as future-scope)
- The test requires backend error injection or data not reproducible locally
- The test requires specific data that may not exist in the current environment

### Output

After generating the testbook:
1. Create the output directory: `docs/sprints/Sprint-N/acceptance/`
2. Create `screenshots/` subdirectory (empty)
3. Write `testbook.yml`
4. Print summary: total sections, total tests, skipped tests, prefixes used
5. Ask the user to review before running

---

## Phase 2: Run (`/atr run`)

### Prerequisites

- `playwright-cli` skill available (it is — bundled by NONoise)
- App running at the configured `app_url` (or reachable at the `--url` override)
- Auth configured (see `meta.auth` in testbook)

### Invocation pattern

Invoke the `playwright-cli` skill for browser commands. **Do NOT hardcode any project-specific auth pattern** — the testbook's `meta.auth` declares how auth is performed; follow it, or ask the user if unclear.

### Temporary files (`.temp/`)

During execution, save intermediate files (accessibility snapshots, auth state) to `.temp/` at the project root. This directory must be git-ignored.

- **`.temp/auth.json`** — Playwright browser auth state (cookies, localStorage). Reused across runs to skip login.
- **`.temp/snapshots/`** — accessibility tree dumps for debugging. Named `{test-id}-{step}.yml`. Ephemeral.

Never save temporary files inside `docs/sprints/…`.

### Process

1. **Read testbook YAML** from the specified path
2. **Resolve target URL**: if `--url` is provided, use it as base URL for all navigation (overrides `meta.app_url`). Record the actual URL used in each report header.
3. **Authenticate** — skip the login flow whenever possible:
   - Open the target URL: `playwright-cli open {target_url}`
   - If `.temp/auth.json` exists, restore it: `playwright-cli state-load .temp/auth.json`
   - After restoring, navigate to the app and verify you are logged in. If the session is still valid, **do NOT re-authenticate**.
   - Only if `.temp/auth.json` is missing or the restored session is invalid, perform the auth flow described in `meta.auth` of the testbook.
   - After a successful login, save the state: `playwright-cli state-save .temp/auth.json`
   - Auth state saved from localhost may not work on remote (cookie domain mismatch). If restore fails on remote, re-login and save again.
4. **Set viewport**: `playwright-cli resize 1920 1080`
5. **Screenshot naming rule**: all screenshots use the `filename` defined in the testbook YAML step — that is the single source of truth for names. Do NOT invent alternative names (no `-pass.png` / `-fail.png` suffixes by default). When saving, always pass `--filename=screenshots/{filename}` using the exact value from the testbook step.
   - Every PASS or FAIL test needs **at least one screenshot** as evidence. If the testbook already has a `screenshot` step, that one counts. If not, take one at the end and name it `{test-id}.png` (e.g. `US-001.png`).
   - For FAIL tests, if the failure happens at a different point than the planned screenshot, take an additional one named `{test-id}-fail.png` capturing the failure state.
   - SKIP tests need no screenshot.
   - Save to `docs/sprints/Sprint-N/acceptance/screenshots/` — these are final deliverables committed to git.
   - When writing the report, reference the **exact filename** saved.
6. **Initialize report files** — before executing any test, create each section's report file with header + empty summary table (all counts zero). The user can open the files and watch them fill up.
7. **Execute tests and write results incrementally**:
   - For each test in the current section:
     - If `skip: true`: record as SKIP with reason
     - If `skip: false`: execute steps one by one
       - For `screenshot`: save PNG, record path
       - For `snapshot` with `verify`: read snapshot text, check each verify item, mark pass/fail
       - For `eval` with `expected`: compare result, mark pass/fail
     - Determine overall test result (PASS / FAIL / SKIP)
     - **MANDATORY: delegate report writing to a separate agent.** Do NOT write the report yourself — that blocks test execution.
       - **Claude Code**: use the `Agent` tool with `run_in_background: true`
       - **GitHub Copilot**: spawn a sub-task for the file write
       - **Other tools**: use whatever background-task mechanism is available
     - The delegated agent must:
       1. **Append** the test result block to the section report markdown (using the format below)
       2. **Update the summary table** at the top of the report (increment PASS/FAIL/SKIP)
       3. If FAIL, **append** the failure entry to `backlog.md` (create the file with header on first failure)
     - The main agent does NOT wait — it proceeds to the next test immediately.
   - The report grows in real time: the user can open it and see results appearing as tests complete.

### Why delegating report writing is mandatory

Writing the report after each test in the main agent blocks execution — the AI spends time formatting markdown instead of running the next test. Delegating keeps the main agent focused on browser interaction (the bottleneck), and the report is updated concurrently.

**This is NOT optional.** If you are executing tests and writing reports in the same sequential flow, you are doing it wrong.

### Delegated agent prompt template

Read `references/templates.md` → "Delegated Agent Prompt" for the full prompt template.

### Backlog incremental updates

The backlog (`backlog.md`) is also written incrementally. On the first FAIL, the delegated agent creates the file with header. On subsequent FAILs, it appends entries. After all tests complete, the main agent reads the backlog and updates the total-failures count in the header.

### After all sections complete

1. Do a final read of each report file to verify completeness (all tests accounted for)
2. Update backlog header with final failure count
3. Print the overall summary to the user

### Pass/Fail evaluation

The AI evaluates each verification using:

1. **Snapshot text matching** — from `playwright-cli snapshot`, check if expected elements/labels/values are present
2. **Visual verification** — interpret screenshots to detect obvious issues (empty areas, missing components, broken layout)
3. **DOM assertions** — use `playwright-cli eval` for concrete checks (element count, CSS properties, computed styles)
4. **Judgment calls** — for subjective requirements ("layout clear"), mark PASS with a note and defer final judgment to a human

A test is FAIL only with concrete evidence of mismatch. When unsure, mark PASS with a note.

### Report & backlog formats

See `references/templates.md` for:
- **Report format** — section header, summary table, PASS/FAIL/SKIP blocks
- **Backlog format** — failure entries with manifest reference, severity, suggested fix
- **Severity guide** — critical / high / medium / low

### Error handling during execution

- If a step fails (element not found, timeout):
  1. Take a screenshot of the current state
  2. Record the error in the test result
  3. Mark the test as FAIL
  4. Continue to the next test (never stop execution)
- If authentication fails, stop and ask the user
- If the app is not running, stop and ask the user

### Navigation reset between tests

Before each test, navigate to the base URL and then follow the test's navigation steps. This ensures test independence — a failure in one test does not affect the next.

---

## Phase 3: Push (`/atr push`)

Reads `backlog.md` and creates one issue per failure on an external tracker.

### Current status

**VibeKanban via MCP** — planned future integration. The reference for the MCP workflow lives in `references/vibekanban.md`. When the VibeKanban MCP is wired into the NONoise bundle, this phase will be fully automated.

**For v1**: without a configured MCP, `/atr push` prints a report of what **would** be pushed (dry run) and lists the backlog entries, so the user can manually copy them to their tracker or hook their own export flow.

See `references/vibekanban.md` for the (future) MCP setup, severity-to-priority mapping, issue description template, and idempotency rules.

---

## Phase 4: Doc (`/atr doc`)

Generates a stakeholder-friendly test plan document from a testbook YAML. The output is a polished markdown file that non-technical readers (product owners, business analysts, customers) can read to understand test coverage without technical knowledge.

### Input

A testbook YAML file. If no path is given, scan `docs/sprints/Sprint-N/acceptance/` for the most recent testbook.

### Output

A markdown file named `{testbook-basename}-plan.md` next to the testbook. Example:
- `testbook.yml` → `testbook-plan.md`
- `testbook-smoke.yml` → `testbook-smoke-plan.md`

### Process

1. **Read the testbook YAML** completely
2. **Read the sprint manifest** referenced in `meta.sprint_manifest` — provides the business context that enriches the document beyond the testbook alone
3. **Generate the document** following the template in `references/templates.md` → "Stakeholder Test Plan Document"

### Language

Use `meta.language` from the testbook to choose the document language. If not set, fall back to the sprint manifest language (inferable from content), then to `nonoise.config.json` `language` if present, then English as the final default.

### Transformation rules

Translating technical test definitions into natural-language stakeholder text. Apply these rules:

**What to include (from testbook):**
- `meta` → document header (sprint, date)
- Section `title` and `manifest_ref` → section heading with traceability
- Test `id`, `title`, `manifest_ref` → test-case identification
- Test `preconditions` → "Initial conditions" in plain language
- Test `expected` → "Expected results" — already business-readable, use as is
- Test `skip` / `skip_reason` → mark as "Not verifiable" with explanation
- Step `description` fields (from `click`, `fill`, `select`) → human-readable action sequence
- Step `screenshot.caption` → describe what visual evidence will be captured
- Step `snapshot.verify` items → rephrase as "The system verifies that..."
- Step `note.text` → include as operational notes

**What to exclude (technical artifacts):**
- `action` types (goto, wait, eval, snapshot internals)
- `target`, `target_hint`, `script`, `expected` (eval-level)
- Playwright selectors, CSS queries, DOM references
- `app_url`, `auth` — replace with "the application"
- JavaScript code (eval scripts, console interceptors)
- `report_file`, internal IDs like `section-slug`
- Wait durations

**How to rephrase steps:**
- `goto /signup` → "The user navigates to the Signup area"
- `click` with description → use `description` directly
- `fill` with description + value → "The value '{value}' is entered in the '{description}' field"
- `select` with description + value → "'{value}' is selected in the '{description}' field"
- `screenshot` → "Visual evidence is captured: {caption}"
- `snapshot` with verify → "The system verifies: {verify items as bullets}"
- `eval` → omit entirely unless the purpose is clear from context; if so, summarize the intent
- `note` → include the text as is
- `wait` → omit entirely

**Language and tone:**
- Match `meta.language` — first-person-free, professional
- First occurrence of acronyms: spell out
- Third person ("The user…", "The system…")
- Group consecutive technical steps into one narrative sentence when they form a logical action

### After generation

1. Write the document to the output path
2. Print summary: number of sections, total test cases, skipped tests
3. Print the output file path

See `references/templates.md` → "Stakeholder Test Plan Document" for the full template.

---

## Folder layout

Every artifact lives under the sprint folder:

```
docs/sprints/Sprint-N/
├── sprint-manifest.md              ← input (read by /atr generate)
├── <area-slug>/                    ← promoted PRDs
└── acceptance/                     ← ATR workspace
    ├── testbook.yml                ← generated (/atr generate)
    ├── testbook-plan.md            ← generated (/atr doc, optional)
    ├── report-<area-slug>.md       ← generated (/atr run) — one per area
    ├── backlog.md                  ← generated (/atr run) — failures
    └── screenshots/
        └── *.png                   ← evidence — committed to git
```

## Operating principles

1. **One testbook per sprint**, one report per area. Do not fragment further.
2. **Reports are historical**. Once written, do not edit them — regenerate a new run with a different filename if needed (`report-<area>-<YYYYMMDD>.md`).
3. **Screenshots are evidence** and are committed. Use `.gitignore` for `.temp/` only.
4. **Delegation is mandatory** in `/atr run`. Sequential report writing blocks execution.
5. **Auth is project-specific** and never hardcoded. The testbook's `meta.auth` declares it; without it, ask the user.
6. **Language follows the project** — do not hardcode Italian/English in output.
7. **No silent regressions** — a FAIL always produces a backlog entry with enough context to be actioned by a separate AI session.

## Anti-patterns

1. **Cross-sprint testbooks** — never mix tests from different sprints.
2. **Hardcoded auth flow** — never hardcode EntraID / Auth0 / custom — always honor `meta.auth`.
3. **Screenshot-less FAIL** — if a test fails without a screenshot, the report is useless. Always capture.
4. **Sequential report writing** — if you are not delegating, you are doing it wrong.
5. **Custom screenshot names** — never invent suffixes like `-pass.png`; use the testbook-declared name.
6. **Running `/atr push` without a tracker** — will print a dry-run until VibeKanban MCP (or another tracker integration) is wired.

## When NOT to use

- No sprint manifest exists for the target sprint → use `sprint-manifest` first
- The user wants to write unit tests → different tool (`vitest`, `pytest`, etc.)
- The user wants exploratory testing → this skill is for acceptance tests against a manifest; exploratory is out of scope

---

## References

- [`references/templates.md`](./references/templates.md) — Report / backlog / stakeholder-plan formats + transformation examples
- [`references/vibekanban.md`](./references/vibekanban.md) — Planned VibeKanban MCP integration (future)
- Sibling skill `playwright-cli` — browser automation backend
- Sibling skill `sprint-manifest` — source of acceptance criteria
