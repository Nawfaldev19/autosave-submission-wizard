import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

describe('release metadata', () => {
  it('keeps every package, the lockfile, the changelog and the security policy on one version', async () => {
    const versions = await Promise.all(
      ['package.json', 'shared/package.json', 'server/package.json', 'web/package.json'].map(
        async (path) => (JSON.parse(await read(path)) as { version: string }).version,
      ),
    );
    const lock = JSON.parse(await read('package-lock.json')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    const released = /^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/m.exec(await read('CHANGELOG.md'))?.[1];
    const supported = /^\| (\d+\.\d+)\.x /m.exec(await read('SECURITY.md'))?.[1];

    const [version] = versions;
    expect(new Set(versions)).toEqual(new Set([version]));
    expect([lock.version, ...['', 'shared', 'server', 'web'].map((p) => lock.packages[p]?.version)]).toEqual(
      Array(5).fill(version),
    );
    expect(released).toBe(version);
    expect(version?.startsWith(`${supported ?? '?'}.`)).toBe(true);
  });
});
