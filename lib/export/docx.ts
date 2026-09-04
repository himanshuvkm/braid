/**
 * DOCX Document Generator for Braid.
 * Converts Braid DocumentState and Block model into standard OpenXML Word (.docx) documents.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  ExternalHyperlink,
  Packer,
} from 'docx';
import {
  type DocumentState,
  type Block,
  type CalloutVariant,
  parseInlineFormatting,
} from '../document-model';

/**
 * Maps inline formatted spans (bold, italic, underline, strikethrough, code, link)
 * to docx Paragraph child elements (TextRun or ExternalHyperlink).
 */
function createDocxInlineRuns(
  text: string,
  options?: { inheritItalic?: boolean; defaultFont?: string }
): Array<TextRun | ExternalHyperlink> {
  const spans = parseInlineFormatting(text);
  const elements: Array<TextRun | ExternalHyperlink> = [];

  for (const span of spans) {
    if (span.link) {
      elements.push(
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: span.text,
              style: 'Hyperlink',
              underline: {},
              color: '2563EB',
              bold: span.bold,
              italics: span.italic || options?.inheritItalic,
            }),
          ],
          link: span.link,
        })
      );
    } else {
      elements.push(
        new TextRun({
          text: span.text,
          bold: span.bold,
          italics: span.italic || options?.inheritItalic,
          underline: span.underline ? {} : undefined,
          strike: span.strikethrough,
          font: span.code ? 'Courier New' : options?.defaultFont,
          shading: span.code
            ? {
                fill: 'EEEEEE',
                type: ShadingType.CLEAR,
              }
            : undefined,
          color: '191919',
        })
      );
    }
  }

  return elements;
}

/**
 * Returns accent hex color for callout variants
 */
function getCalloutAccentColor(variant?: CalloutVariant): string {
  switch (variant) {
    case 'warning':
      return 'D97706'; // Amber-600
    case 'success':
      return '16A34A'; // Emerald-600
    case 'info':
      return '2563EB'; // Blue-600
    case 'important':
    default:
      return '7C3AED'; // Purple-600
  }
}

/**
 * Returns user-friendly badge label for callout variants
 */
function getCalloutBadgeLabel(variant?: CalloutVariant): string {
  switch (variant) {
    case 'warning':
      return 'WARNING';
    case 'success':
      return 'SUCCESS';
    case 'info':
      return 'NOTE';
    case 'important':
    default:
      return 'IMPORTANT';
  }
}

/**
 * Converts a Braid block into one or more docx Paragraphs.
 */
function convertBlockToDocx(
  block: Block,
  listContext: { numberedListCounter: number }
): Paragraph[] {
  // Reset or increment numbered list counter
  if (block.type === 'numbered_list') {
    listContext.numberedListCounter++;
  } else {
    listContext.numberedListCounter = 0;
  }

  switch (block.type) {
    case 'heading1':
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: createDocxInlineRuns(block.content),
          spacing: { before: 300, after: 120 },
        }),
      ];

    case 'heading2':
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: createDocxInlineRuns(block.content),
          spacing: { before: 240, after: 100 },
        }),
      ];

    case 'heading3':
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: createDocxInlineRuns(block.content),
          spacing: { before: 200, after: 80 },
        }),
      ];

    case 'bulleted_list':
      return [
        new Paragraph({
          bullet: { level: 0 },
          children: createDocxInlineRuns(block.content),
          spacing: { after: 60, line: 260 },
        }),
      ];

    case 'numbered_list':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${listContext.numberedListCounter}.  `,
              bold: true,
              color: '64635E',
            }),
            ...createDocxInlineRuns(block.content),
          ],
          indent: { left: 720, hanging: 360 },
          spacing: { after: 60, line: 260 },
        }),
      ];

    case 'todo':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: block.checked ? '☑ ' : '☐ ',
              font: 'Segoe UI Symbol',
              bold: true,
              color: block.checked ? '16A34A' : '64635E',
            }),
            ...createDocxInlineRuns(block.content),
          ],
          indent: { left: 720, hanging: 360 },
          spacing: { after: 60, line: 260 },
        }),
      ];

    case 'quote':
      return [
        new Paragraph({
          children: createDocxInlineRuns(block.content, { inheritItalic: true }),
          indent: { left: 720 },
          border: {
            left: {
              color: '9A9994',
              size: 24,
              space: 12,
              style: BorderStyle.SINGLE,
            },
          },
          spacing: { before: 140, after: 140, line: 276 },
        }),
      ];

    case 'callout': {
      const accent = getCalloutAccentColor(block.calloutVariant);
      const badge = getCalloutBadgeLabel(block.calloutVariant);

      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[${badge}] `,
              bold: true,
              color: accent,
              size: 19, // 9.5pt
            }),
            ...createDocxInlineRuns(block.content),
          ],
          indent: { left: 540, right: 360 },
          border: {
            left: {
              color: accent,
              size: 24,
              space: 12,
              style: BorderStyle.SINGLE,
            },
          },
          shading: {
            fill: 'F4F3EF',
            type: ShadingType.CLEAR,
          },
          spacing: { before: 140, after: 140, line: 276 },
        }),
      ];
    }

    case 'code': {
      const lines = block.content.split('\n');
      const runs: TextRun[] = [];

      lines.forEach((line, idx) => {
        runs.push(
          new TextRun({
            text: line,
            font: 'Courier New',
            size: 19, // 9.5pt
            color: '1E293B',
            break: idx > 0 ? 1 : 0,
          })
        );
      });

      return [
        new Paragraph({
          children: runs,
          indent: { left: 540, right: 540 },
          border: {
            top: { color: 'E8E6E1', size: 6, space: 6, style: BorderStyle.SINGLE },
            bottom: { color: 'E8E6E1', size: 6, space: 6, style: BorderStyle.SINGLE },
            left: { color: 'E8E6E1', size: 6, space: 6, style: BorderStyle.SINGLE },
            right: { color: 'E8E6E1', size: 6, space: 6, style: BorderStyle.SINGLE },
          },
          shading: {
            fill: 'F4F3EF',
            type: ShadingType.CLEAR,
          },
          spacing: { before: 160, after: 160, line: 240 },
        }),
      ];
    }

    case 'divider':
      return [
        new Paragraph({
          border: {
            bottom: {
              color: 'E8E6E1',
              size: 12,
              space: 1,
              style: BorderStyle.SINGLE,
            },
          },
          spacing: { before: 200, after: 200 },
        }),
      ];

    case 'paragraph':
    default:
      return [
        new Paragraph({
          children: createDocxInlineRuns(block.content),
          spacing: { after: 120, line: 276 },
        }),
      ];
  }
}

/**
 * Generates a valid OpenXML Word (.docx) file Buffer from Braid DocumentState.
 */
export async function generateDocx(docState: DocumentState): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];
  const listContext = { numberedListCounter: 0 };

  // Document Title Header
  const title = docState.title || 'Untitled Document';
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 36, // 18pt / 24pt
          color: '191919',
        }),
      ],
      spacing: { before: 0, after: 240 },
    })
  );

  // Convert each semantic block into Word paragraphs
  for (const block of docState.blocks) {
    // If the first block is a heading1 identical to the document title, skip redundant title
    if (
      block.lineIndex === 0 &&
      block.type === 'heading1' &&
      block.content.trim() === title.trim()
    ) {
      continue;
    }

    const converted = convertBlockToDocx(block, listContext);
    paragraphs.push(...converted);
  }

  const doc = new Document({
    title,
    creator: 'Braid Collaborative Editor',
    description: 'Exported from Braid',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
