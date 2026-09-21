import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from '../components/ui/theme-provider';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { CommandPalette } from '../components/ui/command-palette';
import { SlashMenu, SLASH_MENU_ITEMS } from '../components/editor/SlashMenu';
import { BlockItem } from '../components/editor/BlockItem';
import { FormatToolbar } from '../components/editor/FormatToolbar';
import type { Block } from '../lib/document-model';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('Interactive Minimal UI & Theme System', () => {
  describe('ThemeProvider and ThemeToggle', () => {
    it('renders ThemeToggle in icon mode with accessible label', () => {
      const html = renderToString(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(html).toContain('Toggle theme');
      expect(html).toContain('Toggle color theme');
    });

    it('renders ThemeToggle in segmented mode with light, dark, and auto buttons', () => {
      const html = renderToString(
        <ThemeProvider>
          <ThemeToggle variant="segmented" />
        </ThemeProvider>
      );

      expect(html).toContain('Light');
      expect(html).toContain('Dark');
      expect(html).toContain('Auto');
    });
  });

  describe('CommandPalette Modal & Actions', () => {
    const mockProjects = [
      {
        id: 'proj-1',
        name: 'Architecture Roadmap',
        content: 'System architecture design details',
        owner_id: 'user-1',
        owner_name: 'Alice',
        owner_email: 'alice@example.com',
        created_at: 1000,
        updated_at: 2000,
        role: 'OWNER' as const,
      },
      {
        id: 'proj-2',
        name: 'Sprint Planning',
        content: 'Task breakdown',
        owner_id: 'user-2',
        owner_name: 'Bob',
        owner_email: 'bob@example.com',
        created_at: 1000,
        updated_at: 2000,
        role: 'EDITOR' as const,
      },
    ];

    it('does not render markup when isOpen is false', () => {
      const html = renderToString(
        <ThemeProvider>
          <CommandPalette isOpen={false} onClose={() => {}} />
        </ThemeProvider>
      );
      expect(html).toBe('');
    });

    it('renders search input, categorized documents, and action items when open', () => {
      const html = renderToString(
        <ThemeProvider>
          <CommandPalette
            isOpen={true}
            onClose={() => {}}
            projects={mockProjects}
            onCreateDocument={() => {}}
            currentViewMode="grid"
            onToggleViewMode={() => {}}
          />
        </ThemeProvider>
      );

      expect(html).toContain('Type a command or search documents...');
      expect(html).toContain('Architecture Roadmap');
      expect(html).toContain('Sprint Planning');
      expect(html).toContain('Create New Document');
      expect(html).toContain('Switch to List View');
      expect(html).toContain('Toggle Theme');
    });
  });

  describe('SlashMenu Categorized Items', () => {
    it('renders block categories, item labels, and shortcut pills', () => {
      const html = renderToString(
        <SlashMenu
          query=""
          onSelect={() => {}}
          onClose={() => {}}
        />
      );

      expect(html).toContain('Blocks &amp; Formatting');
      expect(html).toContain('Text');
      expect(html).toContain('Heading 1');
      expect(html).toContain('Bulleted List');
      expect(html).toContain('To-do item');
      expect(html).toContain('#');
    });

    it('renders filtered items when query is provided', () => {
      const html = renderToString(
        <SlashMenu
          query="/py"
          onSelect={() => {}}
          onClose={() => {}}
        />
      );

      expect(html).toContain('Python Code');
      expect(html).not.toContain('Heading 1');
    });
  });

  describe('FormatToolbar', () => {
    it('renders formatting actions and block selector', () => {
      const html = renderToString(
        <FormatToolbar
          position={{ top: 100, left: 100 }}
          currentBlockType="paragraph"
          onFormat={() => {}}
          onConvertBlockType={() => {}}
        />
      );

      expect(html).toContain('Bold (Cmd+B)');
      expect(html).toContain('Italic (Cmd+I)');
      expect(html).toContain('Underline (Cmd+U)');
      expect(html).toContain('Inline Code (`)');
    });
  });

  describe('BlockItem and Grip Actions', () => {
    const sampleBlock: Block = {
      id: 'block-1',
      type: 'paragraph',
      content: 'Hello interactive braid editor',
      rawLine: 'Hello interactive braid editor',
      lineIndex: 0,
    };

    it('renders text content with insert and grip buttons', () => {
      const html = renderToString(
        <BlockItem
          block={sampleBlock}
          index={0}
          totalBlocks={1}
          isFocused={false}
          onFocus={() => {}}
          onChangeContent={() => {}}
          onKeyDown={() => {}}
          onDeleteBlock={() => {}}
          onConvertType={() => {}}
          onInsertBelow={() => {}}
        />
      );

      expect(html).toContain('Hello interactive braid editor');
      expect(html).toContain('Insert block below');
      expect(html).toContain('Drag or click for block options');
    });

    it('renders code block with language selection and copy button', () => {
      const codeBlock: Block = {
        id: 'code-1',
        type: 'code',
        codeLanguage: 'typescript',
        content: 'const x: number = 42;',
        rawLine: '```typescript\nconst x: number = 42;\n```',
        lineIndex: 0,
      };

      const html = renderToString(
        <BlockItem
          block={codeBlock}
          index={0}
          totalBlocks={1}
          isFocused={false}
          onFocus={() => {}}
          onChangeContent={() => {}}
          onKeyDown={() => {}}
          onDeleteBlock={() => {}}
          onConvertType={() => {}}
        />
      );

      expect(html).toContain('Language:');
      expect(html).toContain('Copy');
      expect(html).toContain('const x: number = 42;');
    });
  });
});
