# Goal 6 — profili, hook e REA

Specifica autorizzata: `/brief/GOAL6.md`; baseline goal 5: f9ef0dc.
Esecuzione senza ulteriori conferme, come richiesto dall'utente.

## Architettura e decisioni

Una tabella `src/profiles.ts` descrive skill native, agenti/regole/skill ECC,
hook e REA. Un resolver combina profilo e stack; scaffold, upgrade e doctor
consumano quel risultato. `core` mantiene il bundle storico e le capacità ECC
comuni; lo stack esplicito continua a selezionare le capacità del goal 5.
`minimal` mantiene Polly e le skill essenziali, senza agenti o hook.
I profili aggiungono capacità senza rimuovere file utente; migrazioni precedenti
restano protette da hash. Il cambio esplicito di profilo disattiva i soli hook
gestiti non più selezionati. REA esplicitamente attivato resta attivo negli upgrade.

Hook: script Node autonomi vendorizzati e adattati da ECC con provenienza;
registrazione per host solamente quando il formato è verificato. Nessun runtime
ECC o shell script. Le conferme distruttive passano dal protocollo dell'host.
REA: configurazione locale idempotente e conservativa, versione 6.5.0 compact,
conflitti segnalati; skill upstream fissata più onboarding NONoise con consenso unico.

Alternative considerate: profili duplicati per host (scartati: divergenza),
profili completamente sostitutivi (scartati: rimozioni inattese in upgrade).

## Sequenza verificabile

- [x] Hook: verificare CLI/schema/fonti ufficiali; test JSON prima dell'implementazione;
  moduli `src/hooks.ts`, asset `skills/vendor/ecc/hooks`, test `unit/hooks.test.ts`.
- [x] REA: test merge/idempotenza/conflitti/HOME prima dell'implementazione;
  `src/rea.ts`, vendor REA, `rea-setup`, reverse-engineering e Polly.
- [x] Compatibilità host: test frontmatter estesi a tutte le skill distribuite e
  agenti convertiti, controllo CI; skill mcp-dependency-review nel manifest ECC.
- [x] Profili: test selezione, CLI e upgrade; `profiles.ts`, tipi, prompt,
  scaffold/upgrade/doctor/ECC; preservare la selezione stack e file legacy.
- [x] Integrare e revisionare prima conformità alla specifica, poi qualità del codice;
  correggere regressioni con test mirati, aggiornare snapshot motivati.
- [x] Release locale 1.8.0: documenti richiesti, template, CHANGELOG unico col goal 5,
  package.json e URL tarball nello stesso commit. Nessuna pubblicazione/tag/push.
- [x] `pnpm test`, `pnpm typecheck`, build e scaffold reali `/projects/p8-*`;
  tutte le combinazioni profilo/host; REA senza mutazioni HOME; npm 1.7.0 upgrade
  e secondo passaggio identico; hook diretti/CLI, npm REA help.
- [x] Rapporto prove con limiti reali; `graphify update .` prima dell'ultimo commit;
  rapporto italiano <=40 righe anche `/out/final6.md` e goal completato.
