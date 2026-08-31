/**
 * Block Document Model for Braid.
 * Maps high-level Notion-style document blocks and inline formatting
 * to underlying character streams synchronized through the RGA CRDT.
 */

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'todo'
  | 'quote'
  | 'callout'
  | 'code'
  | 'divider';

export type CalloutVariant = 'info' | 'warning' | 'success' | 'important';

export interface Block {
  id: string;
  type: BlockType;
  content: string; // The inner text content of the block (excluding block prefixes like '# ', '- [ ] ')
  checked?: boolean; // For 'todo' blocks
  calloutVariant?: CalloutVariant; // For 'callout' blocks
  codeLanguage?: string; // For 'code' blocks
  rawLine: string; // Raw text representation in the serialized document
  lineIndex: number; // 0-indexed line position
}

export interface DocumentState {
  title: string;
  blocks: Block[];
  rawText: string;
}

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string;
}

/**
 * Parses raw document text into structured Notion-like blocks.
 */
export function parseDocument(rawText: string): DocumentState {
  if (!rawText) {
    return {
      title: 'Untitled Document',
      blocks: [
        {
          id: 'block-0',
          type: 'paragraph',
          content: '',
          rawLine: '',
          lineIndex: 0,
        },
      ],
      rawText: '',
    };
  }

  const lines = rawText.split('\n');
  const blocks: Block[] = [];
  let title = 'Untitled Document';
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';
  let codeStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Code Block spanning multiple lines: ```lang ... ```
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim() || 'typescript';
        codeBuffer = [];
        codeStartIndex = i;
        continue;
      } else {
        inCodeBlock = false;
        blocks.push({
          id: `block-code-${codeStartIndex}`,
          type: 'code',
          content: codeBuffer.join('\n'),
          codeLanguage,
          rawLine: `\`\`\`${codeLanguage}\n${codeBuffer.join('\n')}\n\`\`\``,
          lineIndex: codeStartIndex,
        });
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // First line starting with '# ' can be treated as document title if top-level
    if (i === 0 && line.startsWith('# ')) {
      title = line.slice(2).trim() || 'Untitled Document';
      // Still include as heading1 block or title block
      blocks.push({
        id: `block-${i}`,
        type: 'heading1',
        content: title,
        rawLine: line,
        lineIndex: i,
      });
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'heading1',
        content: line.slice(2),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Heading 2
    else if (line.startsWith('## ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'heading2',
        content: line.slice(3),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Heading 3
    else if (line.startsWith('### ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'heading3',
        content: line.slice(4),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Todo list (checked or unchecked)
    else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'todo',
        content: line.slice(6),
        checked: true,
        rawLine: line,
        lineIndex: i,
      });
    } else if (line.startsWith('- [ ] ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'todo',
        content: line.slice(6),
        checked: false,
        rawLine: line,
        lineIndex: i,
      });
    }
    // Bulleted list
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'bulleted_list',
        content: line.slice(2),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Numbered list (e.g. "1. ", "2. ")
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^\d+\.\s/);
      const prefixLen = match ? match[0].length : 3;
      blocks.push({
        id: `block-${i}`,
        type: 'numbered_list',
        content: line.slice(prefixLen),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Callout (e.g. "> 💡 ", "> ⚠️ ", "> ✅ ", "> ℹ️ ")
    else if (line.startsWith('> 💡 ') || line.startsWith('> ⚠️ ') || line.startsWith('> ✅ ') || line.startsWith('> ℹ️ ')) {
      const emoji = line.slice(2, 4);
      const variant: CalloutVariant =
        emoji === '⚠️' ? 'warning' : emoji === '✅' ? 'success' : emoji === 'ℹ️' ? 'info' : 'important';
      blocks.push({
        id: `block-${i}`,
        type: 'callout',
        content: line.slice(5),
        calloutVariant: variant,
        rawLine: line,
        lineIndex: i,
      });
    }
    // Quote
    else if (line.startsWith('> ')) {
      blocks.push({
        id: `block-${i}`,
        type: 'quote',
        content: line.slice(2),
        rawLine: line,
        lineIndex: i,
      });
    }
    // Divider
    else if (line === '---' || line === '***' || line === '___') {
      blocks.push({
        id: `block-${i}`,
        type: 'divider',
        content: '',
        rawLine: line,
        lineIndex: i,
      });
    }
    // Standard Paragraph
    else {
      blocks.push({
        id: `block-${i}`,
        type: 'paragraph',
        content: line,
        rawLine: line,
        lineIndex: i,
      });
    }
  }

  // If code block was not closed, push trailing content
  if (inCodeBlock) {
    blocks.push({
      id: `block-code-${codeStartIndex}`,
      type: 'code',
      content: codeBuffer.join('\n'),
      codeLanguage,
      rawLine: `\`\`\`${codeLanguage}\n${codeBuffer.join('\n')}`,
      lineIndex: codeStartIndex,
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      id: 'block-0',
      type: 'paragraph',
      content: '',
      rawLine: '',
      lineIndex: 0,
    });
  }

  return { title, blocks, rawText };
}

/**
 * Serializes a block object into its raw markdown line.
 */
export function serializeBlock(block: Pick<Block, 'type' | 'content' | 'checked' | 'codeLanguage' | 'calloutVariant'>): string {
  switch (block.type) {
    case 'heading1':
      return `# ${block.content}`;
    case 'heading2':
      return `## ${block.content}`;
    case 'heading3':
      return `### ${block.content}`;
    case 'bulleted_list':
      return `- ${block.content}`;
    case 'numbered_list':
      return `1. ${block.content}`;
    case 'todo':
      return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
    case 'quote':
      return `> ${block.content}`;
    case 'callout': {
      const icon =
        block.calloutVariant === 'warning'
          ? '⚠️'
          : block.calloutVariant === 'success'
          ? '✅'
          : block.calloutVariant === 'info'
          ? 'ℹ️'
          : '💡';
      return `> ${icon} ${block.content}`;
    }
    case 'code':
      return `\`\`\`${block.codeLanguage || 'typescript'}\n${block.content}\n\`\`\``;
    case 'divider':
      return '---';
    case 'paragraph':
    default:
      return block.content;
  }
}

/**
 * Serializes an array of blocks back into document raw text.
 */
export function serializeDocument(blocks: Block[]): string {
  return blocks.map(serializeBlock).join('\n');
}

/**
 * Parses inline formatting tags (**bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `code`, [link](url))
 * into styled spans for rich rendering.
 */
export function parseInlineFormatting(text: string): InlineSpan[] {
  if (!text) return [{ text: '' }];

  const spans: InlineSpan[] = [];
  // Tokenizer regex for markdown inline formatting
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|<u>.*?<\/u>|~~.*?~~|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      spans.push({ text: token.slice(1, -1), italic: true });
    } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
      spans.push({ text: token.slice(3, -4), underline: true });
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      spans.push({ text: token.slice(2, -2), strikethrough: true });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      spans.push({ text: token.slice(1, -1), code: true });
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        spans.push({ text: linkMatch[1], link: linkMatch[2] });
      } else {
        spans.push({ text: token });
      }
    } else {
      spans.push({ text: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}
