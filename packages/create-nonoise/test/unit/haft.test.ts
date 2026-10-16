import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ensureHaft, installHaft, haftAsset, HAFT_VERSION, HAFT_SKILLS, configureCopilotHaft, doctorHaft, haftMissing } from '../../src/haft.js';
import { migrateQuint } from '../../src/quint-migration.js';
import { replaceManagedBlock } from '../../src/managed-block.js';

vi.mock('node:child_process', async importOriginal => ({ ...await importOriginal<typeof import('node:child_process')>(), execFileSync: vi.fn() }));
const exec = vi.mocked(execFileSync);
let root: string, server: Server | undefined;
const ai = { claudeCode: true, copilot: true, codex: true, cursor: false, geminiCli: false };
function put(path: string, text: string | Buffer) { const dest = join(root, path); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text); }
function carriers(flags: string[]) {
  put('.haft/project.yaml', 'id: qnt_fixture\n');
  for (const [flag, dir] of [['--claude', '.claude'], ['--codex', '.agents'], ['--agents', '.agents']]) {
    if (!flags.includes(flag!)) continue;
    for (const skill of HAFT_SKILLS) put(`${dir}/skills/${skill}/SKILL.md`, `# ${skill}\n`);
  }
  if (flags.includes('--claude')) {
    put('.mcp.json', JSON.stringify({ mcpServers: { haft: { command: 'haft', args: ['serve'] }, user: { command: 'personal' } } }));
    put('CLAUDE.md', 'user prose\n<!-- nonoise:begin v1 -->\nold\n<!-- nonoise:end -->\n<!-- haft:start -->\nHaft rules\n<!-- haft:end -->\n');
  }
  if (flags.includes('--codex')) {
    put('.codex/config.toml', '[mcp_servers.haft]\ncommand = "haft"\nargs = ["serve"]\n\n[mcp_servers.haft.env]\nHAFT_PROJECT_ROOT = "."\n');
    put('AGENTS.md', 'user prose\n<!-- haft:start -->\nHaft rules\n<!-- haft:end -->\n');
  }
}
function runtime() {
  exec.mockImplementation(((bin: string, args: string[]) => {
    if (args[0] === '--version') return `haft version ${HAFT_VERSION}`;
    if (bin === 'copilot') return '{"haft":{"command":"haft","args":["serve"]}}';
    if (bin === 'git') return args.includes('--show-toplevel') ? root : 'abcdef';
    if (args[0] === 'init') { carriers(args); return 'initialized'; }
    if (args[0] === 'spec') return '{"workflow":{"state":"needs_profile"},"health":{}}';
    throw new Error(`Unexpected ${bin} ${args}`);
  }) as typeof execFileSync);
}
async function serve(handler: Parameters<typeof createServer>[0]) {
  server = createServer(handler);
  await new Promise<void>(r => server!.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as {port:number}).port}`;
}
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'haft-test-')); exec.mockReset(); });
afterEach(async () => { if (server) { server.closeAllConnections(); await new Promise<void>(r => server!.close(() => r())); server = undefined; } rmSync(root, {recursive:true,force:true}); vi.unstubAllEnvs(); });

describe('verified machine installation', () => {
  it('downloads from a local server, retries 503, verifies checksum, installs atomically and reuses pinned binary', async () => {
    const real = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    put('payload/haft', `#!/bin/sh\necho "haft version ${HAFT_VERSION}"\n`);
    const archive = join(root, 'release.tar.gz'); real.execFileSync('tar', ['-czf', archive, '-C', join(root, 'payload'), 'haft']);
    const bytes = readFileSync(archive), sum = createHash('sha256').update(bytes).digest('hex');
    let downloads = 0, checks = 0;
    const baseUrl = await serve((_req, res) => {
      if (_req.url === '/checksums.txt') { checks++; if (checks === 1) { res.writeHead(503); res.end('retry'); } else res.end(`${sum}  haft-linux-amd64.tar.gz\n`); }
      else { downloads++; res.end(bytes); }
    });
    exec.mockImplementation(((bin: string, args: string[], options: object) => {
      if (bin === 'haft') throw new Error('not in PATH');
      return real.execFileSync(bin, args, options);
    }) as typeof execFileSync);
    vi.stubEnv('PATH', process.env.PATH!);
    const opts = { home: root, platform: 'linux' as const, arch: 'x64', baseUrl, retryDelay: 0 };
    expect(await ensureHaft(root, opts)).toBe(join(root, '.local/bin/haft'));
    expect(await ensureHaft(root, opts)).toBe(join(root, '.local/bin/haft'));
    expect(checks).toBe(2); expect(downloads).toBe(1);
    expect(real.execFileSync(join(root, '.local/bin/haft'), ['--version'], {encoding:'utf8'})).toContain(HAFT_VERSION);
  });
  it('rejects a bad checksum before extraction and preserves the existing binary', async () => {
    exec.mockImplementation(() => { throw new Error('old version'); });
    put('.local/bin/haft', 'previous binary');
    const baseUrl = await serve((req, res) => res.end(req.url === '/checksums.txt' ? `${'0'.repeat(64)}  haft-linux-amd64.tar.gz\n` : 'bad archive'));
    const result = await installHaft(root, ai, {home:root, platform:'linux', arch:'x64', baseUrl});
    expect(result.ok).toBe(false); expect(result.output).toContain('SHA256 mismatch'); expect(result.output).toContain('create-nonoise --upgrade');
    expect(readFileSync(join(root,'.local/bin/haft'),'utf8')).toBe('previous binary');
    expect(exec.mock.calls.some(([bin]) => bin === 'tar')).toBe(false);
  });
  it('does not retry permanent HTTP failures', async () => {
    exec.mockImplementation(() => { throw new Error('missing'); }); let requests = 0;
    const baseUrl = await serve((_req,res) => { requests++; res.writeHead(404); res.end(); });
    await expect(ensureHaft(root,{home:root,baseUrl,platform:'linux',arch:'x64',retryDelay:0})).rejects.toThrow('HTTP 404');
    expect(requests).toBe(1);
  });
  it('rejects Windows before executing or downloading; reports WSL', async () => {
    const result = await installHaft(root,ai,{platform:'win32'});
    expect(result.output).toContain('WSL'); expect(result.ok).toBe(false); expect(exec).not.toHaveBeenCalled();
    expect(doctorHaft(root,ai,{platform:'win32'}).join('\n')).toContain('WSL');
  });
  it('supports only the release platform matrix', () => {
    expect(haftAsset('linux','x64')).toBe('haft-linux-amd64.tar.gz');
    expect(haftAsset('linux','arm64')).toBe('haft-linux-arm64.tar.gz');
    expect(haftAsset('darwin','arm64')).toBe('haft-darwin-arm64.tar.gz');
    expect(haftAsset('darwin','x64')).toBeUndefined();
  });
});

describe('project integration and doctor', () => {
  it.each([
    [{...ai,copilot:false,codex:false}, ['init','--local','--claude']],
    [{...ai,claudeCode:false,copilot:false}, ['init','--local','--codex']],
    [{...ai,claudeCode:false,codex:false}, ['init','--local','--agents']],
    [ai, ['init','--local','--claude','--codex']],
  ])('uses explicit harness flags and reuses the initialized project', async (selected, flags) => {
    runtime();
    expect((await installHaft(root,selected)).ok).toBe(true);
    expect(exec.mock.calls.find(([,args]) => args?.[0] === 'init')?.[1]).toEqual(flags);
    expect(haftMissing(root,selected)).toEqual([]);
    const receipt = readFileSync(join(root,'.nonoise/haft.json'),'utf8');
    expect((await installHaft(root,selected)).ok).toBe(true);
    expect(exec.mock.calls.filter(([,args]) => args?.[0] === 'init')).toHaveLength(1);
    expect(readFileSync(join(root,'.nonoise/haft.json'),'utf8')).toBe(receipt);
  });
  it('does not commit or initialize Git during recovery', async () => {
    runtime(); const impl=exec.getMockImplementation()!;
    exec.mockImplementation(((bin:string,args:string[],opts:object) => { if(bin==='git') throw new Error('no commit'); return impl(bin,args,opts); }) as typeof execFileSync);
    const result=await installHaft(root,ai);
    expect(result.output).toContain('git commit'); expect(result.ok).toBe(false);
    expect(exec.mock.calls.some(([,args]) => args?.[0] === 'init' || args?.[0] === 'commit')).toBe(false);
  });
  it('shields unknown .quint data from upstream auto-migration, including failed init', async () => {
    runtime(); const impl=exec.getMockImplementation()!; put('.quint/user.md','user data');
    let fail=false;
    exec.mockImplementation(((bin:string,args:string[],opts:object) => {
      if(args[0]==='init') { expect(existsSync(join(root,'.quint'))).toBe(false); if(fail) throw new Error('upstream rejected init'); }
      return impl(bin,args,opts);
    }) as typeof execFileSync);
    expect((await installHaft(root,ai)).ok).toBe(true);
    expect(readFileSync(join(root,'.quint/user.md'),'utf8')).toBe('user data');
    fail=true; rmSync(join(root,'.nonoise/haft.json'));
    expect((await installHaft(root,ai)).ok).toBe(false);
    expect(readFileSync(join(root,'.quint/user.md'),'utf8')).toBe('user data');
  });
  it('does not create a Copilot entry after an upstream no-op without project state', async () => {
    runtime(); const impl=exec.getMockImplementation()!;
    exec.mockImplementation(((bin:string,args:string[],opts:object) => args[0]==='init' ? 'retry_required' : impl(bin,args,opts)) as typeof execFileSync);
    const result=await installHaft(root,ai);
    expect(result.ok).toBe(false);expect(result.output).toContain('retry_required');
    expect(existsSync(join(root,'.mcp.json'))).toBe(false);
  });
  it('preserves other MCP servers and refuses a conflicting haft entry', () => {
    put('.mcp.json', '{"mcpServers":{"user":{"command":"personal"}}}'); configureCopilotHaft(root);
    expect(JSON.parse(readFileSync(join(root,'.mcp.json'),'utf8')).mcpServers.user.command).toBe('personal');
    const conflict='{"mcpServers":{"haft":{"command":"custom"}}}';put('.mcp.json',conflict);
    expect(() => configureCopilotHaft(root)).toThrow('preserved'); expect(readFileSync(join(root,'.mcp.json'),'utf8')).toBe(conflict);
  });
  it('keeps Haft, NONoise and user instruction text stable across two refreshes', async () => {
    runtime(); await installHaft(root,ai);
    const before=readFileSync(join(root,'CLAUDE.md'),'utf8');
    const generated='<!-- nonoise:begin v2 -->\nnew\n<!-- nonoise:end -->';
    const once=replaceManagedBlock(before,generated);put('CLAUDE.md',once);await installHaft(root,ai);
    expect(replaceManagedBlock(once,generated)).toBe(once);
    expect(readFileSync(join(root,'CLAUDE.md'),'utf8')).toBe(once);
    expect(once).toContain('user prose');expect(once).toContain('<!-- haft:start -->\nHaft rules\n<!-- haft:end -->');
  });
  it('reports exact recovery, missing skill/config and read-only status without initializing', () => {
    runtime();carriers(['--claude','--codex']);rmSync(join(root,'.agents/skills/h-compare/SKILL.md'));
    put('.mcp.json','{"mcpServers":{"haft":{"command":"wrong","args":["serve"]}}}');
    const before=readFileSync(join(root,'.codex/config.toml'),'utf8');
    const output=doctorHaft(root,ai).join('\n');
    expect(output).toContain(`expected ${HAFT_VERSION}`);expect(output).toContain('h-compare/SKILL.md');expect(output).toContain('.mcp.json: haft server missing/invalid');expect(output).toContain('create-nonoise --upgrade');expect(output).toContain('haft spec status --json: OK');
    expect(readFileSync(join(root,'.codex/config.toml'),'utf8')).toBe(before);
    expect(exec.mock.calls.every(([bin,args]) => bin === 'git' ? args?.[0] === 'rev-parse' : bin === 'copilot' ? args?.join(' ') === 'mcp get haft --json' : args?.[0] === '--version' || args?.join(' ') === 'spec status --json')).toBe(true);
    expect(output).toContain('Copilot haft discovery: visible');
  });
});

describe('conservative Quint migration', () => {
  it('removes known copies only, preserves edited commands, ledgers and audit records, and is idempotent', async () => {
    const known=readFileSync(resolve('test/fixtures/legacy-quint/q0-init.md'));
    put('.claude/skills/quint-fpf/commands/q0-init.md',known);put('.claude/commands/q0-init.md',known);
    put('.claude/commands/q1-add.md','user edits');put('.quint/context.md','user ledger');put('docs/prd/test/audit/01-test-fpf/05-decision.md','historic data');
    const first=await migrateQuint(root);
    expect(first.removed).toHaveLength(2);expect(first.preserved).toContain('.claude/commands/q1-add.md');
    expect(readFileSync(join(root,'.quint/context.md'),'utf8')).toBe('user ledger');
    expect(readFileSync(join(root,'docs/prd/test/audit/01-test-fpf/05-decision.md'),'utf8')).toBe('historic data');
    expect((await migrateQuint(root)).removed).toEqual([]);
  });
  it('never traverses a symlink ancestor or removes unknown empty .quint', async () => {
    put('external/commands/q0-init.md',readFileSync(resolve('test/fixtures/legacy-quint/q0-init.md')));
    symlinkSync(join(root,'external'),join(root,'.claude'),'dir');mkdirSync(join(root,'.quint'));
    expect((await migrateQuint(root)).removed).toEqual([]);
    expect(existsSync(join(root,'external/commands/q0-init.md'))).toBe(true);expect(existsSync(join(root,'.quint'))).toBe(true);
  });
});
