/** Local-disk manuscript storage keyed by random UUIDs. */

import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Manuscripts live on local disk under random keys. The original file name is
 * only ever stored as data; it never becomes part of a path.
 *
 * @remarks
 * Every method that takes a key checks it against the UUID pattern first, so
 * a key can never name a path outside `dir`.
 * @see docs/adr/0006-sniff-uploads-store-under-random-keys.md
 */
export class FileStorage {
  /** @param dir - The folder that holds the files; created on first save. */
  constructor(private readonly dir: string) {}

  /**
   * Writes bytes under a new random key, refusing to overwrite (exclusive create).
   *
   * @returns The new storage key.
   */
  async save(bytes: Uint8Array): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const key = randomUUID();
    await writeFile(join(this.dir, key), bytes, { flag: 'wx' });
    return key;
  }

  /**
   * Reads a stored file.
   *
   * @throws `Error` when `key` is not a storage key.
   */
  read(key: string): Promise<Buffer> {
    if (!KEY.test(key)) throw new Error('Invalid storage key');
    return readFile(join(this.dir, key));
  }

  /**
   * Deletes a stored file; a missing file is not an error.
   *
   * @throws `Error` when `key` is not a storage key.
   */
  async remove(key: string): Promise<void> {
    if (!KEY.test(key)) throw new Error('Invalid storage key');
    await rm(join(this.dir, key), { force: true });
  }

  /** Deletes every stored manuscript. Only files named like storage keys are touched. */
  async clear(): Promise<void> {
    const names = await readdir(this.dir).catch(() => []);
    await Promise.all(names.filter((name) => KEY.test(name)).map((name) => this.remove(name)));
  }
}
