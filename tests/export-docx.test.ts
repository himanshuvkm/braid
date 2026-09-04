import { describe, it, expect } from 'vitest';
import { parseDocument } from '../lib/document-model';
import { generateDocx } from '../lib/export/docx';
import { sanitizeFilename, getContentDispositionHeader } from '../lib/export/filename';

describe('DOCX Document Generation & Formatting', () => {
  it('generates a valid OpenXML DOCX buffer with PK zip header', async () => {
    const rawText = '# Hello World\n\nThis is a paragraph.';
    const docState = parseDocument(rawText);
    const buffer = await generateDocx(docState);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    // PK\x03\x04 is the magic header for ZIP / OpenXML documents
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer[2]).toBe(0x03);
    expect(buffer[3]).toBe(0x04);
  });

  it('preserves document title, headings H1, H2, H3, and paragraphs', async () => {
    const rawText = [
      '# Product Specification',
      'This is an introductory overview paragraph.',
      '## Architecture Overview',
      'Details on the architecture.',
      '### Subsystem Components',
      'Details on subsystem components.',
    ].join('\n\n');

    const docState = parseDocument(rawText);
    expect(docState.title).toBe('Product Specification');
    expect(docState.blocks.some((b) => b.type === 'heading1')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'heading2')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'heading3')).toBe(true);

    const buffer = await generateDocx(docState);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('preserves bulleted, numbered, and todo checklist items', async () => {
    const rawText = [
      '# Task List',
      '- Item A',
      '- Item B',
      '1. Step One',
      '2. Step Two',
      '- [ ] Incomplete task',
      '- [x] Completed task',
    ].join('\n');

    const docState = parseDocument(rawText);
    expect(docState.blocks.some((b) => b.type === 'bulleted_list')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'numbered_list')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'todo' && b.checked === false)).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'todo' && b.checked === true)).toBe(true);

    const buffer = await generateDocx(docState);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('preserves quotes, callouts, and code blocks', async () => {
    const rawText = [
      '# Complex Blocks',
      '> This is a blockquote citation.',
      '> 💡 This is an info callout',
      '> ⚠️ This is a warning callout',
      '```typescript',
      'const answer: number = 42;',
      'console.log(answer);',
      '```',
    ].join('\n');

    const docState = parseDocument(rawText);
    expect(docState.blocks.some((b) => b.type === 'quote')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'callout')).toBe(true);
    expect(docState.blocks.some((b) => b.type === 'code')).toBe(true);

    const buffer = await generateDocx(docState);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('preserves rich inline formatting: bold, italic, underline, strikethrough, inline code, and links', async () => {
    const rawText = [
      '# Inline Styles',
      'Text with **bold** and *italic* and <u>underlined</u> and ~~deleted~~ words.',
      'Inline `code snippet` and a [Braid Link](https://braid.app) test.',
    ].join('\n\n');

    const docState = parseDocument(rawText);
    const buffer = await generateDocx(docState);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  describe('Filename sanitization', () => {
    it('sanitizes titles with directory traversal and reserved characters', () => {
      expect(sanitizeFilename('../../etc/passwd', 'docx')).toBe('etcpasswd.docx');
      expect(sanitizeFilename('Report: Q3/Q4 <Draft> *Final*?', 'docx')).toBe('Report Q3Q4 Draft Final.docx');
      expect(sanitizeFilename('My "Important" Document | Version 2', 'docx')).toBe('My Important Document  Version 2.docx');
    });

    it('provides sensible fallback for empty or whitespace-only titles', () => {
      expect(sanitizeFilename('', 'docx')).toBe('Braid Document.docx');
      expect(sanitizeFilename('   ', 'docx')).toBe('Braid Document.docx');
      expect(sanitizeFilename(undefined, 'docx')).toBe('Braid Document.docx');
    });

    it('bounds overly long filenames to 100 characters', () => {
      const longTitle = 'a'.repeat(200);
      const sanitized = sanitizeFilename(longTitle, 'docx');
      expect(sanitized.length).toBe(105); // 100 chars + '.docx'
      expect(sanitized.endsWith('.docx')).toBe(true);
    });

    it('generates RFC 6266 and RFC 5987 compliant Content-Disposition headers', () => {
      const header = getContentDispositionHeader('Quarterly Report.docx');
      expect(header).toBe('attachment; filename="Quarterly Report.docx"; filename*=UTF-8\'\'Quarterly%20Report.docx');

      const unicodeHeader = getContentDispositionHeader('Projet Étape 1.docx');
      expect(unicodeHeader).toContain('filename="Projet _tape 1.docx"');
      expect(unicodeHeader).toContain("filename*=UTF-8''Projet%20%C3%89tape%201.docx");
    });
  });
});
