// Adapted for NONoise from affaan-m/everything-claude-code (MIT).
// Upstream commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29.
// Source: scripts/hooks/stop-format-typecheck.js; standalone Node host adapter.
'use strict';
try { require('./runtime.cjs').main('stop-format-typecheck'); } catch {
  process.stderr.write('NONoise hook runtime failed to load; refusing operation.\n');
  process.exitCode = 2;
}
