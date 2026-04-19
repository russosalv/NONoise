# Graph Report - .  (2026-04-19)

## Corpus Check
- Large corpus: 532 files · ~1,051,184 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1145 nodes · 1798 edges · 62 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 258 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_BMAD Personas & Core Principles|BMAD Personas & Core Principles]]
- [[_COMMUNITY_Superpowers Skills & Reviewers|Superpowers Skills & Reviewers]]
- [[_COMMUNITY_Azure DevOps & Work-Item Adapters|Azure DevOps & Work-Item Adapters]]
- [[_COMMUNITY_Schema Validator Internals|Schema Validator Internals]]
- [[_COMMUNITY_CLI Build & Print Helpers|CLI Build & Print Helpers]]
- [[_COMMUNITY_DevOps Push Handlers|DevOps Push Handlers]]
- [[_COMMUNITY_Skill-Creator Eval Agents|Skill-Creator Eval Agents]]
- [[_COMMUNITY_PairSolo Dev-Trio Workflow|Pair/Solo Dev-Trio Workflow]]
- [[_COMMUNITY_Shared Access Model (authMCP)|Shared Access Model (auth/MCP)]]
- [[_COMMUNITY_Quality Attributes & ATAM-Lite|Quality Attributes & ATAM-Lite]]
- [[_COMMUNITY_Architecture Brainstorm Flow|Architecture Brainstorm Flow]]
- [[_COMMUNITY_HTML Report Generator|HTML Report Generator]]
- [[_COMMUNITY_Six-Folder Docs Hierarchy|Six-Folder Docs Hierarchy]]
- [[_COMMUNITY_Architecture Decisions (DRR)|Architecture Decisions (DRR)]]
- [[_COMMUNITY_Eval Runs HTTP Server|Eval Runs HTTP Server]]
- [[_COMMUNITY_DOCX Element Manipulation|DOCX Element Manipulation]]
- [[_COMMUNITY_Impeccable Design Principles|Impeccable Design Principles]]
- [[_COMMUNITY_Skill-Finder Fetchers|Skill-Finder Fetchers]]
- [[_COMMUNITY_LibreOffice Thumbnail Helper|LibreOffice Thumbnail Helper]]
- [[_COMMUNITY_Observability Log Adapters|Observability Log Adapters]]
- [[_COMMUNITY_Benchmark Aggregator|Benchmark Aggregator]]
- [[_COMMUNITY_DOCX Tracked Changes|DOCX Tracked Changes]]
- [[_COMMUNITY_Requirements Ingest Flow|Requirements Ingest Flow]]
- [[_COMMUNITY_SDLC Flow & Mode Diagram|SDLC Flow & Mode Diagram]]
- [[_COMMUNITY_Vendor Sync Script|Vendor Sync Script]]
- [[_COMMUNITY_PPTX File Cleanup|PPTX File Cleanup]]
- [[_COMMUNITY_Playwright Request Mocking|Playwright Request Mocking]]
- [[_COMMUNITY_Skill Packaging (.skill)|Skill Packaging (.skill)]]
- [[_COMMUNITY_PPTX Slide Operations|PPTX Slide Operations]]
- [[_COMMUNITY_Giulia — UX Designer Persona|Giulia — UX Designer Persona]]
- [[_COMMUNITY_Ops Skill Builder Examples|Ops Skill Builder Examples]]
- [[_COMMUNITY_PPTX Authoring Guidance|PPTX Authoring Guidance]]
- [[_COMMUNITY_Pull-All PowerShell Script|Pull-All PowerShell Script]]
- [[_COMMUNITY_Switch-Branch PowerShell Script|Switch-Branch PowerShell Script]]
- [[_COMMUNITY_Clone-All PowerShell Script|Clone-All PowerShell Script]]
- [[_COMMUNITY_Skill Directory Utilities|Skill Directory Utilities]]
- [[_COMMUNITY_Using-Superpowers Meta-Rules|Using-Superpowers Meta-Rules]]
- [[_COMMUNITY_NONoise White Logo|NONoise White Logo]]
- [[_COMMUNITY_Graph Rendering (Graphviz)|Graph Rendering (Graphviz)]]
- [[_COMMUNITY_Playwright CLI References|Playwright CLI References]]
- [[_COMMUNITY_Office Unpack Utility|Office Unpack Utility]]
- [[_COMMUNITY_Multi-Repo Workspace Workflow|Multi-Repo Workspace Workflow]]
- [[_COMMUNITY_Markdown Extract Helper|Markdown Extract Helper]]
- [[_COMMUNITY_Condition-Based Waiting Pattern|Condition-Based Waiting Pattern]]
- [[_COMMUNITY_FPF Status & Decay Tools|FPF Status & Decay Tools]]
- [[_COMMUNITY_DevOps Push CLI Glue|DevOps Push CLI Glue]]
- [[_COMMUNITY_Pilu Mascot|Pilu Mascot]]
- [[_COMMUNITY_NONoise Black Logo|NONoise Black Logo]]
- [[_COMMUNITY_Test Helper|Test Helper]]
- [[_COMMUNITY_VS Code Config Generator|VS Code Config Generator]]
- [[_COMMUNITY_Daniel — Tech Writer Persona|Daniel — Tech Writer Persona]]
- [[_COMMUNITY_BMAD Personas & Elicitation|BMAD Personas & Elicitation]]
- [[_COMMUNITY_NONoise Cat Mascot Image|NONoise Cat Mascot Image]]
- [[_COMMUNITY_Bundle-Assets Script|Bundle-Assets Script]]
- [[_COMMUNITY_Python Package Init (a)|Python Package Init (a)]]
- [[_COMMUNITY_Python Package Init (b)|Python Package Init (b)]]
- [[_COMMUNITY_Python Package Init (c)|Python Package Init (c)]]
- [[_COMMUNITY_Vitest Config|Vitest Config]]
- [[_COMMUNITY_CLI Integration Test|CLI Integration Test]]
- [[_COMMUNITY_Skill Manifest Test|Skill Manifest Test]]
- [[_COMMUNITY_create-nonoise CLI Entry|create-nonoise CLI Entry]]
- [[_COMMUNITY_License & Attribution|License & Attribution]]

## God Nodes (most connected - your core abstractions)
1. `Skill catalog document` - 35 edges
2. `log()` - 32 edges
3. `BaseSchemaValidator` - 26 edges
4. `Polly — NONoise Orchestrator` - 21 edges
5. `DOCXSchemaValidator` - 18 edges
6. `scaffold()` - 18 edges
7. `External tools document (advisor-only)` - 18 edges
8. `handlePushStepByStep()` - 17 edges
9. `bmad-req-validator Skill` - 16 edges
10. `quint-fpf Skill (First Principles Framework)` - 16 edges

## Surprising Connections (you probably didn't know these)
- `CLI scaffold pipeline` --semantically_similar_to--> `Repository layout reference`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/installation.md
- `printHelp()` --calls--> `log()`  [INFERRED]
  scripts/sync-vendor.mjs → packages/templates/multi-repo/_always/tools/devops-push/src/devops-api.js
- `syncOne()` --calls--> `log()`  [INFERRED]
  scripts/sync-vendor.mjs → packages/templates/multi-repo/_always/tools/devops-push/src/devops-api.js
- `init()` --calls--> `log()`  [INFERRED]
  scripts/sync-vendor.mjs → packages/templates/multi-repo/_always/tools/devops-push/src/devops-api.js
- `main()` --calls--> `log()`  [INFERRED]
  scripts/sync-vendor.mjs → packages/templates/multi-repo/_always/tools/devops-push/src/devops-api.js

## Hyperedges (group relationships)
- **Pair-mode SDLC phases (discovery/architecture/sprint)** — sdlc_phase1_requirements, sdlc_phase3_architecture, sdlc_phase4_sprint, concept_pair_solo [EXTRACTED 0.95]
- **Six-folder docs/ as skill read/write substrate** — folder_docs_requirements, folder_docs_architecture, folder_docs_prd, folder_docs_sprints, folder_docs_support, folder_docs_calls, concept_six_folder_tree [EXTRACTED 0.95]
- **Polly auto-trigger mechanism across tools** — concept_polly_start_marker, polly_triggers, crosstool_v1_scope, skill_polly [EXTRACTED 0.90]
- **** — quint_q0_init, quint_q1_hypothesize, quint_q2_verify, quint_q5_decide [EXTRACTED 1.00]
- **** — invest_validator, smart_validator, ears_validator [EXTRACTED 1.00]
- **** — ieee830_validator, fmea_lite_validator, wotif_validator [EXTRACTED 1.00]
- **** — quint_waive_action, quint_deprecate_action, quint_refresh_action [EXTRACTED 1.00]
- **Quint FPF command-tool invocation cluster** — qstatus_command, q3validate_command, q4audit_command, qactualize_command [INFERRED 0.90]
- **spec-to-workitem adapter family (pluggable tracker adapters)** — adapter_github, adapter_azuredevops, adapter_jira, adapter_linear, adapter_dryrun [INFERRED 0.90]
- **observability-debug adapter family (pluggable telemetry backends)** — obsadapter_cloudwatch, obsadapter_grafana_loki, obsadapter_datadog [INFERRED 0.90]
- **NONoise architectural workflow steps** — archdecision_skill, sprintmanifest_skill, spectoworkitem_skill, c4docwriter_skill [EXTRACTED 1.00]
- **Observability adapter trio** — adapter_app_insights_skill, adapter_otel_collector_skill, adapter_generic_log_file_skill [EXTRACTED 1.00]
- **Architectural workflow (3-step)** — arch_brainstorm_skill, arch_decision_concept, sprint_manifest_concept [EXTRACTED 1.00]
- **Access-first consumers** — access_model_shared, ops_skill_builder_skill, observability_debug_skill_concept, access_patterns_doc [EXTRACTED 1.00]
- **Polly SDLC Orchestration Cluster** —  [EXTRACTED 1.00]
- **BMAD Persona Skills (Isa, Alex) + NONoise Customization** —  [EXTRACTED 0.95]
- **Impeccable Vendored Design Suite** —  [EXTRACTED 1.00]
- **Craft Flow consolidates all design reference docs** — impeccable:ref:craft, impeccable:ref:spatial-design, impeccable:ref:typography, impeccable:ref:interaction-design, impeccable:ref:motion-design, impeccable:ref:color-and-contrast, impeccable:ref:responsive-design, impeccable:ref:ux-writing [EXTRACTED 1.00]
- **Critique skill uses scoring + personas + cognitive-load triad** — impeccable:skill:critique, impeccable:critique:ref:heuristics-scoring, impeccable:critique:ref:personas, impeccable:critique:ref:cognitive-load [EXTRACTED 1.00]
- **Multiple skills warn against same AI slop patterns (gradients, glassmorphism, generic fonts, hero metrics)** — impeccable:skill:audit, impeccable:skill:bolder, impeccable:skill:critique, impeccable:skill:polish, concept:ai-slop [INFERRED 0.85]
- **Skill Creator Evaluation Triad (Grader + Comparator + Analyzer)** — agent:grader, agent:comparator, agent:analyzer, skill:skill-creator [EXTRACTED 1.00]
- **Impeccable Design Skill Cluster (colorize + overdrive share context protocol)** — skill:impeccable:colorize, skill:impeccable:overdrive, concept:impeccable-context-protocol [EXTRACTED 1.00]
- **Deprecated Superpowers Commands (all redirect to skills)** — cmd:execute-plan-deprecated, cmd:write-plan-deprecated, cmd:brainstorm-deprecated, vendor:superpowers [EXTRACTED 1.00]
- **Systematic debugging skill + its supporting techniques** — skill:systematic-debugging, doc:root-cause-tracing, doc:defense-in-depth, doc:condition-based-waiting [EXTRACTED 1.00]
- **Pressure-test battery validating skill resists rationalization (time, sunk cost, authority) vs academic baseline** — doc:test-pressure-1, doc:test-pressure-2, doc:test-pressure-3, doc:test-academic, skill:systematic-debugging, concept:bulletproofing-rigid-language [INFERRED 0.90]
- **Superpowers pipeline: brainstorm -> writing-plans -> executing-plans/subagent-driven -> finishing-branch** — skill:brainstorming, skill:writing-plans, skill:executing-plans, skill:subagent-driven-development, skill:finishing-a-development-branch, skill:using-git-worktrees, skill:dispatching-parallel-agents [EXTRACTED 1.00]
- **Code review loop: request -> review -> receive feedback** —  [EXTRACTED 1.00]
- **Skill authoring discipline: TDD for docs + persuasion + Anthropic best practices** —  [EXTRACTED 1.00]
- **Subagent-driven task pipeline: implementer -> spec reviewer -> code quality reviewer** —  [EXTRACTED 1.00]
- **Requirements ingestion pipeline: raw docs -> md-extractor -> requirements-ingest -> arch-brainstorm** —  [EXTRACTED 1.00]
- **NONoise multi-repo workspace workflow (clone -> switch-branch -> pull) driven by repositories.json** —  [EXTRACTED 1.00]
- **docs-hierarchy-six-folder** —  [EXTRACTED 1.00]
- **docs-hierarchy-six-folder (multi-repo variant)** —  [EXTRACTED 1.00]

## Communities

### Community 0 - "BMAD Personas & Core Principles"
Cohesion: 0.02
Nodes (151): Isa Capabilities (BP/MR/DR/TR/CB/WB/DP/EL/RV), Isa — Business Analyst Persona, Canonical Architectures Principle, LSP Advisor (never auto-install), Alex — System Architect Persona, bundle-assets.mjs build step, CLI scaffold pipeline, graphify usage block (+143 more)

### Community 1 - "Superpowers Skills & Reviewers"
Cohesion: 0.03
Nodes (87): Superpowers Code Reviewer Agent, Brainstorm companion frame template (HTML/CSS), brainstorm command (deprecated), execute-plan command (deprecated), write-plan command (deprecated), 3+ failed fixes = architectural problem, not failed hypothesis, Authority principle (imperative language, no exceptions), Bite-sized tasks: each step one action, 2-5 minutes, TDD rhythm (+79 more)

### Community 2 - "Azure DevOps & Work-Item Adapters"
Cohesion: 0.03
Nodes (69): Azure DevOps adapter (implemented), AZURE_DEVOPS_PAT auth, System.LinkTypes.Dependency-Forward/Reverse, WIQL queries + iteration path, dry-run adapter (safety-net default), No authentication / no network, GitHub Issues adapter (default live v1), gh CLI or GH_TOKEN auth (+61 more)

### Community 3 - "Schema Validator Internals"
Cohesion: 0.06
Nodes (16): BaseSchemaValidator, Base validator with common validation logic for document files., BaseSchemaValidator, DOCXSchemaValidator, Validator for Word document XML files against XSD schemas., Validation modules for Word document processing., _condense_xml(), pack() (+8 more)

### Community 4 - "CLI Build & Print Helpers"
Cohesion: 0.06
Nodes (48): paint(), printBanner(), toPascalCase(), toSnakeCase(), main(), parseArgv(), printHelp(), readVersion() (+40 more)

### Community 5 - "DevOps Push Handlers"
Cohesion: 0.1
Nodes (46): checkEnvInteractive(), handlePushAll(), handlePushOne(), handlePushStepByStep(), handleSummary(), handleValidateAll(), handleValidateOne(), main() (+38 more)

### Community 6 - "Skill-Creator Eval Agents"
Cohesion: 0.05
Nodes (57): Post-hoc Analyzer Agent, Blind Comparator Agent, Grader Agent, Eval Review HTML Template, Eval Viewer HTML, AI Slop Anti-Patterns, With-skill vs Baseline Comparison, Blind A/B Comparison (de-biased judgment) (+49 more)

### Community 7 - "Pair/Solo Dev-Trio Workflow"
Cohesion: 0.06
Nodes (50): Dev trio (writing-plans + executing-plans + atr + finishing), Pair vs Solo Workflow Principle, Phase Fingerprinting via Filesystem, design-md-generator, Stitch 9-Section DESIGN.md Format, Absolute Bans (side-stripes, gradient text), impeccable:adapt (responsive), AI Slop Test (+42 more)

### Community 8 - "Shared Access Model (auth/MCP)"
Cohesion: 0.05
Nodes (46): Browser-MCP pin per AI tool (Playwright), Env-var auth convention (TOOL_TOKEN, TOOL_API_KEY), Never-silent-login rule, OIDC federation for CI (GH Actions -> Azure/AWS/GCP), Cheap read-only probe pattern, Shared access-first reference, Access tiers: CLI > API > Web, Auth-model summary for crystallized skills (+38 more)

### Community 9 - "Quality Attributes & ATAM-Lite"
Cohesion: 0.07
Nodes (36): Quality Attribute Scenario (QAS), Six Quality Attributes (Perf/Scale/Sec/Avail/Maint/Interop), Quality Attribute Tradeoffs, ATAM-Lite Validator, Isa Capability RV (handoff-only), Phase 1 Classification, Phase 2 Methodology Recommendation, Phase 4 Gap Aggregation (dedup) (+28 more)

### Community 10 - "Architecture Brainstorm Flow"
Cohesion: 0.07
Nodes (32): 4-phase flow: DISCOVER/DIALOGUE/WRITE/HANDOFF, Narrative PRD under docs/prd/<area>/, arch-brainstorm skill (step 1), arch-decision (step 2 validator), Workflow: brainstorm -> arch-decision -> sprint-manifest, Commands: generate/run/doc/push, Mandatory delegation of report writing, playwright-cli sibling skill (+24 more)

### Community 11 - "HTML Report Generator"
Cohesion: 0.1
Nodes (23): generate_html(), main(), Generate HTML report from loop output data. If auto_refresh is True, adds a meta, _call_claude(), improve_description(), main(), Run `claude -p` with the prompt on stdin and return the text response.      Prom, Call Claude to improve the description based on eval results. (+15 more)

### Community 12 - "Six-Folder Docs Hierarchy"
Cohesion: 0.15
Nodes (27): Six-folder docs hierarchy scaffold (calls, sprints, requirements, architecture, prd, support), docs/architecture/ — single source of truth (multi-repo), 00-index.md — architecture index stub (multi-repo), 01-constraints.md — absolute architectural constraints stub (multi-repo), docs/calls/ — cross-domain meeting notes (multi-repo), docs/prd/ — PRD drafts, arch-brainstorm output (multi-repo), docs/ knowledge base (multi-repo), docs/requirements/ — functional and business requirements (multi-repo) (+19 more)

### Community 13 - "Architecture Decisions (DRR)"
Cohesion: 0.12
Nodes (24): decision_context (MemberOf grouping), depends_on dependency modeling, Deprecate Decision Action, DRR (Design Rationale Record), Bounded Context (Phase 0), Congruence Level (CL 1-3), Conversational Mode (markdown fallback), Holon (unit of reasoning) (+16 more)

### Community 14 - "Eval Runs HTTP Server"
Cohesion: 0.13
Nodes (18): BaseHTTPRequestHandler, build_run(), embed_file(), find_runs(), _find_runs_recursive(), generate_html(), get_mime_type(), _kill_port() (+10 more)

### Community 15 - "DOCX Element Manipulation"
Cohesion: 0.25
Nodes (16): _can_merge(), _consolidate_text(), _find_elements(), _first_child_run(), _get_child(), _get_children(), _is_adjacent(), _is_run() (+8 more)

### Community 16 - "Impeccable Design Principles"
Cohesion: 0.14
Nodes (16): 60fps Performance Target, 60/30/10 Color Hierarchy Rule, Impeccable Context Gathering Protocol, OKLCH Perceptually Uniform Color, prefers-reduced-motion Accessibility, Progressive Enhancement (graceful fallbacks), Propose Before Building (multi-direction), Semantic Color (success/error/warning/info) (+8 more)

### Community 17 - "Skill-Finder Fetchers"
Cohesion: 0.29
Nodes (13): fetchAwesomeList(), fetchGithubRepoTree(), fetchJson(), fetchMarketplaceJson(), fetchSource(), fetchText(), ghHeaders(), loadCustomSources() (+5 more)

### Community 18 - "LibreOffice Thumbnail Helper"
Cohesion: 0.22
Nodes (13): _ensure_shim(), get_soffice_env(), _needs_shim(), Helper for running LibreOffice (soffice) in environments where AF_UNIX sockets m, run_soffice(), build_slide_list(), convert_to_images(), create_grid() (+5 more)

### Community 19 - "Observability Log Adapters"
Cohesion: 0.19
Nodes (14): CloudWatch adapter (AWS Logs Insights + X-Ray), AWS SSO/IAM/role-based auth, Datadog adapter (Logs + APM spans + Events), DD_API_KEY + DD_APP_KEY + DD_SITE auth, LogQL query language, Grafana Loki adapter (+Tempo for traces), 6 phases: elicit→adapter→access→query→correlate→fix, Access-first philosophy (shared access-model.md) (+6 more)

### Community 20 - "Benchmark Aggregator"
Cohesion: 0.24
Nodes (11): aggregate_results(), calculate_stats(), generate_benchmark(), generate_markdown(), load_run_results(), main(), Aggregate run results into summary statistics.      Returns run_summary with sta, Generate complete benchmark.json from run results. (+3 more)

### Community 21 - "DOCX Tracked Changes"
Cohesion: 0.29
Nodes (11): _can_merge_tracked(), _find_elements(), _get_author(), _get_authors_from_docx(), get_tracked_change_authors(), infer_author(), _is_element(), _merge_tracked_changes_in() (+3 more)

### Community 22 - "Requirements Ingest Flow"
Cohesion: 0.2
Nodes (12): Requirement file is input contract to arch-brainstorm, Extracted Markdown (sibling of PDF) is canonical indexed source, Do not invent acceptance criteria; flag as open points, docs/requirements/<domain>/<feature>.md folder convention, 5-phase flow: COLLECT, EXTRACT, STRUCTURE, WRITE, HANDOFF, 5 signal types: functional, business-rule, UI/UX, out-of-scope, open-question, Source document parking under <domain>/sources/ with dated filenames, Ingestion heuristics (signal taxonomy, dedup, conflict resolution) (+4 more)

### Community 23 - "SDLC Flow & Mode Diagram"
Cohesion: 0.33
Nodes (12): NONoise SDLC Flow Diagram, Codebase Context, Documentation Hierarchy, File of Contents IA, Mode [Pair] - Large Models for Architecture, Mode [Solo] - Small Models for Implementation, Polly: The Conductor, Instant Scaffolding (create-nonoise) (+4 more)

### Community 24 - "Vendor Sync Script"
Cohesion: 0.38
Nodes (10): cloneShallow(), init(), listVendors(), main(), parseArgs(), printHelp(), readManifest(), sh() (+2 more)

### Community 25 - "PPTX File Cleanup"
Cohesion: 0.33
Nodes (10): clean_unused_files(), get_referenced_files(), get_slide_referenced_files(), get_slides_in_sldidlst(), Remove unreferenced files from an unpacked PPTX directory.  Usage: python clean., remove_orphaned_files(), remove_orphaned_rels_files(), remove_orphaned_slides() (+2 more)

### Community 26 - "Playwright Request Mocking"
Cohesion: 0.2
Nodes (11): Conditional Response via run-code, Playwright CLI Request Mocking, Simulate Network Failures (abort), playwright-cli route command, URL Patterns (glob), A/B Testing Sessions Pattern, Concurrent Scraping Pattern, Session Isolation (cookies, storage, cache) (+3 more)

### Community 27 - "Skill Packaging (.skill)"
Cohesion: 0.28
Nodes (7): main(), package_skill(), Check if a path should be excluded from packaging., Package a skill folder into a .skill file.      Args:         skill_path: Path t, should_exclude(), Basic validation of a skill, validate_skill()

### Community 28 - "PPTX Slide Operations"
Cohesion: 0.44
Nodes (7): _add_to_content_types(), _add_to_presentation_rels(), create_slide_from_layout(), duplicate_slide(), _get_next_slide_id(), get_next_slide_number(), Add a new slide to an unpacked PPTX directory.  Usage: python add_slide.py <unpa

### Community 29 - "Giulia — UX Designer Persona"
Cohesion: 0.22
Nodes (9): Capabilities: UX/DES/UI/CRT/POL/ADA/DLT/ANM/AUD/EL, bmad-agent-ux-designer (Giulia), Giulia — UX Designer + UI Specialist, Integration with Polly (greenfield flow), design-md-generator skill, Bold aesthetic direction (no AI-slop), frontend-design skill, impeccable/* skills (critique/polish/adapt/delight/animate/audit) (+1 more)

### Community 30 - "Ops Skill Builder Examples"
Cohesion: 0.31
Nodes (9): Risk Annotation (non-destructive/reversible/destructive), AWS EKS Rollout Example, Azure AKS Deploy Example, Five-Phase Ops Flow, GCP Cloud Run Pipeline Example, Ops Skill Builder Examples, Canonical Ops Skill Template, deploy-payments-api-dev Sample Skill (+1 more)

### Community 31 - "PPTX Authoring Guidance"
Cohesion: 0.25
Nodes (9): Commit to a Visual Motif, Varied Slide Layouts (avoid monotony), Visual QA via Subagents (fresh eyes), PPTX Editing Workflow (unpack/pack), PptxGenJS Tutorial, PPTX Skill, markitdown (PPTX text extraction), pptxgenjs (Node PPTX generation) (+1 more)

### Community 32 - "Pull-All PowerShell Script"
Cohesion: 0.43
Nodes (6): Get-RepositoryConfiguration(), Pull-Repository(), Write-Err(), Write-Info(), Write-Success(), Write-Warn()

### Community 33 - "Switch-Branch PowerShell Script"
Cohesion: 0.43
Nodes (6): Get-RepositoryConfiguration(), Switch-RepositoryBranch(), Write-Err(), Write-Info(), Write-Success(), Write-Warn()

### Community 34 - "Clone-All PowerShell Script"
Cohesion: 0.43
Nodes (6): Clone-Repository(), Get-RepositoryConfiguration(), Write-Err(), Write-Info(), Write-Success(), Write-Warn()

### Community 35 - "Skill Directory Utilities"
Cohesion: 0.5
Nodes (7): buildTargetNames(), cleanSkillsLock(), cleanup(), findProjectRoot(), findSkillsDirs(), isImpeccableSkill(), removeDeprecatedSkills()

### Community 36 - "Using-Superpowers Meta-Rules"
Cohesion: 0.43
Nodes (8): 1% rule: if any chance a skill applies, invoke it, Instruction priority: user > superpowers > default system, Cross-platform tool name mapping (Read/Write/Edit/Bash/Task -> native), Skill priority order: process skills (brainstorm/debug) before implementation skills, Codex tool mapping reference, Copilot CLI tool mapping reference, Gemini CLI tool mapping reference, Using Superpowers (meta-skill)

### Community 37 - "NONoise White Logo"
Cohesion: 0.29
Nodes (7): Grumpy orange Persian cat mascot, Black over-ear headphones with green signal LED, Palette: white background, orange cat, black headphones, green accent, dark gray text, Flat vector mascot illustration style, Tagline 'pure signal', Wordmark 'NONoise' with 'NO' bold, NONoise Logo (white)

### Community 38 - "Graph Rendering (Graphviz)"
Cohesion: 0.53
Nodes (4): combineGraphs(), extractDotBlocks(), main(), renderToSvg()

### Community 39 - "Playwright CLI References"
Cohesion: 0.4
Nodes (6): playwright-cli Running Code reference, playwright-cli SKILL.md, playwright-cli Storage State reference, playwright-cli Test Generation reference, playwright-cli Tracing reference, playwright-cli Video Recording reference

### Community 40 - "Office Unpack Utility"
Cohesion: 0.6
Nodes (4): _escape_smart_quotes(), _pretty_print_xml(), Unpack Office files (DOCX, PPTX, XLSX) for editing.  Extracts the ZIP archive, p, unpack()

### Community 41 - "Multi-Repo Workspace Workflow"
Cohesion: 0.6
Nodes (5): NONoise multi-repo workspace workflow (clone/switch/pull across repos), repositories.json workspace config (active/inactive sub-repos), clone-all.ps1 (clone every active sub-repo from repositories.json), pull-all.ps1 (fast-forward pull every active sub-repo), switch-branch.ps1 (checkout/create branch across sub-repos)

### Community 42 - "Markdown Extract Helper"
Cohesion: 0.67
Nodes (2): prompt(), stripQuotes()

### Community 43 - "Condition-Based Waiting Pattern"
Cohesion: 0.5
Nodes (0): 

### Community 44 - "FPF Status & Decay Tools"
Cohesion: 0.5
Nodes (4): q-status — Show FPF status, Hypothesis layers L0/L1/L2, quint_check_decay tool, quint_status tool

### Community 45 - "DevOps Push CLI Glue"
Cohesion: 0.5
Nodes (4): Dry-run default + idempotent work item push via back-written IDs, Feature > User Story > Task hierarchy in Azure DevOps push, Skill: spec-to-workitem (tracker-agnostic bridge, referenced), @nonoise/devops-push (Azure DevOps work item push CLI)

### Community 46 - "Pilu Mascot"
Cohesion: 0.67
Nodes (4): Headphones Motif, NONoise, Pilu, Cat Mascot with Headphones

### Community 47 - "NONoise Black Logo"
Cohesion: 0.5
Nodes (4): Headphones Motif, NONoise Logo (black), Grumpy Orange Cat Mascot, Tagline: pure signal

### Community 48 - "Test Helper"
Cohesion: 0.67
Nodes (0): 

### Community 49 - "VS Code Config Generator"
Cohesion: 0.67
Nodes (3): Merge-preserve-hand-written-entries behavior, vscode-config-generator skill, Stack detection (Node/.NET/Python)

### Community 50 - "Daniel — Tech Writer Persona"
Cohesion: 0.67
Nodes (3): Capabilities DP/SYN/REA/WD/MG/VD/EC/PLN/EL, Daniel — Technical Writer persona, bmad-agent-tech-writer (Daniel persona)

### Community 51 - "BMAD Personas & Elicitation"
Cohesion: 0.67
Nodes (3): NONoise BMAD personas (Isa, Alex, Daniel, Giulia), Method registry (CSV) of elicitation techniques, Skill: bmad-advanced-elicitation (structured elicitation methods)

### Community 52 - "NONoise Cat Mascot Image"
Cohesion: 0.67
Nodes (3): Grumpy Orange Cat Wearing Headphones, Noise Cancellation Theme, NONoise Cat Mascot

### Community 53 - "Bundle-Assets Script"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Python Package Init (a)"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Python Package Init (b)"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Python Package Init (c)"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "CLI Integration Test"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Skill Manifest Test"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "create-nonoise CLI Entry"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "License & Attribution"
Cohesion: 1.0
Nodes (1): License and attribution (MIT + attribution)

## Knowledge Gaps
- **349 isolated node(s):** `Recursively find directories that contain an outputs/ subdirectory.`, `Build a run dict with prompt, outputs, and grading data.`, `Read a file and return an embedded representation.`, `Load previous iteration's feedback and outputs.      Returns a map of run_id ->`, `Generate the complete standalone HTML page with embedded data.` (+344 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Bundle-Assets Script`** (2 nodes): `listChildDirs()`, `bundle-assets.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Python Package Init (a)`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Python Package Init (b)`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Python Package Init (c)`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Integration Test`** (1 nodes): `cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Skill Manifest Test`** (1 nodes): `skill-manifest.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `create-nonoise CLI Entry`** (1 nodes): `create-nonoise.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `License & Attribution`** (1 nodes): `License and attribution (MIT + attribution)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `log()` connect `DevOps Push Handlers` to `Vendor Sync Script`, `Skill-Finder Fetchers`, `CLI Build & Print Helpers`, `Graph Rendering (Graphviz)`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `getTempDir()` connect `DevOps Push Handlers` to `LibreOffice Thumbnail Helper`, `HTML Report Generator`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `log()` (e.g. with `printHelp()` and `syncOne()`) actually correct?**
  _`log()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `BaseSchemaValidator` (e.g. with `DOCXSchemaValidator` and `Validator for Word document XML files against XSD schemas.`) actually correct?**
  _`BaseSchemaValidator` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `DOCXSchemaValidator` (e.g. with `BaseSchemaValidator` and `Validation modules for Word document processing.`) actually correct?**
  _`DOCXSchemaValidator` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Recursively find directories that contain an outputs/ subdirectory.`, `Build a run dict with prompt, outputs, and grading data.`, `Read a file and return an embedded representation.` to the rest of the system?**
  _349 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BMAD Personas & Core Principles` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._