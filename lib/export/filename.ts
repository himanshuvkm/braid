/**
 * Filename sanitization and safe Content-Disposition header generation
 * for document export in Braid.
 */

export type ExportFormat = 'docx' | 'pdf';

/**
 * Sanitizes a document title for use as a filesystem filename and download attachment.
 * Removes directory traversal sequences, reserved filesystem characters,
 * control codes, quotes, and non-printable bytes.
 */
export function sanitizeFilename(title?: string, format: ExportFormat = 'docx'): string {
  if (!title || typeof title !== 'string') {
    return `Braid Document.${format}`;
  }

  // 1. Remove control characters, null bytes, quotes, and reserved filesystem characters
  // Reserved in Windows/Unix: / ? < > \ : * | " ^
  let clean = title
    .replace(/[\x00-\x1f\x7f-\x9f/\\?<>:*|"]/g, '')
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .replace(/^\.+/, '') // Prevent hidden file dot prefix
    .trim();

  // 2. Fallback if the title was only whitespace or invalid characters
  if (!clean) {
    clean = 'Braid Document';
  }

  // 3. Bound filename length to 100 characters to prevent filesystem/header overflows
  if (clean.length > 100) {
    clean = clean.slice(0, 100).trim();
  }

  return `${clean}.${format}`;
}

/**
 * Generates an RFC 6266 / RFC 5987 compliant Content-Disposition header value
 * containing both an ASCII-safe fallback and a UTF-8 encoded filename.
 */
export function getContentDispositionHeader(filename: string): string {
  // ASCII-safe fallback (strip non-ASCII, quotes, backslashes)
  const asciiFilename = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  const encodedFilename = encodeURIComponent(filename);

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}
