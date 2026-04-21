# Graph Report - NONoise-frmw  (2026-04-22)

## Corpus Check
- 202 files · ~1,366,162 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2629 nodes · 5277 edges · 61 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 1532 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 76|Community 76]]

## God Nodes (most connected - your core abstractions)
1. `Response` - 47 edges
2. `Request` - 43 edges
3. `build_from_json()` - 42 edges
4. `cluster()` - 37 edges
5. `main()` - 35 edges
6. `Skill catalog document` - 35 edges
7. `log()` - 34 edges
8. `_labels()` - 34 edges
9. `detect()` - 31 edges
10. `_make_id()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `test_make_id_strips_dots_and_underscores()` --calls--> `_make_id()`  [INFERRED]
  packages\skills\vendor\graphify\tests\test_extract.py → packages\skills\vendor\graphify\graphify\extract.py
- `test_make_id_no_leading_trailing_underscores()` --calls--> `_make_id()`  [INFERRED]
  packages\skills\vendor\graphify\tests\test_extract.py → packages\skills\vendor\graphify\graphify\extract.py
- `CLI scaffold pipeline` --semantically_similar_to--> `Repository layout reference`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/installation.md
- `Dev trio implementation loop` --rationale_for--> `Pair vs Solo Workflow Principle`  [INFERRED]
  docs/polly.md → packages/skills/polly/SKILL.md
- `printHelp()` --calls--> `log()`  [INFERRED]
  NONoise-frmw\packages\skills\skill-finder\scripts\fetch-registry.mjs → NONoise-frmw\packages\templates\single-project\_always\tools\devops-push\src\devops-api.js

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

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (224): _cross_community_surprises(), _cross_file_surprises(), _file_category(), god_nodes(), graph_diff(), _is_concept_node(), _is_file_node(), _node_community_map() (+216 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (102): Auth, BasicAuth, BearerAuth, DigestAuth, NetRCAuth, Authentication handlers. Auth objects are callables that modify a request befor, Load credentials from ~/.netrc based on the request host., Base class for all authentication handlers. (+94 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (162): _csharp_extra_walk(), extract_blade(), extract_c(), extract_cpp(), extract_csharp(), extract_elixir(), _extract_generic(), extract_java() (+154 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (160): Isa Capabilities (BP/MR/DR/TR/CB/WB/DP/EL/RV), Isa — Business Analyst Persona, Canonical Architectures Principle, LSP Advisor (never auto-install), Alex — System Architect Persona, bundle-assets.mjs build step, CLI scaffold pipeline, graphify usage block (+152 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (125): _git_root(), _hooks_dir(), install(), _install_hook(), Walk up to find .git directory., Return the git hooks directory, respecting core.hooksPath if set (e.g. Husky)., Install a single git hook, appending if an existing hook is present., Remove graphify section from a git hook using start/end markers. (+117 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (100): _detect_url_type(), _download_binary(), _fetch_arxiv(), _fetch_html(), _fetch_tweet(), _fetch_webpage(), _html_to_markdown(), ingest() (+92 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (84): aggregate_results(), calculate_stats(), generate_benchmark(), generate_markdown(), load_run_results(), main(), Aggregate run results into summary statistics.      Returns run_summary with sta, Generate complete benchmark.json from run results. (+76 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (31): BaseSchemaValidator, Base validator with common validation logic for document files., BaseSchemaValidator, clean_unused_files(), get_referenced_files(), get_slide_referenced_files(), get_slides_in_sldidlst(), Remove unreferenced files from an unpacked PPTX directory.  Usage: python clean. (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (87): Superpowers Code Reviewer Agent, Brainstorm companion frame template (HTML/CSS), brainstorm command (deprecated), execute-plan command (deprecated), write-plan command (deprecated), 3+ failed fixes = architectural problem, not failed hypothesis, Authority principle (imperative language, no exceptions), Bite-sized tasks: each step one action, 2-5 minutes, TDD rhythm (+79 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (64): Base, Server, LinearAlgebra, area(), Analyzer, compute_score(), normalize(), Fixture: functions and methods that call each other - for call-graph extraction (+56 more)

### Community 10 - "Community 10"
Cohesion: 0.03
Nodes (83): Azure DevOps adapter (implemented), AZURE_DEVOPS_PAT auth, System.LinkTypes.Dependency-Forward/Reverse, WIQL queries + iteration path, dry-run adapter (safety-net default), No authentication / no network, GitHub Issues adapter (default live v1), gh CLI or GH_TOKEN auth (+75 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (56): checkEnvInteractive(), handlePushAll(), handlePushOne(), handlePushStepByStep(), handleSummary(), handleValidateAll(), handleValidateOne(), main() (+48 more)

### Community 12 - "Community 12"
Cohesion: 0.03
Nodes (82): Post-hoc Analyzer Agent, Blind Comparator Agent, Grader Agent, Eval Review HTML Template, Eval Viewer HTML, 60fps Performance Target, AI Slop Anti-Patterns, With-skill vs Baseline Comparison (+74 more)

### Community 13 - "Community 13"
Cohesion: 0.03
Nodes (78): Browser-MCP pin per AI tool (Playwright), Env-var auth convention (TOOL_TOKEN, TOOL_API_KEY), Never-silent-login rule, OIDC federation for CI (GH Actions -> Azure/AWS/GCP), Cheap read-only probe pattern, Shared access-first reference, Access tiers: CLI > API > Web, Auth-model summary for crystallized skills (+70 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (70): classify_file(), convert_office_file(), count_words(), detect(), detect_incremental(), docx_to_markdown(), extract_pdf_text(), FileType (+62 more)

### Community 15 - "Community 15"
Cohesion: 0.04
Nodes (65): handle_delete(), handle_enrich(), handle_get(), handle_list(), handle_search(), handle_upload(), API module - exposes the document pipeline over HTTP. Thin layer over parser, v, Accept a list of file paths, run the full pipeline on each,     and return a su (+57 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (51): paint(), printBanner(), toPascalCase(), toSnakeCase(), main(), parseArgv(), printHelp(), readVersion() (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (60): Quality Attribute Scenario (QAS), Six Quality Attributes (Perf/Scale/Sec/Avail/Maint/Interop), Quality Attribute Tradeoffs, ATAM-Lite Validator, Isa Capability RV (handoff-only), Phase 1 Classification, Phase 2 Methodology Recommendation, Phase 4 Gap Aggregation (dedup) (+52 more)

### Community 18 - "Community 18"
Cohesion: 0.05
Nodes (52): _body_content(), cache_dir(), cached_files(), check_semantic_cache(), clear_cache(), file_hash(), load_cached(), Return set of file paths that have a valid cache entry (hash still matches). (+44 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (56): Pair vs Solo Workflow Principle, Phase Fingerprinting via Filesystem, Risk Annotation (non-destructive/reversible/destructive), design-md-generator, Stitch 9-Section DESIGN.md Format, AWS EKS Rollout Example, Azure AKS Deploy Example, Five-Phase Ops Flow (+48 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (26): CacheManager, createProcessor(), DataProcessor, Get-Data(), GraphifyDemo, IProcessor, Loggable, NetworkError (+18 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (42): _check_tree_sitter_version(), extract(), extract_go(), extract_js(), extract_rust(), Extract classes, functions, arrow functions, and imports from a .js/.ts/.tsx fil, Extract functions, methods, type declarations, and imports from a .go file., Extract functions, structs, enums, traits, impl methods, and use declarations fr (+34 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (22): _build_user_message(), _chunk_files(), estimate_cost(), _extract_claude(), extract_corpus_parallel(), extract_files_direct(), _extract_openai_compat(), _parse_response() (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.1
Nodes (23): generate_html(), main(), Generate HTML report from loop output data. If auto_refresh is True, adds a meta, _call_claude(), improve_description(), main(), Run `claude -p` with the prompt on stdin and return the text response.      Prom, Call Claude to improve the description based on eval results. (+15 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (31): claude_install(), claude_uninstall(), Write the graphify section to the local CLAUDE.md., Remove graphify PreToolUse hook from .claude/settings.json., Remove the graphify section from the local CLAUDE.md., _uninstall_claude_hook(), Tests for graphify claude install / uninstall commands., claude_install also writes .claude/settings.json with PreToolUse hook. (+23 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (27): _make_graph(), Tests for graphify.wiki — Wikipedia-style article generation., God node with bad ID should not crash., Communities with more than 25 nodes show a truncation notice., test_article_navigation_footer(), test_community_article_has_audit_trail(), test_community_article_has_cross_links(), test_community_article_shows_cohesion() (+19 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (15): fetchAwesomeList(), fetchGithubRepoTree(), fetchJson(), fetchMarketplaceJson(), fetchSource(), fetchText(), ghHeaders(), loadCustomSources() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (27): Six-folder docs hierarchy scaffold (calls, sprints, requirements, architecture, prd, support), docs/architecture/ — single source of truth (multi-repo), 00-index.md — architecture index stub (multi-repo), 01-constraints.md — absolute architectural constraints stub (multi-repo), docs/calls/ — cross-domain meeting notes (multi-repo), docs/prd/ — PRD drafts, arch-brainstorm output (multi-repo), docs/ knowledge base (multi-repo), docs/requirements/ — functional and business requirements (multi-repo) (+19 more)

### Community 28 - "Community 28"
Cohesion: 0.19
Nodes (22): _estimate_tokens(), print_benchmark(), _query_subgraph_tokens(), Token-reduction benchmark - measures how much context graphify saves vs naive fu, Print a human-readable benchmark report., Run BFS from best-matching nodes and return estimated tokens in the subgraph con, Measure token reduction: corpus tokens vs graphify query tokens.      Args:, run_benchmark() (+14 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (16): _can_merge(), _consolidate_text(), _find_elements(), _first_child_run(), _get_child(), _get_children(), _is_adjacent(), _is_run() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (15): test_assert_valid_passes_silently(), test_assert_valid_raises_on_errors(), test_dangling_edge_source(), test_dangling_edge_target(), test_invalid_confidence(), test_invalid_file_type(), test_missing_edges_key(), test_missing_node_field() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.2
Nodes (12): Requirement file is input contract to arch-brainstorm, Extracted Markdown (sibling of PDF) is canonical indexed source, Do not invent acceptance criteria; flag as open points, docs/requirements/<domain>/<feature>.md folder convention, 5-phase flow: COLLECT, EXTRACT, STRUCTURE, WRITE, HANDOFF, 5 signal types: functional, business-rule, UI/UX, out-of-scope, open-question, Source document parking under <domain>/sources/ with dated filenames, Ingestion heuristics (signal taxonomy, dedup, conflict resolution) (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (12): NONoise SDLC Flow Diagram, Codebase Context, Documentation Hierarchy, File of Contents IA, Mode [Pair] - Large Models for Architecture, Mode [Solo] - Small Models for Implementation, Polly: The Conductor, Instant Scaffolding (create-nonoise) (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (7): main(), package_skill(), Check if a path should be excluded from packaging., Package a skill folder into a .skill file.      Args:         skill_path: Path t, should_exclude(), Basic validation of a skill, validate_skill()

### Community 34 - "Community 34"
Cohesion: 0.2
Nodes (11): Conditional Response via run-code, Playwright CLI Request Mocking, Simulate Network Failures (abort), playwright-cli route command, URL Patterns (glob), A/B Testing Sessions Pattern, Concurrent Scraping Pattern, Session Isolation (cookies, storage, cache) (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.53
Nodes (8): _add_to_content_types(), _add_to_presentation_rels(), create_slide_from_layout(), duplicate_slide(), _get_next_slide_id(), get_next_slide_number(), parse_source(), Add a new slide to an unpacked PPTX directory.  Usage: python add_slide.py <unpa

### Community 36 - "Community 36"
Cohesion: 0.58
Nodes (7): buildTargetNames(), cleanSkillsLock(), cleanup(), findProjectRoot(), findSkillsDirs(), isImpeccableSkill(), removeDeprecatedSkills()

### Community 37 - "Community 37"
Cohesion: 0.53
Nodes (7): Clone-Repository(), Get-RepositoryConfiguration(), Write-Err(), Write-Header(), Write-Info(), Write-Success(), Write-Warn()

### Community 38 - "Community 38"
Cohesion: 0.53
Nodes (7): Get-RepositoryConfiguration(), Pull-Repository(), Write-Err(), Write-Header(), Write-Info(), Write-Success(), Write-Warn()

### Community 39 - "Community 39"
Cohesion: 0.53
Nodes (7): Get-RepositoryConfiguration(), Switch-RepositoryBranch(), Write-Err(), Write-Header(), Write-Info(), Write-Success(), Write-Warn()

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (9): Capabilities: UX/DES/UI/CRT/POL/ADA/DLT/ANM/AUD/EL, bmad-agent-ux-designer (Giulia), Giulia — UX Designer + UI Specialist, Integration with Polly (greenfield flow), design-md-generator skill, Bold aesthetic direction (no AI-slop), frontend-design skill, impeccable/* skills (critique/polish/adapt/delight/animate/audit) (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.43
Nodes (8): 1% rule: if any chance a skill applies, invoke it, Instruction priority: user > superpowers > default system, Cross-platform tool name mapping (Read/Write/Edit/Bash/Task -> native), Skill priority order: process skills (brainstorm/debug) before implementation skills, Codex tool mapping reference, Copilot CLI tool mapping reference, Gemini CLI tool mapping reference, Using Superpowers (meta-skill)

### Community 42 - "Community 42"
Cohesion: 0.43
Nodes (6): EventServiceProvider, NotifyAdmins, OrderPlaced, SendWelcomeEmail, ShipOrder, UserRegistered

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (7): Grumpy orange Persian cat mascot, Black over-ear headphones with green signal LED, Palette: white background, orange cat, black headphones, green accent, dark gray text, Flat vector mascot illustration style, Tagline 'pure signal', Wordmark 'NONoise' with 'NO' bold, NONoise Logo (white)

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (4): _escape_smart_quotes(), _pretty_print_xml(), Unpack Office files (DOCX, PPTX, XLSX) for editing.  Extracts the ZIP archive, p, unpack()

### Community 45 - "Community 45"
Cohesion: 0.53
Nodes (2): prompt(), stripQuotes()

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (5): Animal, -initWithName, -speak, Dog, -fetch

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (4): AppServiceProvider, CashierGateway, PaymentGateway, StripeGateway

### Community 48 - "Community 48"
Cohesion: 0.6
Nodes (2): ColorResolver, DefaultPalette

### Community 49 - "Community 49"
Cohesion: 0.6
Nodes (3): waitForEvent(), waitForEventCount(), waitForEventMatch()

### Community 50 - "Community 50"
Cohesion: 0.6
Nodes (5): NONoise multi-repo workspace workflow (clone/switch/pull across repos), repositories.json workspace config (active/inactive sub-repos), clone-all.ps1 (clone every active sub-repo from repositories.json), pull-all.ps1 (fast-forward pull every active sub-repo), switch-branch.ps1 (checkout/create branch across sub-repos)

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (1): Transformer

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (4): q-status — Show FPF status, Hypothesis layers L0/L1/L2, quint_check_decay tool, quint_status tool

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (4): Dry-run default + idempotent work item push via back-written IDs, Feature > User Story > Task hierarchy in Azure DevOps push, Skill: spec-to-workitem (tracker-agnostic bridge, referenced), @nonoise/devops-push (Azure DevOps work item push CLI)

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (4): Headphones Motif, NONoise, Pilu, Cat Mascot with Headphones

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (4): Headphones Motif, NONoise Logo (black), Grumpy Orange Cat Mascot, Tagline: pure signal

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): Merge-preserve-hand-written-entries behavior, vscode-config-generator skill, Stack detection (Node/.NET/Python)

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): Capabilities DP/SYN/REA/WD/MG/VD/EC/PLN/EL, Daniel — Technical Writer persona, bmad-agent-tech-writer (Daniel persona)

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): NONoise BMAD personas (Isa, Alex, Daniel, Giulia), Method registry (CSV) of elicitation techniques, Skill: bmad-advanced-elicitation (structured elicitation methods)

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): Grumpy Orange Cat Wearing Headphones, Noise Cancellation Theme, NONoise Cat Mascot

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): License and attribution (MIT + attribution)

## Knowledge Gaps
- **679 isolated node(s):** `Recursively find directories that contain an outputs/ subdirectory.`, `Build a run dict with prompt, outputs, and grading data.`, `Read a file and return an embedded representation.`, `Load previous iteration's feedback and outputs.      Returns a map of run_id ->`, `Generate the complete standalone HTML page with embedded data.` (+674 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 45`** (6 nodes): `extract.js`, `extract.js`, `prompt()`, `stripQuotes()`, `extract.js`, `extract.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (5 nodes): `sample_php_static_prop.php`, `ColorResolver`, `.accent()`, `.primary()`, `DefaultPalette`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (4 nodes): `sample.py`, `Transformer`, `.forward()`, `.__init__()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `License and attribution (MIT + attribution)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Cookies` connect `Community 1` to `Community 0`, `Community 23`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `find()` connect `Community 18` to `Community 16`, `Community 11`, `Community 6`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `detect()` connect `Community 14` to `Community 0`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 121 inferred relationships involving `str` (e.g. with `get_slides_in_sldidlst()` and `remove_orphaned_slides()`) actually correct?**
  _`str` has 121 INFERRED edges - model-reasoned connections that need verification._
- **Are the 41 inferred relationships involving `Response` (e.g. with `Auth` and `BasicAuth`) actually correct?**
  _`Response` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `Request` (e.g. with `Auth` and `BasicAuth`) actually correct?**
  _`Request` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 37 inferred relationships involving `build_from_json()` (e.g. with `validate_extraction()` and `Graph`) actually correct?**
  _`build_from_json()` has 37 INFERRED edges - model-reasoned connections that need verification._