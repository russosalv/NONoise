import { CAT_COLOR, CAT_MONO, CAT_WIDTH } from './cat-ascii.js';

const ORANGE = '\x1b[38;5;208m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const USE_COLOR = process.stdout.isTTY && process.env.NO_COLOR == null;

function paint(s: string, ...codes: string[]): string {
  if (!USE_COLOR) return s;
  return codes.join('') + s + RESET;
}

const TITLE: readonly string[] = [
  '  ███╗   ██╗  ██████╗  ███╗   ██╗  ██████╗  ██╗ ███████╗ ███████╗',
  '  ████╗  ██║ ██╔═══██╗ ████╗  ██║ ██╔═══██╗ ██║ ██╔════╝ ██╔════╝',
  '  ██╔██╗ ██║ ██║   ██║ ██╔██╗ ██║ ██║   ██║ ██║ ███████╗ █████╗  ',
  '  ██║╚██╗██║ ██║   ██║ ██║╚██╗██║ ██║   ██║ ██║ ╚════██║ ██╔══╝  ',
  '  ██║ ╚████║ ╚██████╔╝ ██║ ╚████║ ╚██████╔╝ ██║ ███████║ ███████╗',
  '  ╚═╝  ╚═══╝  ╚═════╝  ╚═╝  ╚═══╝  ╚═════╝  ╚═╝ ╚══════╝ ╚══════╝',
];

const TAGLINE = '          SDLC bootstrapper  ·  zero noise, all skills';

/**
 * Compose the cat logo on the left with the NONoise wordmark on the right,
 * padding so alignment stays clean even when the two arrays differ in height.
 * CAT_COLOR contains embedded ANSI escapes; its printed width is still
 * CAT_WIDTH visible columns.
 */
function composeBanner(): string[] {
  const catLines = USE_COLOR ? CAT_COLOR : CAT_MONO;
  const titleLines = USE_COLOR ? TITLE.map((l) => paint(l, BOLD, ORANGE)) : TITLE;
  const rows = Math.max(catLines.length, titleLines.length);
  const blankCat = ' '.repeat(CAT_WIDTH);
  const gap = '  ';
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const left = catLines[i] ?? blankCat;
    const right = titleLines[i] ?? '';
    out.push(left + gap + right);
  }
  return out;
}

export function printBanner(): void {
  const body = composeBanner().join('\n');
  const tag = paint(TAGLINE, DIM);
  process.stdout.write('\n' + body + '\n' + tag + '\n\n');
}
