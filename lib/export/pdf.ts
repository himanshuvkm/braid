/**
 * PDF Document Generator for Braid.
 * Converts Braid DocumentState and Block model into clean, printable A4 PDF documents using pdfkit.
 */

import PDFDocument from 'pdfkit';
import {
  type DocumentState,
  type CalloutVariant,
  parseInlineFormatting,
} from '../document-model';

/**
 * Returns hex color string for callout variants in PDF
 */
function getCalloutAccentColor(variant?: CalloutVariant): string {
  switch (variant) {
    case 'warning':
      return '#D97706'; // Amber-600
    case 'success':
      return '#16A34A'; // Emerald-600
    case 'info':
      return '#2563EB'; // Blue-600
    case 'important':
    default:
      return '#7C3AED'; // Purple-600
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
 * Renders inline formatted text segments (bold, italic, underline, strikethrough, code, link)
 * onto the PDFKit document with proper font switches and continued flow.
 */
function renderInlineText(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: {
    fontSize?: number;
    defaultFont?: string;
    color?: string;
    lineGap?: number;
    width?: number;
  }
): void {
  const spans = parseInlineFormatting(text);
  const fontSize = options?.fontSize ?? 10.5;
  const lineGap = options?.lineGap ?? 3;
  const width = options?.width;

  spans.forEach((span, idx) => {
    const isLast = idx === spans.length - 1;

    let fontName = options?.defaultFont || 'Helvetica';
    if (span.code) {
      fontName = 'Courier';
    } else if (span.bold && span.italic) {
      fontName = 'Helvetica-BoldOblique';
    } else if (span.bold) {
      fontName = 'Helvetica-Bold';
    } else if (span.italic) {
      fontName = 'Helvetica-Oblique';
    }

    doc.font(fontName).fontSize(fontSize);

    if (span.link) {
      doc.fillColor('#2563EB').text(span.text, {
        continued: !isLast,
        link: span.link,
        underline: true,
        lineGap,
        width,
      });
    } else {
      doc.fillColor(options?.color || '#191919').text(span.text, {
        continued: !isLast,
        underline: span.underline ?? false,
        strike: span.strikethrough ?? false,
        lineGap,
        width,
      });
    }
  });

  doc.text('', { continued: false }); // Reset continued state
}

/**
 * Generates a clean, printable PDF Buffer from Braid DocumentState.
 */
export async function generatePdf(docState: DocumentState): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 54, // 0.75 in
        bufferPages: true,
        info: {
          Title: docState.title || 'Untitled Document',
          Author: 'Braid Collaborative Editor',
          Creator: 'Braid',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const margin = 54;
      const contentWidth = doc.page.width - margin * 2;
      let numberedListCounter = 0;

      // 1. Document Title
      const title = docState.title || 'Untitled Document';
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#191919')
        .text(title, {
          lineGap: 4,
        });

      doc.moveDown(0.6);

      // 2. Render each block
      for (const block of docState.blocks) {
        // If the first block is a heading1 matching the title, skip redundant title
        if (
          block.lineIndex === 0 &&
          block.type === 'heading1' &&
          block.content.trim() === title.trim()
        ) {
          continue;
        }

        // Manage numbered list counter
        if (block.type === 'numbered_list') {
          numberedListCounter++;
        } else {
          numberedListCounter = 0;
        }

        // Automatic page break check before rendering block
        const bottomMargin = doc.page.height - doc.page.margins.bottom;

        switch (block.type) {
          case 'heading1': {
            if (doc.y + 40 > bottomMargin) doc.addPage();
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#191919');
            renderInlineText(doc, block.content, { fontSize: 18, defaultFont: 'Helvetica-Bold' });
            doc.moveDown(0.3);
            break;
          }

          case 'heading2': {
            if (doc.y + 35 > bottomMargin) doc.addPage();
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#191919');
            renderInlineText(doc, block.content, { fontSize: 14, defaultFont: 'Helvetica-Bold' });
            doc.moveDown(0.25);
            break;
          }

          case 'heading3': {
            if (doc.y + 30 > bottomMargin) doc.addPage();
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#191919');
            renderInlineText(doc, block.content, { fontSize: 12, defaultFont: 'Helvetica-Bold' });
            doc.moveDown(0.2);
            break;
          }

          case 'bulleted_list': {
            if (doc.y + 20 > bottomMargin) doc.addPage();
            const currentY = doc.y;
            doc.font('Helvetica').fontSize(10.5).fillColor('#64635E').text('•', margin, currentY);
            doc.x = margin + 14;
            doc.y = currentY;
            renderInlineText(doc, block.content, {
              fontSize: 10.5,
              width: contentWidth - 14,
            });
            doc.moveDown(0.2);
            break;
          }

          case 'numbered_list': {
            if (doc.y + 20 > bottomMargin) doc.addPage();
            const currentY = doc.y;
            const prefix = `${numberedListCounter}.`;
            doc
              .font('Helvetica-Bold')
              .fontSize(10)
              .fillColor('#64635E')
              .text(prefix, margin, currentY);
            doc.x = margin + 18;
            doc.y = currentY;
            renderInlineText(doc, block.content, {
              fontSize: 10.5,
              width: contentWidth - 18,
            });
            doc.moveDown(0.2);
            break;
          }

          case 'todo': {
            if (doc.y + 20 > bottomMargin) doc.addPage();
            const currentY = doc.y;
            const boxSymbol = block.checked ? '[X]' : '[  ]';
            doc
              .font('Helvetica-Bold')
              .fontSize(9.5)
              .fillColor(block.checked ? '#16A34A' : '#64635E')
              .text(boxSymbol, margin, currentY);
            doc.x = margin + 20;
            doc.y = currentY;
            renderInlineText(doc, block.content, {
              fontSize: 10.5,
              width: contentWidth - 20,
              color: block.checked ? '#64635E' : '#191919',
            });
            doc.moveDown(0.2);
            break;
          }

          case 'quote': {
            doc.fontSize(10.5);
            const quoteHeight =
              doc.heightOfString(block.content, { width: contentWidth - 20 }) + 8;
            if (doc.y + quoteHeight > bottomMargin) doc.addPage();

            const quoteY = doc.y;
            // Draw left accent bar
            doc
              .moveTo(margin, quoteY)
              .lineTo(margin, quoteY + quoteHeight)
              .lineWidth(3)
              .strokeColor('#9A9994')
              .stroke();

            doc.x = margin + 14;
            doc.y = quoteY + 4;
            renderInlineText(doc, block.content, {
              fontSize: 10.5,
              defaultFont: 'Helvetica-Oblique',
              color: '#4A4A48',
              width: contentWidth - 20,
            });
            doc.y = quoteY + quoteHeight + 6;
            doc.x = margin;
            break;
          }

          case 'callout': {
            const badge = getCalloutBadgeLabel(block.calloutVariant);
            const accent = getCalloutAccentColor(block.calloutVariant);
            const textToMeasure = `[${badge}] ${block.content}`;
            doc.fontSize(10);
            const calloutHeight =
              doc.heightOfString(textToMeasure, { width: contentWidth - 28 }) + 16;

            if (doc.y + calloutHeight > bottomMargin) doc.addPage();

            const boxY = doc.y;
            // Background rect
            doc
              .rect(margin, boxY, contentWidth, calloutHeight)
              .fillColor('#F4F3EF')
              .fill();
            // Accent left bar
            doc
              .rect(margin, boxY, 4, calloutHeight)
              .fillColor(accent)
              .fill();

            doc.x = margin + 14;
            doc.y = boxY + 8;
            doc
              .font('Helvetica-Bold')
              .fontSize(9)
              .fillColor(accent)
              .text(`[${badge}] `, { continued: true });
            renderInlineText(doc, block.content, {
              fontSize: 10,
              color: '#191919',
              width: contentWidth - 28,
            });
            doc.y = boxY + calloutHeight + 8;
            doc.x = margin;
            break;
          }

          case 'code': {
            const codeLines = block.content.split('\n');
            const codeHeight = codeLines.length * 13 + 18;
            if (doc.y + codeHeight > bottomMargin) doc.addPage();

            const codeY = doc.y;
            doc
              .rect(margin, codeY, contentWidth, codeHeight)
              .fillColor('#F4F3EF')
              .fill();
            doc
              .rect(margin, codeY, contentWidth, codeHeight)
              .lineWidth(0.5)
              .strokeColor('#E8E6E1')
              .stroke();

            doc.x = margin + 10;
            doc.y = codeY + 9;
            doc
              .font('Courier')
              .fontSize(9)
              .fillColor('#1E293B')
              .text(block.content, {
                width: contentWidth - 20,
                lineGap: 2,
              });

            doc.y = codeY + codeHeight + 8;
            doc.x = margin;
            break;
          }

          case 'divider': {
            if (doc.y + 16 > bottomMargin) doc.addPage();
            const divY = doc.y + 8;
            doc
              .moveTo(margin, divY)
              .lineTo(margin + contentWidth, divY)
              .lineWidth(0.75)
              .strokeColor('#E8E6E1')
              .stroke();
            doc.y = divY + 12;
            doc.x = margin;
            break;
          }

          case 'paragraph':
          default: {
            if (doc.y + 20 > bottomMargin) doc.addPage();
            doc.x = margin;
            renderInlineText(doc, block.content, {
              fontSize: 10.5,
              width: contentWidth,
              lineGap: 3,
            });
            doc.moveDown(0.35);
            break;
          }
        }
      }

      // 3. Footer Page Numbers on every buffered page
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#9A9994')
          .text(
            `Braid  •  Page ${i + 1} of ${range.count}`,
            margin,
            doc.page.height - margin + 15,
            {
              width: contentWidth,
              align: 'center',
            }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
