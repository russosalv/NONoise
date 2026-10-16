// Adapted for NONoise from affaan-m/everything-claude-code (MIT).
// Upstream commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29.
// Sources: scripts/hooks/{block-no-verify,config-protection,pre-bash-git-push-reminder,
// mcp-health-check,post-edit-format,stop-format-typecheck}.js; skills/safety-guard/SKILL.md.
// NONoise adaptation: bounded JSON, host decisions, project-only files, offline local tools.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const MAX_INPUT = 1024 * 1024;
function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a JSON object');
  let args = input.tool_input ?? input.toolArgs ?? {};
  if (typeof args === 'string') args = JSON.parse(args);
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool arguments');
  return { ...input, tool_name: input.tool_name ?? input.toolName ?? '', tool_input: args };
}
function projectRoot(input) {
  // Installed scripts identify the owning project even when the host starts in a subdirectory.
  return path.basename(path.dirname(__dirname)) === '.nonoise' ? path.dirname(path.dirname(__dirname)) : path.resolve(input.cwd || process.cwd());
}
function changedPaths(input) {
  const args = input.tool_input;
  const values = [args.file_path, args.file, args.path].filter(v => typeof v === 'string');
  if (input.tool_name === 'apply_patch') for (const match of String(args.command || args.patch || '').matchAll(/^\*\*\* (?:Update File|Add File|Delete File|Move to): (.+)$/gm)) values.push(match[1]);
  return [...new Set(values)].map(file => path.resolve(input.cwd || process.cwd(), file));
}
function command(input) {
  const args = input.tool_input;
  if (/^(bash|powershell|shell|exec_command)$/i.test(input.tool_name) && args.command === undefined && args.cmd === undefined) throw new Error('Missing shell command');
  const value = args.command ?? args.cmd ?? '';
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value !== 'string') throw new Error('Invalid command');
  return value;
}
function toolResult(permission, reason) { return { permission, reason }; }
function safeFile(root, name) {
  const full = path.resolve(root, name), relative = path.relative(root, full);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Refusing a file outside the project');
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Refusing a linked file outside project ownership'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return full;
}
function installed(root, candidates) { return candidates.map(p => path.join(root, 'node_modules', p)).find(p => fs.existsSync(p)); }
function runNode(bin, args, root) {
  const child = spawnSync(process.execPath, [bin, ...args], { cwd: root, shell: false, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
  if (child.error || child.status !== 0) throw new Error(`${path.basename(bin)} failed or timed out; run the project check manually for diagnostics`);
}
function format(root, files) {
  const supported = files.filter(name => !/(^|[\\/])(?:node_modules|\.nonoise|\.git)(?:[\\/]|$)/.test(path.relative(root, path.resolve(root, name)))).filter(name => /\.(?:[cm]?[jt]sx?|jsonc?|css|scss|md|ya?ml)$/i.test(name));
  const checked = supported.map(name => safeFile(root, name)).filter(name => fs.existsSync(name));
  if (!checked.length) return '';
  const prettier = installed(root, ['prettier/bin/prettier.cjs', 'prettier/bin/prettier.mjs', 'prettier/bin-prettier.js']);
  const biome = installed(root, ['@biomejs/biome/bin/biome']);
  if (!prettier && !biome) return 'Formatting skipped: no locally installed Prettier or Biome. Install the project dependencies explicitly.';
  runNode(prettier || biome, prettier ? ['--write', ...checked] : ['format', '--write', ...checked], root);
  return '';
}
function evaluate(name, input) {
  const root = projectRoot(input), cmd = command(input);
  if ((name === 'config-protection' || name === 'post-edit-format') && input.tool_name && !/^(edit|write|multiedit|apply_patch|create)$/i.test(input.tool_name)) return {};
  if (name === 'block-no-verify') {
    const result = require('./no-verify-policy.cjs').run(JSON.stringify({ tool_input: { command: cmd } }));
    return result.exitCode === 2 ? toolResult('deny', result.stderr) : {};
  }
  if (name === 'config-protection') {
    for (const file of changedPaths(input)) {
      if (!require('./config-policy.cjs').isProtectedName(path.basename(file.replace(/\\/g, '/')))) continue;
      try { fs.lstatSync(path.resolve(root, file)); }
      catch (error) { if (error.code === 'ENOENT') continue; }
      return toolResult('deny', 'Existing linter/formatter configuration is protected. Fix source code, or have the user make the intended configuration change manually.');
    }
    return {};
  }
  if (name === 'pre-bash-git-push-reminder') return /\bgit(?:\s+-[^\n;]+)?\s+push\b/i.test(cmd) ? { context: 'Review the diff, test results, target remote and branch before pushing. This reminder does not grant push permission.' } : {};
  if (name === 'safety-guard') {
    const normalized = cmd.replace(/\\\r?\n/g, '').replace(/["']/g, '');
    const risky = /\brm\s+(?=[^\n;|&]*\s?--?[^\s]*r)(?=[^\n;|&]*\s?--?[^\s]*f)/i.test(normalized)
      || /\brm\s+[^\n;|&]*(?:--recursive|--force)/i.test(normalized)
      || /\bgit\b[^\n;|&]*\bpush\b[^\n;|&]*(?:--force(?:-with-lease|-if-includes)?\b|\s-[a-z]*f\b)/i.test(normalized)
      || /\bgit\b[^\n;|&]*\breset\b[^\n;|&]*--hard\b/i.test(normalized)
      || /\bDROP\s+(?:TABLE|DATABASE)\b/i.test(normalized)
      || /\bRemove-Item\b[^\n;|&]*-(?:Recurse|Force)\b/i.test(normalized);
    return risky ? toolResult('ask', 'Destructive operation: confirm the exact target and consequences with the user before proceeding. Safer alternatives include a dry run, a backup, or git push --force-with-lease after review.') : {};
  }
  if (name === 'mcp-health-check') {
    if (!/^(mcp__|.*\/)/i.test(input.tool_name)) return {};
    const response = input.tool_response ?? input.toolResult ?? input.tool_result ?? input.error;
    if (response && /"isError"\s*:\s*true|ECONNREFUSED|ENOTFOUND|timed? out|connection (?:failed|lost|closed)|"resultType"\s*:\s*"failure"/i.test(JSON.stringify(response))) return { context: 'MCP tool failure detected. Inspect the server configuration and credentials; ask the user to reconnect if needed. NONoise does not probe, install or restart servers automatically.' };
    const config = path.join(root, '.mcp.json');
    if (fs.existsSync(config)) {
      const parsed = JSON.parse(fs.readFileSync(config, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || !parsed.mcpServers || typeof parsed.mcpServers !== 'object') throw new Error('Invalid project MCP configuration');
      const server = input.tool_name.split('__')[1], entry = parsed.mcpServers[server];
      if (entry && (!entry.command && !entry.url)) throw new Error('MCP server requires a command or URL');
    }
    return {};
  }
  if (name === 'post-edit-format') return { context: format(root, changedPaths(input)) };
  if (name === 'stop-format-typecheck') {
    if (input.stop_hook_active || input.stopHookActive) return { context: 'Stop checks already requested corrections. Run them manually before claiming success.' };
    const files = [];
    for (const args of [['diff', '--name-only', '-z'], ['diff', '--cached', '--name-only', '-z'], ['ls-files', '--others', '--exclude-standard', '-z']]) {
      const git = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024, shell: false });
      if (git.status === 0) files.push(...git.stdout.split('\0').filter(Boolean));
    }
    const context = format(root, [...new Set(files)]);
    if (fs.existsSync(path.join(root, 'tsconfig.json'))) {
      const tsc = installed(root, ['typescript/bin/tsc']);
      if (!tsc) throw new Error('Typecheck unavailable: install local TypeScript explicitly and run the project check');
      runNode(tsc, ['--noEmit', '--pretty', 'false', '--project', path.join(root, 'tsconfig.json')], root);
    }
    return { context };
  }
  throw new Error('Unknown hook');
}
function encode(result, host, event) {
  if (result.block) return { decision: 'block', reason: result.reason };
  if (result.permission) {
    let permission = result.permission, reason = result.reason;
    if (host === 'codex' && permission === 'ask') {
      permission = 'deny'; reason += ' Codex 0.162 does not support hook confirmation prompts. After explicit confirmation, the user must run this command manually; the hook never auto-approves a retry.';
    }
    const fields = { permissionDecision: permission, permissionDecisionReason: reason };
    return host === 'copilot' ? fields : { hookSpecificOutput: { hookEventName: 'PreToolUse', ...fields } };
  }
  if (result.context) {
    if (host === 'copilot') return { additionalContext: result.context };
    if (event === 'Stop') return { systemMessage: result.context };
    return { hookSpecificOutput: { hookEventName: event, additionalContext: result.context } };
  }
  return {};
}
function main(name) {
  const host = process.argv.find(v => v.startsWith('--host='))?.slice(7) || 'claude';
  let event = name === 'stop-format-typecheck' ? 'Stop' : name === 'post-edit-format' ? 'PostToolUse' : 'PreToolUse';
  let raw = '', bytes = 0, oversized = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { bytes += Buffer.byteLength(chunk); if (bytes > MAX_INPUT) oversized = true; else raw += chunk; });
  process.stdin.on('end', () => {
    let result;
    try {
      if (oversized) throw new Error('Hook JSON exceeds 1 MiB');
      const input = normalize(JSON.parse(raw));
      event = input.hook_event_name || (process.argv.includes('--event=PostToolUse') ? 'PostToolUse' : event);
      result = evaluate(name, input);
    } catch (error) {
      const reason = `NONoise ${name}: ${error.message}. No successful check is claimed.`;
      result = event === 'Stop' ? { block: true, reason } : event === 'PreToolUse' ? toolResult('deny', reason) : { context: reason };
    }
    process.stdout.write(JSON.stringify(encode(result, host, event)) + '\n');
  });
  process.stdin.on('error', () => { process.stderr.write('NONoise hook input failed; refusing operation.\n'); process.exitCode = 2; });
}
module.exports = { main };
