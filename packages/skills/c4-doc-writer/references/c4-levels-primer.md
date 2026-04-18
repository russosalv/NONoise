# C4 levels — primer and NONoise mapping

The C4 model (by Simon Brown, https://c4model.com) defines four levels of architecture diagrams, each zooming in further than the previous one. This primer is a quick reference for `c4-doc-writer` invocations; it does not replace the official model documentation.

## Level 1 — System Context

**Question answered**: "What is this system, who uses it, and what does it talk to?"

**Scope**: the system as a single box, with its users and the external systems it integrates with.

**NONoise source**:
- Users → `docs/requirements/<domain>/` personas (explicit `actors:` list in the requirement frontmatter, or the "Users" section of the template)
- External systems → mentions in ADRs (`docs/architecture/02-*.md` …) and integration tables under `docs/architecture/`
- The system itself → `projectName` from `nonoise.config.json`

**Emit when**: always. A context view is the minimum deliverable of this skill.

## Level 2 — Container

**Question answered**: "What are the high-level building blocks of the system and how do they communicate?"

**Scope**: the runtime-deployable units — web apps, services, databases, message brokers, caches. Each container is something you can point at in your deployment.

**NONoise source**:
- MFEs, BFF, microservices → `docs/architecture/` (components list / service catalog / MFE catalog) and the validated PRDs
- Databases, queues, caches → same sources; often declared in the ADR that introduced them
- Tech stack per container → `nonoise.config.json` stack + ADR "technologies" sections

**Emit when**: the project has more than one deployable unit. Monoliths with one process can skip this level — context + component may be enough.

## Level 3 — Component

**Question answered**: "What are the main building blocks inside this specific container?"

**Scope**: modules, bounded contexts, layers (API / Application / Domain / Infrastructure), significant classes or packages — but not individual methods.

**NONoise source**:
- Module breakdown → `docs/sprints/Sprint-N/sprint-manifest.md` "macro tasks" often map cleanly to components
- Bounded contexts → DDD-style ADRs if the project uses them
- Layer structure → project conventions in `docs/architecture/` or the stack's defaults (Clean Arch, Hexagonal, etc.)

**Emit when**: the architect specifically asked for a component view, or a container is complex enough that "what's inside" is a recurring question in reviews. Default = do **not** emit component views on the first run.

## Level 4 — Code

**Question answered**: "What does the implementation look like?"

**Scope**: class diagrams, module dependency graphs. Usually UML.

**NONoise source**:
- Rarely relevant. Source code is the source of truth at this level; a hand-drawn Code diagram ages within days of being written.

**Emit when**: almost never. If the user explicitly asks, point them at the language's own tooling (TypeDoc, javadoc, pydoc, etc.) rather than hand-writing Code-level DSL. Structurizr DSL supports Code views but the maintenance cost outweighs the benefit in all but the most stable core algorithms.

## How `c4-doc-writer` picks levels

Default output per run (no user override):

| Level | Emitted by default? | Notes |
|---|---|---|
| Context | Yes | Always |
| Container | Yes, if ≥2 containers discovered | Skip for single-process monoliths |
| Component | No | Ask the architect; usually deferred to a later run |
| Code | No | Pointer-only; never scaffolded |

The architect can force any level during Phase 2 Q&A. The skill prefers to under-emit than to over-emit — it is easier to add a view later than to maintain a view nobody reads.

## Dynamic views — orthogonal to levels

Besides the 4 static levels, Structurizr supports **dynamic views** — numbered-step flows across containers (e.g. "user signup", "checkout", "order-placed event propagation"). They are not a fifth level; they are a different way to render the same model, focused on a specific flow.

`c4-doc-writer` emits a dynamic view when the architect points at a specific flow that recurs in multiple conversations — it is the reference artifact the team converges on.
