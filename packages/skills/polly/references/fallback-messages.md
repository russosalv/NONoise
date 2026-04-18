# Polly — fallback messages for missing skills

When Polly tries to engage a skill and it is not installed in the project,
use one of the templates below. All templates:

1. Tell the user plainly the skill is not installed.
2. Offer **skip / manual / install** as the three choices.
3. If the user picks **manual**, Polly walks through the methodology
   conversationally, sourcing from whatever public reference exists.

Never block the SDLC on a missing skill. A partial walkthrough beats a
hard stop.

**Note**: the MVP bundle auto-installs every skill Polly references
(including `superpowers:*` vendored from `obra/superpowers`). Fallback
kicks in only when the user manually removed a skill from
`.claude/skills/` or is running in a non-standard setup.

## Generic template

> The `<skill-name>` skill is not installed in this project. We can:
>
> **(a) Skip** — move to the next step and come back later
> **(b) Manual** — I walk you through the methodology in chat; output goes
>     to `<destination>` by hand
> **(c) Install** — I point you to `skill-finder` / the framework docs so
>     you can add it, then we restart this step
>
> Which one?

Fill in `<destination>` with the folder the skill would normally write to.

## Per-skill templates

### superpowers:brainstorming

Destination: `docs/prd/<feature-slug>/PRD.md`.

Manual fallback summary: read `docs/prd/README.md` for the expected
structure, then do the following in conversation:

1. State the problem in one sentence.
2. Capture the top 3 user jobs-to-be-done.
3. Enumerate 3-5 acceptance scenarios.
4. List known constraints (technical, regulatory, timeline).
5. Mark open questions separately at the bottom.

Write the result to `docs/prd/<slug>/PRD.md` in the same structure
`superpowers:brainstorming` would produce — sections in that order.

### superpowers:writing-plans

Destination: `docs/prd/<slug>/plan.md` or inline in the chat.

Manual fallback summary: convert the PRD into a numbered plan where each
step is small enough that a junior dev can complete it in a day. Mark
dependencies explicitly. Don't invent scope not in the PRD.

### superpowers:executing-plans

No single destination — this skill runs the plan. Manual fallback: work
the plan item by item in conversation, and after each item ask the user to
confirm before moving on.

### bmad-agent-analyst (if ever absent)

Destination: `docs/requirements/<domain>/`.

Manual fallback: run a five-question elicitation:

1. Who is the primary user of this feature / system?
2. What problem is it solving for them?
3. What's the current workaround?
4. What would "done" look like — one concrete scenario?
5. What could go wrong?

Write the answers to `docs/requirements/<domain>/elicitation.md`.

### arch-brainstorm (if ever absent)

Destination: `docs/prd/<slug>/arch-brainstorm.md`.

Manual fallback: propose 2-3 architectural alternatives, score them
against the constraints in `docs/architecture/01-constraints.md`, and
recommend one with a one-paragraph rationale. Don't forget to list
trade-offs explicitly.

### arch-decision (if ever absent)

Destination: `docs/architecture/adr/NNNN-<slug>.md`.

Manual fallback: use the ADR template (Context, Decision, Consequences) and
apply the quint-fpf validation loop manually if `quint-fpf` is present.
The skill also produces an "Impact on docs/architecture/" checklist — when
doing it manually, list what changes in `docs/architecture/` folder files
so the architect can apply the diff.

### sprint-manifest (if ever absent)

Destination: `docs/sprints/Sprint-N/sprint-manifest.md`.

Manual fallback: pick the N user stories in scope, for each produce a
3-5-line macro description (what ships, what value, what's out of scope),
and append them into the single aggregated manifest. Don't break into
per-story files.

### atr (if ever absent)

Destination: `docs/sprints/Sprint-N/acceptance/<slug>.md` plus test + code.

Manual fallback: for each sprint item:

1. Write the acceptance document (what proves it works).
2. Write a failing test that asserts the acceptance.
3. Make the test pass with production code.
4. Refactor.

Record the acceptance artifact in `docs/sprints/Sprint-N/acceptance/`.

### reverse-engineering (if ever absent)

Destination: `docs/support/reverse/<subject-slug>/`.

Manual fallback: ask the user what subject they want to understand (a
subsystem, a flow, a file cluster), iterate in chat drafting chapters, and
only write to disk when the user says "save". See `reverse-engineering`
for the "don't write without permission" rule — respect it in manual mode
too.

### graphify-setup (if ever absent)

This should not happen — `graphify-setup` is a scaffold-level prerequisite
and ships with the MVP bundle. If it really is missing: tell the user to
run `pip install graphifyy` and then `graphify install`, and retry.
