# 01 — Absolute architectural constraints

> **Stub.** Replace this file's body with the constraints that are non-negotiable in this project. These are the rules `arch-decision` checks during Phase 2 (VERIFY) — if a PRD hypothesis violates one of these, it fails deduction.

## Format

Each constraint is a single imperative bullet. Keep it short. Add a one-line "Why" only if the reason is non-obvious.

## Examples of what belongs here

- **Never store user passwords in cleartext** — always hash with a KDF
- **Always validate input at the API boundary** — do not trust internal callers
- **Never introduce a new runtime without architect approval** — stack bloat is a killer
- **Always emit domain events through the shared event bus** — no direct cross-component writes

## Project constraints

_<populate with your project's own rules>_

- _TBD — add at least one constraint before running `arch-decision` for the first time_
