import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ExportDropdown } from '../components/editor/ExportDropdown';

describe('ExportDropdown UI Component', () => {
  it('renders with accessible aria attributes and trigger button', () => {
    const html = renderToString(
      <ExportDropdown projectId="proj-123" documentTitle="Project Roadmap" />
    );

    expect(html).toContain('Export');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Export document"');
  });

  it('supports size variants cleanly', () => {
    const smHtml = renderToString(
      <ExportDropdown projectId="proj-123" size="sm" />
    );
    expect(smHtml).toContain('h-8');

    const mdHtml = renderToString(
      <ExportDropdown projectId="proj-123" size="md" />
    );
    expect(mdHtml).toContain('h-9');
  });
});
