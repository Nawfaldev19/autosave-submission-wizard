import { describe, expect, it } from 'vitest';
import doc from '../../docs/reference/design-tokens.md?raw';
import tokensCss from '../src/styles/tokens.css?raw';

// Checks no linter makes: WCAG contrast for every pair documented in
// docs/reference/design-tokens.md, recomputed from tokens.css in both themes;
// the two copies of the dark palette; and reduced motion.

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No block for ${selector}`);
  return css.slice(start, css.indexOf('\n}', start));
}

function colours(source: string): Map<string, string> {
  return new Map(
    [...source.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1] ?? '', m[2] ?? '']),
  );
}

const light = colours(block(tokensCss, ':root'));
const dark = colours(block(tokensCss, ":root[data-theme='dark']"));
const systemDark = colours(block(tokensCss, ":root:not([data-theme='light'])"));

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Lines of the contrast table: `| use | `fg` on `bg` | light:1 | dark:1 | needs:1 |`. */
const documented = [
  ...doc.matchAll(
    /^\| [^|]+\| `([a-z-]+)` on `([a-z-]+)`\s*\| ([\d.]+):1\s*\| ([\d.]+):1\s*\| ([\d.]+):1\s*\|/gm,
  ),
].map((m) => ({
  fg: m[1] ?? '',
  bg: m[2] ?? '',
  light: Number(m[3]),
  dark: Number(m[4]),
  needs: Number(m[5]),
}));

describe('design tokens', () => {
  it('defines the dark palette identically for the system setting and the theme switch', () => {
    expect(systemDark.size).toBeGreaterThan(10);
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  it('meets the contrast each documented pair needs, in both themes, with the ratios the docs state', () => {
    expect(documented.length).toBe(22);
    for (const pair of documented) {
      const name = `${pair.fg} on ${pair.bg}`;
      const lightRatio = contrast(light.get(pair.fg) ?? '', light.get(pair.bg) ?? '');
      const darkRatio = contrast(dark.get(pair.fg) ?? '', dark.get(pair.bg) ?? '');
      expect(lightRatio, `${name} (light)`).toBeGreaterThanOrEqual(pair.needs);
      expect(darkRatio, `${name} (dark)`).toBeGreaterThanOrEqual(pair.needs);
      expect(lightRatio.toFixed(2), `${name} (light) in the docs`).toBe(pair.light.toFixed(2));
      expect(darkRatio.toFixed(2), `${name} (dark) in the docs`).toBe(pair.dark.toFixed(2));
    }
  });

  it('drops every duration token to 0ms when reduced motion is requested', () => {
    const reduced = block(tokensCss, '@media (prefers-reduced-motion: reduce)');
    const durations = [...tokensCss.matchAll(/^\s*(--duration-[a-z]+):/gm)].map((m) => m[1] ?? '');
    expect(durations.length).toBeGreaterThan(0);
    for (const name of new Set(durations)) expect(reduced).toContain(`${name}: 0ms;`);
  });
});
