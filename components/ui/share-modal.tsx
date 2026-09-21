'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Modal } from './modal';
import { Icons } from './icons';
import { Button } from './button';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/${encodeURIComponent(documentId)}`;
    }
    return `/${documentId}`;
  }, [documentId]);

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let isMounted = true;
    setIsLoadingQr(true);

    const fullUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/${encodeURIComponent(documentId)}`
      : `/${documentId}`;

    QRCode.toDataURL(fullUrl, {
      width: 256,
      margin: 1.5,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsLoadingQr(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        if (isMounted) {
          setIsLoadingQr(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(documentId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `braid-room-${documentId}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Collaborative Room"
      description="Scan this QR code with a phone or tablet camera to join this live collaborative room instantly."
      maxWidth="md"
    >
      <div className="flex flex-col items-center gap-5 py-2">
        {/* QR Code Container with High-Contrast Card */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative p-3 rounded-2xl bg-white border border-[var(--border)] shadow-md flex items-center justify-center min-w-[210px] min-h-[210px]">
            {isLoadingQr ? (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-12">
                <Icons.Spinner size={24} className="animate-spin text-zinc-600" />
                <span className="text-xs font-mono">Generating QR...</span>
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code to join room ${documentId}`}
                width={200}
                height={200}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
              />
            ) : (
              <div className="text-xs text-rose-500 py-12">
                Failed to load QR code
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-subtle)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Instant Mobile &amp; Guest Connection</span>
          </div>
        </div>

        {/* Room Info Pill & Actions */}
        <div className="w-full flex flex-col gap-3">
          {/* Document Title & ID summary */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-subtle)]">Room</span>
              <span className="font-semibold text-[var(--text)] truncate">
                {documentTitle || documentId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Copy Room ID"
            >
              <span>{documentId}</span>
              {copiedId ? (
                <Icons.Check size={12} className="text-emerald-500" />
              ) : (
                <Icons.Copy size={12} />
              )}
            </button>
          </div>

          {/* Share Link Input with Direct Copy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--text-muted)]">
              Direct Room Link
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text)] outline-none select-all focus:border-[var(--border-strong)]"
                />
              </div>

              <Button
                variant={copiedLink ? 'secondary' : 'primary'}
                size="md"
                onClick={handleCopyLink}
                leftIcon={copiedLink ? <Icons.Check size={14} className="text-emerald-400" /> : <Icons.Copy size={14} />}
                className="shrink-0"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="w-full flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
          {qrDataUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadQr}
              leftIcon={<Icons.Download size={13} />}
            >
              Download QR Image
            </Button>
          ) : <div />}

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
