import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('apps/web/src/app/globals.css'), 'utf8');
const darkBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1];
const lightBlock = css.match(/\.light\s*\{([\s\S]*?)\n\}/)?.[1];
if (!darkBlock || !lightBlock) throw new Error('Could not find both theme token blocks in globals.css');

function tokens(block: string): Map<string, string> {
  return new Map([...block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
}

function luminance(hex: string): number {
  const values = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker! + 0.05);
}

const semantic = ['accent', 'accent-lime', 'completeness', 'validity', 'discrepancy', 'anomaly', 'violation', 'verified', 'mismatch', 'expired', 'pending'];
const failures: string[] = [];
for (const [name, block] of [['dark', darkBlock], ['light', lightBlock]] as const) {
  const palette = tokens(block);
  const surfaces = ['canvas', 'surface', 'raised', 'overlay'].map((key) => [key, palette.get(key)] as const);
  const textColors = ['text', 'text-muted', 'text-faint', ...semantic].map((key) => [key, palette.get(key)] as const);
  for (const [foreground, color] of textColors) {
    if (!color) {
      failures.push(`${name}: missing --color-${foreground}`);
      continue;
    }
    for (const [background, bg] of surfaces) {
      if (!bg) continue;
      const ratio = contrast(color, bg);
      if (ratio < 4.5) failures.push(`${name}: --color-${foreground} on --color-${background} = ${ratio.toFixed(2)}:1`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`Contrast check failed (WCAG AA 4.5:1):\n${failures.map((f) => `- ${f}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Contrast check passed: text and semantic colors meet 4.5:1 on all four surfaces in dark and light themes.\n');
}
