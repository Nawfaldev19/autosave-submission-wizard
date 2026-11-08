/**
 * Upload rules shared by the wizard and the server: the size cap, type sniffing
 * from content and display-safe file names.
 */

/** The largest manuscript accepted, in bytes (5 MB). The server's body limit is derived from it. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** The only media types a manuscript may have, decided by {@link sniffMediaType}. */
export type AcceptedMediaType = 'application/pdf' | 'text/plain';

/**
 * Decides the media type from the file's bytes, never from its name or the
 * browser's claim.
 *
 * @param bytes - The whole file. Text is decoded in full, so valid text followed
 * by binary data is refused.
 * @returns `application/pdf` for the `%PDF-` magic number, `text/plain` for valid
 * UTF-8 without NUL bytes, otherwise `null`.
 * @example
 * ```ts
 * sniffMediaType(new TextEncoder().encode('%PDF-1.7')); // 'application/pdf'
 * sniffMediaType(new Uint8Array([0x4d, 0x5a, 0x00])); // null
 * ```
 * @see docs/adr/0006-sniff-uploads-store-under-random-keys.md
 */
export function sniffMediaType(bytes: Uint8Array): AcceptedMediaType | null {
  const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
  if (pdfMagic.every((byte, i) => bytes[i] === byte)) return 'application/pdf';
  if (bytes.length === 0 || bytes.includes(0)) return null;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'text/plain';
  } catch {
    return null;
  }
}

/**
 * Keeps a display-safe file name: letters, digits, spaces, dots, dashes and underscores.
 *
 * @param name - The name the browser sent, possibly with a path.
 * @returns At most 120 characters; never empty and never starting with a dot.
 * @remarks
 * The result is stored only as data and shown to people. It never becomes part of a path.
 * @example
 * ```ts
 * safeFileName('../../etc/passwd'); // 'passwd'
 * safeFileName('.hidden'); // 'manuscript.hidden'
 * ```
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned === '' || cleaned.startsWith('.') ? `manuscript${cleaned}` : cleaned;
}
