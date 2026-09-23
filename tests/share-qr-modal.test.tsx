import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import QRCode from 'qrcode';
import { ShareModal } from '../components/ui/share-modal';

describe('ShareModal & QR Code Collaboration Sharing', () => {
  it('does not render markup when isOpen is false', () => {
    const html = renderToString(
      <ShareModal
        isOpen={false}
        onClose={() => {}}
        documentId="proj-123"
        documentTitle="Sprint Planning"
      />
    );
    expect(html).toBe('');
  });

  it('renders QR code modal header, document title, room ID, and copy controls when open', () => {
    const html = renderToString(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        documentId="proj-quantum-99"
        documentTitle="Quantum Computing Architecture"
      />
    );

    expect(html).toContain('Share Collaborative Room');
    expect(html).toContain('Scan this QR code with a phone or tablet camera to join this live collaborative room instantly.');
    expect(html).toContain('Quantum Computing Architecture');
    expect(html).toContain('proj-quantum-99');
    expect(html).toContain('Direct Room Link');
    expect(html).toContain('Copy Link');
    expect(html).toContain('Instant Mobile &amp; Guest Connection');
  });

  it('generates a valid scannable QR code data URL for a given room URL', async () => {
    const roomUrl = 'https://braid.example.com/proj-quantum-99';
    const dataUrl = await QRCode.toDataURL(roomUrl, {
      width: 256,
      margin: 1.5,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(100);
  });
});
