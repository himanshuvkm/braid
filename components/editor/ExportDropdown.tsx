'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../ui/icons';
import { useToast } from '../ui/toast';

export interface ExportDropdownProps {
  projectId: string;
  documentTitle?: string;
  getContent?: () => string;
  onFlushSave?: () => Promise<void> | void;
  size?: 'sm' | 'md';
  className?: string;
}

export function ExportDropdown({
  projectId,
  documentTitle,
  getContent,
  onFlushSave,
  size = 'sm',
  className = '',
}: ExportDropdownProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'docx' | 'pdf' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus management when menu opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        itemRefs.current[0]?.focus();
      });
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (isExporting) return;
    setIsOpen((prev) => !prev);
  };

  const handleClose = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerButtonRef.current?.focus();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent, index: number) => {
    const totalItems = 2;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        itemRefs.current[(index + 1) % totalItems]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        itemRefs.current[(index - 1 + totalItems) % totalItems]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        itemRefs.current[totalItems - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        handleClose(true);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const executeExport = async (format: 'docx' | 'pdf') => {
    handleClose(false);
    setIsExporting(true);
    setExportingFormat(format);

    try {
      if (onFlushSave) {
        await onFlushSave();
      }

      const currentContent = getContent ? getContent() : undefined;

      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          content: currentContent,
        }),
      });

      if (!res.ok) {
        let errorMsg = `Export failed with status ${res.status}`;
        try {
          const data = await res.json();
          if (data && data.error) {
            errorMsg = data.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const disposition = res.headers.get('Content-Disposition');
      let filename = `${documentTitle || 'Braid Document'}.${format}`;

      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          const asciiMatch = disposition.match(/filename="([^"]+)"/i);
          if (asciiMatch && asciiMatch[1]) {
            filename = asciiMatch[1];
          }
        }
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      window.URL.revokeObjectURL(blobUrl);
      downloadAnchor.remove();

      toast(`Downloaded ${filename}`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export document';
      toast(message, 'error');
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      triggerButtonRef.current?.focus();
    }
  };

  const isSmall = size === 'sm';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Export Trigger Button */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={handleToggle}
        disabled={isExporting}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Export document"
        id="export-dropdown-trigger"
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg border select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${
          isSmall ? 'h-8 px-2.5 text-xs gap-1.5' : 'h-9 px-3 text-xs gap-2'
        } ${
          isOpen
            ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
            : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800'
        }`}
      >
        {isExporting ? (
          <Icons.Spinner size={isSmall ? 11 : 13} className="animate-spin text-neutral-400" />
        ) : (
          <Icons.Download size={isSmall ? 11 : 13} className="text-neutral-400" />
        )}

        <span>
          {isExporting
            ? exportingFormat === 'docx'
              ? 'Word...'
              : 'PDF...'
            : 'Export'}
        </span>

        {!isExporting && (
          <Icons.ChevronDown
            size={isSmall ? 10 : 11}
            className={`text-neutral-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Accessible Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="export-dropdown-trigger"
          className="absolute right-0 top-full mt-1.5 w-56 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl z-50 flex flex-col gap-0.5 animate-slide-down focus:outline-none"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 py-1">
            Export Document
          </div>

          {/* Option 1: Microsoft Word (.docx) */}
          <button
            ref={(el) => {
              itemRefs.current[0] = el;
            }}
            type="button"
            role="menuitem"
            id="export-option-docx"
            onClick={() => executeExport('docx')}
            onKeyDown={(e) => handleMenuKeyDown(e, 0)}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-neutral-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
              <Icons.FileText size={11} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-neutral-200">Word (.docx)</span>
              <span className="text-[10px] text-neutral-500">Microsoft Word format</span>
            </div>
          </button>

          {/* Option 2: PDF (.pdf) */}
          <button
            ref={(el) => {
              itemRefs.current[1] = el;
            }}
            type="button"
            role="menuitem"
            id="export-option-pdf"
            onClick={() => executeExport('pdf')}
            onKeyDown={(e) => handleMenuKeyDown(e, 1)}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-neutral-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
              <Icons.Document size={11} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-neutral-200">PDF (.pdf)</span>
              <span className="text-[10px] text-neutral-500">Printable document</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
