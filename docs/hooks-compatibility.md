# Hook opzionali: compatibilità e verifiche

Verificato il 16 ottobre 2026 con **Claude Code 2.1.300**, **codex-cli 0.162.1** e **GitHub Copilot CLI 1.0.98** installati nel container. Gli hook sono facoltativi, selezionati dal profilo: `developer` abilita format/typecheck, `security` abilita i cinque controlli di sicurezza, `full` li include tutti.

## Installazione e proprietà

Gli entry point Node `.cjs` e i loro helper locali sono copiati in `.nonoise/hooks/`, insieme alla licenza MIT. Funzionano senza dipendenze npm proprie, runtime ECC, variabili `CLAUDE_PLUGIN_ROOT`, script Bash o configurazioni globali. Il comando del relativo host invoca `node`, risolve il percorso risalendo dalla directory di lavoro e usa solamente nomi di hook consentiti: nomi di directory con spazi o metacaratteri non sono interpolati nella shell. Gli strumenti devono avere Node sul PATH.

`installManagedAssets` mantiene gli hash dei file generati: un upgrade conserva le personalizzazioni. File preesistenti sconosciuti o percorsi con symlink non vengono registrati automaticamente. Il merge conserva impostazioni, permessi e hook dell'utente; JSON non valido, schemi annidati non validi e impostazioni collegate vengono conservati e segnalati. Un cambio profilo rimuove solo le registrazioni NONoise riconosciute esattamente, mantenendo gli script e le registrazioni modificate dall'utente. Un progetto senza hook non riceve nuovi file di configurazione hook.

| Host | File di progetto | Eventi e formato |
|---|---|---|
| Claude Code | `.claude/settings.json` | `hooks.PreToolUse`, `PostToolUse`, `Stop`; gruppi `matcher` + `hooks: [{type: "command", command, timeout}]` |
| Codex 0.162.1 | `.codex/hooks.json` | Stessa struttura di gruppi per `PreToolUse`, `PostToolUse`, `Stop`; nessuna conversione in `notify` |
| Copilot CLI | `.github/hooks/nonoise.json` | `version: 1`; array `preToolUse`, `postToolUse`, `agentStop`; comandi `type`, `bash`, `powershell`, `timeoutSec` |

I campi Copilot `bash` e `powershell` contengono lo stesso comando Node, non script specifici della piattaforma. L'adattatore accetta sia `tool_input` sia `toolArgs` oggetto/stringa JSON. Un controllo neutro restituisce `{}`, lasciando intatti i normali permessi dell'host; non restituisce mai un'approvazione automatica.

## Decisioni e limiti

| Hook | Comportamento NONoise |
|---|---|
| `block-no-verify` | Nega bypass Git: `--no-verify`, alias corti di commit e override `core.hooksPath`; mantiene lo scanner shell a budget limitato upstream. |
| `config-protection` | Nega modifiche a configurazioni linter/formatter esistenti tramite Edit/Write/MultiEdit e patch Codex; consente la creazione iniziale. Sono protetti anche file ignore e varianti di configurazione upstream. |
| `pre-bash-git-push-reminder` | Aggiunge un promemoria su diff, test, remoto e branch; non concede il permesso di push. |
| `mcp-health-check` | Controllo passivo/offline: rileva errori MCP nei risultati e configurazione `.mcp.json` locale non valida; non avvia server, non effettua richieste di rete, non installa pacchetti e non tenta riconnessioni. Non certifica disponibilità o autenticazione del server. Le eccezioni dell'host emesse solo in `PostToolUseFailure` non sono intercettate: la rilevazione riguarda gli errori restituiti nel normale risultato del tool. |
| `post-edit-format` | Esegue solo Prettier/Biome già installati in `node_modules`, tramite Node con argomenti separati e senza shell. Esclude file esterni, symlink, `node_modules`, `.nonoise` e `.git`; segnala errori e strumenti assenti. |
| `stop-format-typecheck` | Formatta i file modificati/non tracciati individuati da Git, esclusi gli asset gestiti; se esiste `tsconfig.json`, esegue TypeScript locale con `--noEmit`. Un errore impedisce la conclusione una volta; `stop_hook_active` evita cicli, senza dichiarare il controllo riuscito. |
| `safety-guard` | Modalità careful: richiede conferma per `rm -rf` e varianti, force push, reset hard, DROP TABLE/DATABASE e Remove-Item ricorsivo/forzato. |

Claude e Copilot ricevono `permissionDecision: "ask"` per careful. **Codex 0.162.1 non supporta `ask` e proseguirebbe l'esecuzione dopo l'errore**: NONoise restituisce quindi `deny`, con istruzione di ottenere conferma e lasciare all'utente l'esecuzione manuale. Non esiste un token di retry che autorizzi automaticamente il comando. In Copilot noninterattivo, `ask` viene negato perché nessuno può confermare.

Input JSON malformato, oltre 1 MiB o incompleto per un comando shell produce un diniego nei controlli preventivi. Errori di caricamento degli helper producono exit 2. Errori post-edit vengono segnalati; errori Stop bloccano la conclusione. Gli script non scaricano strumenti: per formattazione/typecheck occorre installare esplicitamente le dipendenze del progetto. Sono coperti i formatter JS Prettier/Biome e TypeScript al root; altri stack, workspace annidati e strumenti assenti richiedono i normali controlli del progetto. Git non disponibile impedisce la raccolta automatica dei file da formattare a Stop.

Questi controlli sono difese aggiuntive, non una sandbox o un interprete completo di tutte le shell. Alias, programmi generati, espansioni dinamiche e linguaggi diversi possono richiedere review manuale; il controllo config riguarda i tool di modifica e non ogni possibile scrittura via shell. La policy careful è conservativa e può chiedere conferma anche per testo che cita un comando rischioso. Restano attivi i permessi e la sandbox dell'host. I timeout/crash gestiti dall'host possono avere semantiche diverse: in particolare la documentazione Copilot descrive i timeout dei pre-hook come fail-open. Non va promessa enforcement se il processo Node non può essere avviato.

## Trust e prove riproducibili

Prima di affidarsi ai controlli, **approvare il progetto nel relativo host**. Codex richiede anche review/abilitazione degli hook con `/hooks`; nuove registrazioni non equivalgono ad approvazione. Copilot `--allow-all` da solo abilita i tool, ma nella prova non ha caricato hook di un progetto non trusted. Il probe ha usato il trust esplicito documentato `COPILOT_ALLOW_ALL=true` esclusivamente sul progetto temporaneo controllato: non è un'impostazione suggerita per l'uso ordinario.

- Test unitari: esecuzioni reali dei sette script con stdin JSON, decisioni native, JSON malformato/grande, path con spazi/metacaratteri, symlink, formatter locale, typecheck fallito, merge/idempotenza, preservazione e rimozione per profilo. Comando: `pnpm --filter create-nonoise test -- test/unit/hooks.test.ts`.
- Claude: `claude doctor` sul progetto con impostazioni generate, `CLAUDE_CONFIG_DIR` temporanea e traffico non essenziale disabilitato: exit 0, nessun problema di installazione; senza credenziali, nessuna inferenza autenticata. Questa prova valida la lettura della configurazione, non l'interazione con un modello.
- Copilot: endpoint HTTP loopback con risposte sintetiche; progetto con file generato e directory di stato isolata. Il modello sintetico ha richiesto `git commit --no-verify -m probe`: risposta del tool `Denied by preToolUse hook`, con motivo dello scanner NONoise. Un secondo probe con `git reset --hard NONOISE_NONEXISTENT_REF` ha prodotto `Denied by preToolUse hook (unable to ask user for confirmation)`. Entrambe le CLI sono terminate con exit 0; nessun comando distruttivo è stato eseguito.
- Codex: endpoint loopback sintetico, progetto trusted in una directory di configurazione temporanea, sessione effimera e `--dangerously-bypass-hook-trust` **solo per questi script già esaminati**. Il tool nativo `exec_command` ha richiesto lo stesso commit con bypass: risposta `Command blocked by PreToolUse hook`, exit CLI 0. Questo verifica il matcher `Bash` sul tool reale, non solo sul JSON simulato. La normale installazione NONoise non imposta alcun bypass del trust.
- Le prove di esecuzione sono Linux. Il codice e i comandi non dipendono da Bash, espansione di variabili shell, path Unix o wrapper `.cmd`; l'esecuzione nativa Windows/macOS resta da verificare su quelle piattaforme.

I riepiloghi e gli script di replay dei probe sono salvati in `/out/hooks-evidence/`: `claude-doctor.txt`, `copilot-result.json`, `copilot-careful-result.json`, `codex-result.json` e script Python. Il progetto temporaneo, i log completi e i sorgenti Codex fissati sono in `/tmp/nonoise-hook-evidence/`. Nessun endpoint esterno di inferenza e nessuna configurazione globale sono stati usati dai probe.

## Fonti e provenienza

La [documentazione Claude degli hook](https://code.claude.com/docs/en/hooks) definisce registrazione, input e decisioni. La [reference GitHub](https://docs.github.com/en/copilot/reference/hooks-reference) definisce hook di progetto, formati, `ask` e comportamento sui timeout; la [guida Copilot](https://docs.github.com/en/copilot/concepts/agents/hooks) conferma `.github/hooks/*.json`. Il comando locale `copilot help environment` della versione 1.0.98 documenta il trust, `COPILOT_HOME` e il provider offline.

Per Codex sono stati verificati prima CLI/package locali e poi la [documentazione ufficiale](https://learn.chatgpt.com/docs/hooks). La verifica specifica della versione usa il tag **rust-v0.162.1**: [eventi supportati](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/hooks/src/lib.rs), [discovery di hooks.json e trust](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/hooks/src/engine/discovery.rs), [schema input/output](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/hooks/src/schema.rs), [test di deny e ask non supportato](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/hooks/src/events/pre_tool_use.rs), [normalizzazione exec_command a Bash](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core/src/tools/handlers/unified_exec.rs). Lo snapshot ECC `hooks/codex-hooks.json` registra solo SessionStart: questo non rappresenta il limite delle capacità del Codex installato.

Ogni script porta attribuzione, sorgente e commit ECC `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`, MIT © 2026 Affaan Mustafa. `no-verify-policy.cjs`, `shell-scan.cjs` e `config-policy.cjs` conservano le policy upstream; `runtime.cjs` e gli entry point sono adattamenti NONoise. `update-ecc.mjs` conserva questa directory senza rigenerarla: le modifiche a questi adattamenti richiedono review e test espliciti, separatamente dallo snapshot di skill/agenti/regole.
