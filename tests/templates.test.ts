import { describe, it, expect } from 'vitest';
import { DOCUMENT_TEMPLATES, getTemplateById, type TemplateItem } from '../lib/templates';

describe('Document Templates Library', () => {
  it('contains blank, rfc, code sandbox, and meeting notes templates', () => {
    expect(DOCUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    
    const ids = DOCUMENT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('blank');
    expect(ids).toContain('rfc');
    expect(ids).toContain('code');
    expect(ids).toContain('meeting');
  });

  it('provides structured markdown starter content for rfc template', () => {
    const rfc = getTemplateById('rfc');
    expect(rfc).toBeDefined();
    expect(rfc?.title).toBe('Technical RFC');
    expect(rfc?.content).toContain('# RFC: ');
    expect(rfc?.content).toContain('## 1. Context & Problem Statement');
    expect(rfc?.content).toContain('## 2. Proposed Architecture');
  });

  it('provides multi-language code snippets for code sandbox template', () => {
    const code = getTemplateById('code');
    expect(code).toBeDefined();
    expect(code?.content).toContain('```typescript');
    expect(code?.content).toContain('```');
  });

  it('returns undefined for invalid template id', () => {
    const invalid = getTemplateById('non-existent');
    expect(invalid).toBeUndefined();
  });
});
