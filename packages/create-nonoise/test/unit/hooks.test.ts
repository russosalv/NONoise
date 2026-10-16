import { it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const roots: string[] = [];
const temp = () => { const p = mkdtempSync(join(tmpdir(), 'nonoise-hooks-')); roots.push(p); return p; };
afterEach(() => roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
const source = resolve(import.meta.dirname, '../../../skills/vendor/ecc/hooks');
function run(name: string, input: unknown, host = 'claude', cwd = temp()) {
  const result = spawnSync(process.execPath, [join(source, name + '.cjs'), '--host=' + host], { cwd, input: typeof input === 'string' ? input : JSON.stringify({ cwd, ...input as object }), encoding: 'utf8' });
  return { code: result.status, output: result.stdout ? JSON.parse(result.stdout) : {}, stderr: result.stderr };
}
const command = (text: string) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: text } });
it.each(['git commit --no-verify', 'git commit -an', 'git -c core.hooksPath=/dev/null push', 'bash -c "git push --no-verify"'])('blocks hook bypass: %s', cmd => {
  expect(run('block-no-verify', command(cmd)).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('leaves safe commands to ordinary host permissions', () => {
  expect(run('block-no-verify', command('git status')).output).toEqual({});
});
it('fails closed for malformed and oversized security input', () => {
  for (const input of ['{broken', JSON.stringify(command('x'.repeat(1024 * 1024 + 1)))])
    expect(run('block-no-verify', input).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('protects existing linter config but permits initial creation', () => {
  const cwd = temp(), input = { tool_name: 'Edit', tool_input: { file_path: 'eslint.config.js' } };
  expect(run('config-protection', input, 'claude', cwd).output).toEqual({});
  writeFileSync(join(cwd, 'eslint.config.js'), 'rules');
  expect(run('config-protection', input, 'claude', cwd).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('protects config changes and moves in Codex apply_patch', () => {
  const cwd = temp(); writeFileSync(join(cwd, '.prettierignore'), '');
  expect(run('config-protection', { tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: .prettierignore\n+x\n*** End Patch' } }, 'codex', cwd).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('adds a reminder for git push without granting permission', () => {
  const out = run('pre-bash-git-push-reminder', command('git push origin main')).output.hookSpecificOutput;
  expect(out?.additionalContext).toContain('Review'); expect(out?.permissionDecision).toBeUndefined();
});
it.each(['rm -rf build', 'rm -r -f build', 'git push origin main --force', 'git push -f origin main', 'git reset --hard HEAD', 'psql -c "DROP TABLE users"'])('requires confirmation: %s', cmd => {
  expect(run('safety-guard', command(cmd)).output.hookSpecificOutput?.permissionDecision).toBe('ask');
});
it('denies Codex careful commands because ask fails open in 0.162', () => {
  expect(run('safety-guard', command('rm -rf build'), 'codex').output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('adapts Copilot JSON-string arguments and top-level decisions', () => {
  expect(run('safety-guard', { toolName: 'bash', toolArgs: JSON.stringify({ command: 'git reset --hard' }) }, 'copilot').output.permissionDecision).toBe('ask');
});
it('reports MCP failures without executing or reconnecting the server', () => {
  const out = run('mcp-health-check', { hook_event_name: 'PostToolUse', tool_name: 'mcp__demo__read', tool_response: { isError: true, content: [{ text: 'ECONNREFUSED' }] } }).output;
  expect(out.hookSpecificOutput?.additionalContext).toContain('MCP');
});
it('denies malformed project MCP configuration before MCP tool execution', () => {
  const cwd = temp(); writeFileSync(join(cwd, '.mcp.json'), '{broken');
  expect(run('mcp-health-check', { hook_event_name: 'PreToolUse', tool_name: 'mcp__demo__read', tool_input: {} }, 'claude', cwd).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('post-edit formatter uses only installed local Node formatter with literal path arguments', () => {
  const cwd = temp(); mkdirSync(join(cwd, 'node_modules/prettier/bin'), { recursive: true });
  writeFileSync(join(cwd, 'node_modules/prettier/bin/prettier.cjs'), "require('fs').writeFileSync(process.argv.at(-1), 'formatted')");
  writeFileSync(join(cwd, 'file with $ spaces.ts'), 'raw');
  const result = run('post-edit-format', { tool_name: 'Edit', tool_input: { file_path: 'file with $ spaces.ts' } }, 'claude', cwd);
  expect(result.code).toBe(0); expect(readFileSync(join(cwd, 'file with $ spaces.ts'), 'utf8')).toBe('formatted');
});
it('post-edit formatter refuses symlinked/outside paths and reports local tool failures', () => {
  const cwd = temp(), outside = temp(); writeFileSync(join(outside, 'a.ts'), 'raw'); symlinkSync(join(outside, 'a.ts'), join(cwd, 'a.ts'));
  expect(run('post-edit-format', { tool_input: { file_path: 'a.ts' } }, 'claude', cwd).output.hookSpecificOutput?.additionalContext).toContain('outside');
  expect(readFileSync(join(outside, 'a.ts'), 'utf8')).toBe('raw');
});
it('stop typecheck prevents completion on failure and prevents recursive stop loops', () => {
  const cwd = temp(); mkdirSync(join(cwd, 'node_modules/typescript/bin'), { recursive: true });
  writeFileSync(join(cwd, 'tsconfig.json'), '{}'); writeFileSync(join(cwd, 'node_modules/typescript/bin/tsc'), 'process.exit(1)');
  expect(run('stop-format-typecheck', { hook_event_name: 'Stop' }, 'claude', cwd).output.decision).toBe('block');
  expect(run('stop-format-typecheck', { hook_event_name: 'Stop', stop_hook_active: true }, 'claude', cwd).output.decision).toBeUndefined();
});

// Installer tests exercise filesystem merging, executable registrations and user ownership.
import { installHooks, doctorHooks, HOOK_NAMES } from '../../src/hooks.js';
const aiTools = { claudeCode: true, codex: true, copilot: true, cursor: false, geminiCli: false };
const skillsRoot = resolve(import.meta.dirname, '../../../skills');
it('installs executable standalone hooks and merges project host settings idempotently', () => {
  const cwd = temp(); mkdirSync(join(cwd, '.claude'));
  const user = { matcher: 'Bash', hooks: [{ type: 'command', command: 'node user-hook.cjs' }] };
  writeFileSync(join(cwd, '.claude/settings.json'), JSON.stringify({ permissions: { deny: ['Bash(curl *)'] }, hooks: { PreToolUse: [user] } }));
  expect(installHooks(skillsRoot, cwd, aiTools, HOOK_NAMES).written.length).toBeGreaterThan(7);
  const claude = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'));
  expect(claude.permissions.deny).toEqual(['Bash(curl *)']); expect(claude.hooks.PreToolUse).toContainEqual(user);
  const codex = JSON.parse(readFileSync(join(cwd, '.codex/hooks.json'), 'utf8'));
  expect(codex.hooks.PreToolUse.length).toBeGreaterThan(0);
  const copilot = JSON.parse(readFileSync(join(cwd, '.github/hooks/nonoise.json'), 'utf8'));
  expect(copilot.version).toBe(1); expect(copilot.hooks.preToolUse[0].powershell).toContain('node');
  expect(installHooks(skillsRoot, cwd, aiTools, HOOK_NAMES).written).toEqual([]);
  const commandString = claude.hooks.PreToolUse.find((r: any) => r.hooks.some((h: any) => h.command.includes('block-no-verify'))).hooks[0].command;
  mkdirSync(join(cwd, 'nested $ dir'));
  const execution = spawnSync(commandString, { shell: true, cwd: join(cwd, 'nested $ dir'), input: JSON.stringify(command('git commit --no-verify')), encoding: 'utf8' });
  expect(execution.status).toBe(0); expect(JSON.parse(execution.stdout).hookSpecificOutput.permissionDecision).toBe('deny');
  expect(doctorHooks(skillsRoot, cwd, aiTools, HOOK_NAMES).join('\n')).not.toMatch(/missing|unsafe|modified/i);
});
it('profile changes remove only exact managed registrations, retaining user entries and files', () => {
  const cwd = temp(); installHooks(skillsRoot, cwd, aiTools, HOOK_NAMES);
  const p = join(cwd, '.claude/settings.json'), settings = JSON.parse(readFileSync(p, 'utf8'));
  const user = { matcher: 'Edit', hooks: [{ type: 'command', command: 'node my-hook.cjs' }] };
  settings.hooks.PreToolUse.push(user); writeFileSync(p, JSON.stringify(settings));
  installHooks(skillsRoot, cwd, aiTools, []);
  expect(JSON.parse(readFileSync(p, 'utf8')).hooks.PreToolUse).toEqual([user]);
  expect(existsSync(join(cwd, '.nonoise/hooks/safety-guard.cjs'))).toBe(true);
  expect(installHooks(skillsRoot, cwd, aiTools, []).written).toEqual([]);
});
it('does not create any hook files for a fresh project without hooks', () => {
  const cwd = temp(); expect(installHooks(skillsRoot, cwd, aiTools, []).written).toEqual([]);
  expect(existsSync(join(cwd, '.nonoise'))).toBe(false);
});
it('preserves edited scripts and malformed settings and reports them', () => {
  const cwd = temp(); installHooks(skillsRoot, cwd, aiTools, ['safety-guard']);
  writeFileSync(join(cwd, '.nonoise/hooks/safety-guard.cjs'), '// user custom');
  writeFileSync(join(cwd, '.claude/settings.json'), '{broken');
  const result = installHooks(skillsRoot, cwd, aiTools, ['safety-guard']);
  expect(result.preserved).toContain('.nonoise/hooks/safety-guard.cjs'); expect(result.preserved).toContain('.claude/settings.json');
  expect(readFileSync(join(cwd, '.nonoise/hooks/safety-guard.cjs'), 'utf8')).toBe('// user custom');
  expect(doctorHooks(skillsRoot, cwd, aiTools, ['safety-guard']).join('\n')).toMatch(/modified|invalid/i);
});
it('refuses linked settings and nested hook directories without modifying external files', () => {
  const cwd = temp(), outside = temp(); mkdirSync(join(cwd, '.claude')); writeFileSync(join(outside, 'settings.json'), '{}');
  symlinkSync(join(outside, 'settings.json'), join(cwd, '.claude/settings.json'));
  const result = installHooks(skillsRoot, cwd, aiTools, ['safety-guard']); expect(result.preserved).toContain('.claude/settings.json');
  expect(readFileSync(join(outside, 'settings.json'), 'utf8')).toBe('{}');
});
it('does not register unknown or symlinked hook assets for automatic execution', () => {
  const cwd = temp(), outside = temp(); mkdirSync(join(cwd, '.nonoise'));
  symlinkSync(outside, join(cwd, '.nonoise/hooks'));
  installHooks(skillsRoot, cwd, aiTools, ['safety-guard']);
  expect(existsSync(join(cwd, '.claude/settings.json'))).toBe(false);
  const second = temp(); mkdirSync(join(second, '.nonoise/hooks'), { recursive: true });
  writeFileSync(join(second, '.nonoise/hooks/safety-guard.cjs'), '// pre-existing user code');
  installHooks(skillsRoot, second, aiTools, ['safety-guard']);
  expect(existsSync(join(second, '.claude/settings.json'))).toBe(false);
});
it('returns a blocking exit code when its bundled runtime cannot load', () => {
  const cwd = temp(); writeFileSync(join(cwd, 'safety-guard.cjs'), readFileSync(join(source, 'safety-guard.cjs')));
  const result = spawnSync(process.execPath, [join(cwd, 'safety-guard.cjs')], { input: JSON.stringify(command('rm -rf build')), encoding: 'utf8' });
  expect(result.status).toBe(2);
});
it('rejects malformed command arguments instead of treating a security check as successful', () => {
  expect(run('block-no-verify', { tool_name: 'Bash', tool_input: {} }).output.hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('does not rewrite unrelated existing settings when hooks are not selected', () => {
  const cwd = temp(); mkdirSync(join(cwd, '.claude')); const original = '{"model":"example"}';
  writeFileSync(join(cwd, '.claude/settings.json'), original);
  expect(installHooks(skillsRoot, cwd, aiTools, []).written).toEqual([]);
  expect(readFileSync(join(cwd, '.claude/settings.json'), 'utf8')).toBe(original);
});
it('does not feed managed hook assets into stop formatting', () => {
  const cwd = temp(); spawnSync('git', ['init', '-q'], { cwd });
  mkdirSync(join(cwd, '.nonoise/hooks'), { recursive: true }); writeFileSync(join(cwd, '.nonoise/hooks/example.cjs'), 'managed');
  mkdirSync(join(cwd, 'node_modules/prettier/bin'), { recursive: true });
  writeFileSync(join(cwd, 'node_modules/prettier/bin/prettier.cjs'), "for (const p of process.argv.slice(3)) require('fs').writeFileSync(p, 'formatted')");
  const result = run('stop-format-typecheck', { hook_event_name: 'Stop' }, 'claude', cwd);
  expect(result.output.decision).toBeUndefined(); expect(readFileSync(join(cwd, '.nonoise/hooks/example.cjs'), 'utf8')).toBe('managed');
});
it('surfaces formatter failure without emitting a false success decision', () => {
  const cwd = temp(); mkdirSync(join(cwd, 'node_modules/prettier/bin'), { recursive: true });
  writeFileSync(join(cwd, 'a.ts'), 'bad'); writeFileSync(join(cwd, 'node_modules/prettier/bin/prettier.cjs'), 'process.exit(1)');
  expect(run('post-edit-format', { tool_name: 'Edit', tool_input: { file_path: 'a.ts' } }, 'claude', cwd).output.hookSpecificOutput?.additionalContext).toContain('failed');
});
it('preserves invalid nested host schemas instead of rewriting them into seemingly configured hooks', () => {
  const cwd = temp(); mkdirSync(join(cwd, '.claude'));
  const before = '{"hooks":{"PreToolUse":[{"hooks":"not an array"}]}}'; writeFileSync(join(cwd, '.claude/settings.json'), before);
  expect(installHooks(skillsRoot, cwd, aiTools, ['safety-guard']).preserved).toContain('.claude/settings.json');
  expect(readFileSync(join(cwd, '.claude/settings.json'), 'utf8')).toBe(before);
});
it('checks staged files before the initial Git commit', () => {
  const cwd = temp(); spawnSync('git', ['init', '-q'], { cwd }); writeFileSync(join(cwd, 'a.ts'), 'raw'); spawnSync('git', ['add', 'a.ts'], { cwd });
  mkdirSync(join(cwd, 'node_modules/prettier/bin'), { recursive: true });
  writeFileSync(join(cwd, 'node_modules/prettier/bin/prettier.cjs'), "for (const p of process.argv.slice(3)) require('fs').writeFileSync(p, 'formatted')");
  run('stop-format-typecheck', { hook_event_name: 'Stop' }, 'claude', cwd);
  expect(readFileSync(join(cwd, 'a.ts'), 'utf8')).toBe('formatted');
});
it('resolves relative edit paths against session cwd inside the installed project', () => {
  const cwd = temp(); installHooks(skillsRoot, cwd, aiTools, ['config-protection', 'post-edit-format']);
  mkdirSync(join(cwd, 'nested')); writeFileSync(join(cwd, 'nested/eslint.config.js'), 'existing');
  const result = spawnSync(process.execPath, [join(cwd, '.nonoise/hooks/config-protection.cjs')], { cwd: join(cwd, 'nested'), input: JSON.stringify({ cwd: join(cwd, 'nested'), tool_name: 'Edit', tool_input: { file_path: 'eslint.config.js' } }), encoding: 'utf8' });
  expect(JSON.parse(result.stdout).hookSpecificOutput?.permissionDecision).toBe('deny');
});
it('never denies reads or formats a file after a Copilot view tool', () => {
  const cwd = temp(); writeFileSync(join(cwd, 'eslint.config.js'), 'rules'); writeFileSync(join(cwd, 'a.ts'), 'raw');
  mkdirSync(join(cwd, 'node_modules/prettier/bin'), { recursive: true }); writeFileSync(join(cwd, 'node_modules/prettier/bin/prettier.cjs'), "require('fs').writeFileSync(process.argv.at(-1), 'formatted')");
  expect(run('config-protection', { toolName: 'view', toolArgs: JSON.stringify({ path: 'eslint.config.js' }) }, 'copilot', cwd).output).toEqual({});
  expect(run('post-edit-format', { toolName: 'view', toolArgs: JSON.stringify({ path: 'a.ts' }) }, 'copilot', cwd).output).toEqual({});
  expect(readFileSync(join(cwd, 'a.ts'), 'utf8')).toBe('raw');
});
