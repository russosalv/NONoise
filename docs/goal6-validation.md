# Goal 6 — prove della release locale 1.8.0

Data: 2026-10-16. Branch `feat/ecc-agents-rules`, baseline goal 5 `f9ef0dc`.
Specifica `/brief/GOAL6.md`; nessun push, tag o publish. `/ecc` e `/rea` invariati.

## Implementazione

Una [tabella dichiarativa](install-profiles.md) guida scaffold, upgrade e doctor;
`--profile` è persistito e si combina con `--stack`. Le prove della migrazione
hanno rivelato che npm 1.7.0 include ancora `codex-delegate`: la compatibilità
legacy ora rinvia anche la pulizia dei file ritirati, oltre a mantenere tutte le
capacità ECC precedenti. Solo un cambio profilo esplicito consente la migrazione
standard protetta da hash. Modifiche utente e istruzioni esterne ai blocchi gestiti
restano preservate.

Gli hook e REA sono moduli separati, usati dal resolver dei profili. I test di
regressione coprono anche impostazioni Claude preesistenti, symlink, tool di sola
lettura Copilot, percorsi relativi annidati e Git senza primo commit. Una revisione
indipendente ha riprodotto i difetti, poi verificato le correzioni.

## Prove automatiche

- `pnpm typecheck`: exit 0.
- `pnpm build`: exit 0.
- `pnpm test`: **315 test passati in 28 file**; include 37 test hook, profili,
  upgrade, REA e compatibilità frontmatter/agent dei tre host.
- Snapshot aggiornati: core usa la nuova selezione di agenti/skill, nuovi campi
  config, istruzioni sui profili/REA e versioni 1.8.0; rimozioni nello snapshot
  riguardano gli scaffold nuovi, non gli upgrade legacy.
- `node scripts/update-ecc.mjs /ecc b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 --check`:
  exit 0; la directory degli hook adattati viene preservata dall'updater.
- `pnpm pack --pack-destination /out/goal6`: tarball 1.8.0 creato; verificati
  moduli compilati, hook, vendor REA, skill nuove e dipendenza TOML fissata.

## Scaffold e upgrade reali

Ogni riga usa **Claude Code + Codex + Copilot CLI**, `--stack dotnet,angular`,
`--vendor-mode embed`; tutti i comandi hanno exit 0. I sei progetti sono stati
aggiornati una volta ancora dopo le correzioni finali degli hook.

| Progetto | Profilo | Verifica |
|---|---|---|
| `/projects/p8-minimal` | minimal | Cinque skill, nessun agente/hook/runtime esterno |
| `/projects/p8-core` | core | Bundle, agenti comuni e stack, nessun hook NONoise |
| `/projects/p8-developer` | developer | Due hook format/typecheck |
| `/projects/p8-security` | security | Cinque hook di sicurezza, reviewer e mcp-dependency-review |
| `/projects/p8-brownfield` | brownfield | Skill legacy, spec-miner e REA |
| `/projects/p8-full` | full | Dieci agenti, sedici skill ECC, sette hook e REA; Git e Haft inizializzati |

I progetti non-full usano `--no-git`: Haft segnala correttamente il prerequisito
mancante. Full ha `.haft/project.yaml`, carrier MCP e skill; `haft spec status
--json` risponde, senza affermare readiness dei workflow. Copilot richiede trust
prima di mostrare i server locali: doctor lo indica come discovery non verificata.

`/projects/p8-upgrade17-final` nasce da `npx --yes create-nonoise@1.7.0`, senza
profilo. Upgrade locale 1.8.0: **340 → 496 file, zero rimozioni**, `core` con
compatibilità legacy, note utente conservate; secondo upgrade **zero differenze
nei byte**. La prima prova `/projects/p8-upgrade17` ha riprodotto la rimozione
indesiderata del file ritirato, poi corretta e verificata sulla nuova prova pulita.

## REA e HOME

`/projects/p8-with-rea`: CLI reale minimal `--with-rea`, tre host, poi due upgrade.
Registrazioni locali corrette, skill installata, secondo upgrade senza differenze
nei byte. Confronto SHA-256, modo e mtime di **15.356 file/link** in `/home/lab`:
nessuna modifica alle configurazioni globali; cinque differenze riguardano soltanto
il rollout e i file SQLite WAL/SHM scritti dalla sessione Codex che esegue la prova.
Non si attribuiscono questi file al comando REA, né si dichiara immutata tutta HOME.

Controllo isolato `/projects/p8-rea-isolated-home`: HOME temporanea con sentinelle
`.claude`, `.codex`, `.copilot`; stesso scaffold reale: **zero file creati/modificati
in HOME**. Nessun `rea setup`. La registrazione non lancia npm/REA; è il client
MCP ad avviare il pacchetto. `npx -y rea-agents@6.5.0 --help` è riuscito con Node
22.23.3 e cache/HOME temporanee: vedere [REA](rea-integration.md).

## Hook e limiti verificati

[Prove e fonti](hooks-compatibility.md): Claude 2.1.300 accetta il settings JSON;
Codex 0.162.1 e Copilot 1.0.98, con provider loopback senza credenziali esterne,
bloccano realmente `git commit --no-verify`. Copilot careful nega in modalità
headless; Codex non supporta `ask`, quindi NONoise nega e richiede esecuzione
manuale dopo conferma. Fiducia nel progetto/approvazione degli hook restano
necessarie. Nessun bypass viene aggiunto alla configurazione generata.

Il codice è Node e il comando è identico Bash/PowerShell; macOS e Windows nativi
non sono disponibili in questo container. MCP health è passivo sui risultati
normali; formatter/typecheck richiedono Prettier/Biome/TypeScript locali al root.
REA `--help` non prova tutti i 172 tool o i motori opzionali. Nessuna inferenza con
credenziali reali è stata eseguita.

Log e inventari: `/out/goal6/`; replay dei probe hook: `/out/hooks-evidence/`.

`graphify update .` eseguito prima del commit finale, exit 0: 9.303 nodi,
16.253 archi, 690 comunità. Avvisi: parser SQL opzionale assente, fixture Luau
preesistente con errore sintattico e file senza simboli modellati. Nessuna chiave
API o estrazione semantica esterna utilizzata.

Commit funzionali: `a345cc8` (compatibilità host/MCP review), `3dc13fd` (REA),
`96ab5e9` (hook), `c15a36f` (profili/CLI/release). Piano: `bb955e8`.
