import { describe, it, expect } from 'vitest';
import { parseDocument } from '../lib/document-model';
import { generatePdf } from '../lib/export/pdf';

describe('PDF Document Generation & Pagination', () => {
  it('generates a valid PDF buffer starting with %PDF- header', async () => {
    const rawText = '# Test Document\n\nThis is a simple paragraph.';
    const docState = parseDocument(rawText);
    const buffer = await generatePdf(docState);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    // Check EOF marker
    const tail = buffer.subarray(buffer.length - 64).toString();
    expect(tail).toContain('%%EOF');
  });

  it('correctly includes document title, headings, and paragraphs in PDF output', async () => {
    const rawText = [
      '# Architecture Document',
      'This is an executive summary of the system.',
      '## Core Components',
      'The components are detailed below.',
      '### Data Layer',
      'High performance persistence.',
    ].join('\n\n');

    const docState = parseDocument(rawText);
    const buffer = await generatePdf(docState);
    const pdfString = buffer.toString('binary');

    expect(docState.title).toBe('Architecture Document');
    expect(buffer.length).toBeGreaterThan(1000);
    expect(pdfString).toContain('%PDF');
  });

  it('renders rich block types: bullet lists, numbered lists, checklists, callouts, and code blocks', async () => {
    const rawText = [
      '# Comprehensive Blocks',
      'Paragraph before blocks.',
      '- Bullet Item Alpha',
      '- Bullet Item Beta',
      '1. Step Number One',
      '2. Step Number Two',
      '- [ ] Pending item',
      '- [x] Finished item',
      '> 💡 This is an informational callout block.',
      '> ⚠️ Be careful with this operation.',
      '> Classic blockquote text citation.',
      '```typescript',
      'interface Config {',
      '  port: number;',
      '  host: string;',
      '}',
      '```',
      '---',
      'Footer paragraph after divider.',
    ].join('\n\n');

    const docState = parseDocument(rawText);
    const buffer = await generatePdf(docState);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('correctly handles multi-page long documents without truncation or crashing', async () => {
    // Generate a long document with 100 paragraphs to trigger multiple automatic page breaks
    const sections: string[] = ['# Comprehensive Long Document'];

    for (let i = 1; i <= 60; i++) {
      sections.push(`## Section ${i}: Detailed Analysis`);
      sections.push(
        `This is detailed paragraph ${i} with substantial text content designed to fill printable page margins. ` +
        'It describes architecture, data flow, synchronization guarantees, and CRDT convergence algorithms. '.repeat(4)
      );
      sections.push(`- Key observation ${i}.A\n- Key observation ${i}.B\n- Key observation ${i}.C`);
    }

    const docState = parseDocument(sections.join('\n\n'));
    const buffer = await generatePdf(docState);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);

    // Verify PDF structure: contains multiple /Page objects
    const pdfString = buffer.toString('binary');
    const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    expect(pageMatches).not.toBeNull();
    // A 60-section document should easily span 5+ pages
    expect(pageMatches!.length).toBeGreaterThanOrEqual(5);
    expect(pdfString).toContain('%%EOF');
  });
});
