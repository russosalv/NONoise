Rapporto GOAL2 — 15 ottobre 2026, branch `feat/native-vendor-install`.
1. Claude installa durante scaffold/upgrade i plugin con `--scope project`, verifica il registro JSON e conserva le dichiarazioni; assenze/errori producono comandi di recupero senza bloccare.
2. Installer npx/plugin/uv: massimo tre tentativi, attese 1s/2s, solo DNS/timeout/connessione/HTTP 5xx; errori permanenti restituiti subito, inclusi quelli di risoluzione dei plugin.
3. `example-skills` rimosso da dichiarazioni e installazioni del progetto; scelto [skill-creator ufficiale](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator), verificato con una sola skill; `document-skills` resta.
4. `node scripts/sync-vendor.mjs --all`: eseguito realmente, cinque vendor aggiornati; impeccable embed unico; conservati tutti gli hash storici e rimossi i vecchi 18 alberi anche nell’upgrade embed.
Decisione: pin nativo Superpowers 5.0.7 invariato; embed aggiornato a 7.0.0. Tutti i sette riferimenti NONoise esistono in entrambe le versioni. Runtime graphify fissato a 0.9.91.
PASS `pnpm install`; `pnpm --filter create-nonoise run build`; `pnpm -r run typecheck`; `pnpm -r run test`: 163 test, 14 file, nessun test saltato.
PASS `npm pack --pack-destination /tmp/goal2-evidence` da `packages/create-nonoise`; `npm install -g /tmp/goal2-evidence/create-nonoise-1.7.0.tgz`.
PASS da `/projects`: `create-nonoise p2-claude --yes --ai claude-code --no-git`.
PASS `create-nonoise p2-copilot --yes --ai copilot --no-git`.
PASS `create-nonoise p2-all --yes --ai claude-code,copilot,codex --no-git`.
PASS `create-nonoise p2-embed --yes --ai claude-code,copilot,codex --no-git --vendor-mode embed`: impeccable unico e copie confrontate con upstream sincronizzato.
PASS `claude plugin list` e `claude plugin list --json` nei progetti Claude: superpowers, document-skills, skill-creator installati nello scope del progetto; example-skills assente da quello scope.
PASS `copilot plugin list --json`, `codex plugin list --json`; `create-nonoise doctor /projects/PROGETTO` per i quattro scaffold e i tre progetti migrati, tutto presente e nessuna modifica ai file.
PASS `PATH=/tmp/goal2-evidence/shims:/home/lab/.npm-global/bin:/home/lab/.local/bin:$PATH create-nonoise p2-retry-final --yes --ai copilot --no-git`: DNS simulato al primo tentativo, vero npx riuscito al secondo.
PASS `npx --yes create-nonoise@1.6.0 p2-legacy --yes --ai claude-code,copilot,codex --no-git`; `create-nonoise --upgrade /projects/p2-legacy` due volte: 91 file riconosciuti rimossi, contenuti personali conservati, 359 file identici al secondo giro.
PASS `create-nonoise --upgrade /projects/p2-before17` due volte: progetto creato col CLI 1.7.0 precedente alla correzione, example-skills dichiarato e installato come fixture; rimosso, 209 file identici al secondo giro.
PASS aggiuntivo `create-nonoise --upgrade --vendor-mode embed /projects/p2-legacy-embed`: rimossi i 18 alberi storici, una sola skill impeccable.
PASS `node scripts/sync-graphify-platform-skills.mjs`; `node scripts/update-vendor-hashes.mjs` (idempotente); `claude plugin validate /work`; `graphify update .`.
Fixture Git: `git config --global --add url.file:///work.insteadOf https://github.com/russosalv/NONoise` e variante `.git`; il marketplace NONoise è locale, non pubblicato.
Riparata fixture Codex preesistente con `codex plugin marketplace remove superpowers-marketplace`: errore iniziale esatto `superpowers-marketplace at /tmp/superpowers-marketplace: marketplace root does not contain a supported manifest`; tutte le prove ripetute con successo.
Commit `564c20e` — fix: install Claude plugins and retry transient vendor failures.
Commit `d932c5a` — fix: refresh embedded vendors and preserve legacy migration hashes.
Commit `5ff4620` — fix: clean legacy embed layouts and reject permanent retry errors.
Commit `8f0120f` — fix: recognize Git and HTTP server errors in vendor retries.
Commit `2219aa6` — chore: refresh graphify index after goal2 corrections.
Revisione indipendente completata; difetti corretti con test RED→GREEN. Avvisi non bloccanti: autore plugin facoltativo, `tree_sitter_sql not installed`, fixture Luau; whitespace upstream conservato.
Nessuna prova richiesta non verificata. Nessun push, publish o tag; resta da pubblicare il marketplace remoto in una futura release autorizzata.
Log, inventari SHA-256 e harness eseguibile: `/tmp/goal2-evidence/` (`run-e2e.py`, `e2e-final.log`, `tests-final.log`, `e2e-results.json`).
