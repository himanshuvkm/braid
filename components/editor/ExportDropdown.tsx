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
      // Focus first item when opening
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
        // Tab naturally moves out of the menu, close without returning focus to trigger
        setIsOpen(false);
        break;
    }
  };

  const executeExport = async (format: 'docx' | 'pdf') => {
    handleClose(false);
    setIsExporting(true);
    setExportingFormat(format);

    try {
      // 1. Flush any pending autosave if applicable
      if (onFlushSave) {
        await onFlushSave();
      }

      // 2. Fetch the latest live content from the editor
      const currentContent = getContent ? getContent() : undefined;

      // 3. Issue server export request
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
        } catch {
          // Response was not JSON
        }
        throw new Error(errorMsg);
      }

      // 4. Extract safe filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      let filename = `${documentTitle || 'Braid Document'}.${format}`;

      if (disposition) {
        // Look for RFC 5987 UTF-8 encoded filename first
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Look for standard ASCII filename
          const asciiMatch = disposition.match(/filename="([^"]+)"/i);
          if (asciiMatch && asciiMatch[1]) {
            filename = asciiMatch[1];
          }
        }
      }

      // 5. Download blob to client
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
      // Restore focus to export button
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
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg border shadow-xs select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none ${
          isSmall ? 'h-8 px-2.5 text-xs gap-1.5' : 'h-9 px-3 text-xs gap-2'
        } ${
          isOpen
            ? 'bg-[#eeede8] text-[#191919] border-[#d4d2cc]'
            : 'bg-[#ffffff] text-[#191919] border-[#e8e6e1] hover:border-[#d4d2cc] hover:bg-[#f4f3ef]'
        }`}
      >
        {isExporting ? (
          <Icons.Spinner size={isSmall ? 12 : 14} className="animate-spin text-[#64635e]" />
        ) : (
          <Icons.Download size={isSmall ? 13 : 15} className="text-[#64635e]" />
        )}

        <span>
          {isExporting
            ? exportingFormat === 'docx'
              ? 'Exporting Word...'
              : 'Exporting PDF...'
            : 'Export'}
        </span>

        {!isExporting && (
          <Icons.ChevronDown
            size={isSmall ? 11 : 12}
            className={`text-[#9a9994] transition-transform duration-200 ${
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
          className="absolute right-0 top-full mt-1.5 w-60 p-1.5 rounded-xl bg-[#ffffff] border border-[#e8e6e1] shadow-modal z-50 flex flex-col gap-1 animate-slide-down focus:outline-none"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a9994] px-2.5 py-1">
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
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#191919] hover:bg-[#f4f3ef] focus:bg-[#f4f3ef] focus:outline-none transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
              <Icons.FileText size={13} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[#191919]">Download as Word (.docx)</span>
              <span className="text-[10px] text-[#64635e]">Microsoft Word format</span>
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
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#191919] hover:bg-[#f4f3ef] focus:bg-[#f4f3ef] focus:outline-none transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
              <Icons.Document size={13} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[#191919]">Download as PDF (.pdf)</span>
              <span className="text-[10px] text-[#64635e]">Printable document format</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
