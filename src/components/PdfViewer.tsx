import React, { useCallback, useEffect, useRef, useState } from 'react';

// ✅ CORRECT: Import from legacy build for Electron compatibility
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';

import PdfPage from './PdfPage';

// ===================================================================
// Component Props Interface
// ===================================================================

interface PdfViewerProps {
  pdfDocument: PDFDocumentProxy | null;
  allPageObjects: PDFPageProxy[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onLoadPdf: (file: File, filePathToStore?: string) => Promise<void>;
  onSetCurrentPage: (pageNum: number) => void;
}

// ===================================================================
// Component Implementation
// ===================================================================

/**
 * PDF Viewer component for rendering PDFs with continuous scroll
 *
 * Features:
 * - Canvas-based PDF rendering using PDF.js legacy build
 * - Transparent text layer overlay for text selection
 * - Continuous scrolling through all pages
 * - Responsive scaling to fit container
 * - File picker for loading PDFs
 *
 * Built for Electron environment with proper worker communication
 */
const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  allPageObjects,
  currentPage,
  totalPages,
  loading,
  error,
  onLoadPdf,
  onSetCurrentPage,
}) => {
  const MAX_PAGE_WIDTH = 900; // Keep in sync with wrapper style below
  // ===================================================================
  // Refs
  // ===================================================================

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===================================================================
  // State
  // ===================================================================

  const [pageInput, setPageInput] = useState('');
  const [containerWidth, setContainerWidth] = useState(0);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

  // ===================================================================
  // Measure Container Width
  // ===================================================================

  /**
   * Measure and update container width for responsive page rendering
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const available = containerRef.current.clientWidth - 40; // Account for padding
        const effective = Math.min(available, MAX_PAGE_WIDTH);
        setContainerWidth(effective);
      }
    };

    // Initial measurement
    updateWidth();

    // Update on resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [pdfDocument]);

  // ===================================================================
  // Event Handlers
  // ===================================================================

  /**
   * Handle file selection from file picker
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === 'application/pdf') {
        // In Electron, File objects have a 'path' property with the full file path
        const filePath = (file as any).path;
        console.log('📁 Selected file:', { name: file.name, path: filePath });
        await onLoadPdf(file, filePath);
      } else {
        alert('Please select a valid PDF file');
      }
      // Reset input to allow re-selecting same file
      event.target.value = '';
    },
    [onLoadPdf]
  );

  /**
   * Handle page number input change
   */
  const handlePageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(event.target.value);
  }, []);

  /**
   * Handle page navigation via input field - scrolls to page
   */
  const handlePageInputSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const pageNum = parseInt(pageInput, 10);
      if (pageNum >= 1 && pageNum <= totalPages) {
        // Scroll to the page
        const pageElement = pageRefsMap.current.get(pageNum);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onSetCurrentPage(pageNum);
      }
      setPageInput('');
    },
    [pageInput, totalPages, onSetCurrentPage]
  );

  // ===================================================================
  // Effects
  // ===================================================================

  /**
   * Update page input field when current page changes
   */
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  /**
   * Handle page element ref - store for scroll management
   */
  const handlePageRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefsMap.current.set(pageNum, element);
    } else {
      pageRefsMap.current.delete(pageNum);
    }
  }, []);

  /**
   * Handle page visibility changes from Intersection Observer
   */
  const handlePageVisibilityChange = useCallback((pageNum: number, isVisible: boolean) => {
    setVisiblePages(prev => {
      const newSet = new Set(prev);
      if (isVisible) {
        newSet.add(pageNum);
      } else {
        newSet.delete(pageNum);
      }
      return newSet;
    });
  }, []);

  /**
   * Detect current page based on scroll position
   */
  useEffect(() => {
    if (!containerRef.current || visiblePages.size === 0) return;

    const handleScroll = () => {
      // Debounce scroll updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        // Find the page closest to the top of the viewport
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;

        let closestPage = currentPage;
        let minDistance = Infinity;

        // Check all visible pages
        visiblePages.forEach(pageNum => {
          const pageElement = pageRefsMap.current.get(pageNum);
          if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const distance = Math.abs(pageRect.top - containerTop);

            // Prefer pages that are at or above the viewport top
            if (distance < minDistance && pageRect.top <= containerTop + 100) {
              minDistance = distance;
              closestPage = pageNum;
            }
          }
        });

        if (closestPage !== currentPage) {
          onSetCurrentPage(closestPage);
        }
      }, 150); // Debounce delay
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [visiblePages, currentPage, onSetCurrentPage]);

  /**
   * Keyboard shortcuts for navigation
   */
  useEffect(() => {
    if (!pdfDocument) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement) return;

      const scrollToPage = (pageNum: number) => {
        const pageElement = pageRefsMap.current.get(pageNum);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      switch (event.key) {
        case 'ArrowDown':
          // Scroll down one page
          if (currentPage < totalPages) {
            event.preventDefault();
            scrollToPage(currentPage + 1);
          }
          break;
        case 'ArrowUp':
          // Scroll up one page
          if (currentPage > 1) {
            event.preventDefault();
            scrollToPage(currentPage - 1);
          }
          break;
        case 'PageDown':
          // Page Down key
          if (currentPage < totalPages) {
            event.preventDefault();
            scrollToPage(currentPage + 1);
          }
          break;
        case 'PageUp':
          // Page Up key
          if (currentPage > 1) {
            event.preventDefault();
            scrollToPage(currentPage - 1);
          }
          break;
        case 'Home':
          // Go to first page
          event.preventDefault();
          scrollToPage(1);
          break;
        case 'End':
          // Go to last page
          event.preventDefault();
          scrollToPage(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfDocument, currentPage, totalPages]);

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div
      className="pdf-viewer"
      style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* ============================================================
          Header - Controls and Navigation
          ============================================================ */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          backgroundColor: '#f8f9fa',
          flexShrink: 0,
        }}
      >
        {/* File Picker Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
          }}
        >
          Open PDF
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Navigation Controls (only visible when PDF is loaded) */}
        {pdfDocument && (
          <>
            {/* Page Number Input - Jump to page */}
            <form
              onSubmit={handlePageInputSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span style={{ fontSize: '14px', color: '#666' }}>Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                style={{
                  width: '60px',
                  padding: '4px',
                  textAlign: 'center',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>of {totalPages}</span>
            </form>

            {/* Document Info and Keyboard Shortcuts */}
            <div
              style={{ marginLeft: 'auto', fontSize: '12px', color: '#666', textAlign: 'right' }}
            >
              <div>{pdfDocument.numPages} pages</div>
              <div style={{ fontSize: '11px', color: '#999' }}>↑↓ / PgUp/PgDn • Home/End</div>
            </div>
          </>
        )}
      </div>

      {/* ============================================================
          Content Area - PDF Display / Loading / Error States
          ============================================================ */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px',
              marginTop: '100px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #ddd',
                borderTop: '3px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#666', fontSize: '16px' }}>Loading PDF...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              maxWidth: '400px',
              textAlign: 'center',
              marginTop: '100px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Error Loading PDF</h3>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Welcome / Empty State */}
        {!pdfDocument && !loading && !error && (
          <div
            style={{
              textAlign: 'center',
              color: '#666',
              marginTop: '100px',
            }}
          >
            <h2 style={{ marginBottom: '15px', color: '#333' }}>AI PDF Reader</h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Click "Open PDF" to get started
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Once loaded, highlight text and ask AI questions about it
            </p>
          </div>
        )}

        {/* PDF Rendering - All Pages (Continuous Scroll) */}
        {pdfDocument && allPageObjects.length > 0 && !loading && (
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {allPageObjects.map((pageObject, index) => (
              <PdfPage
                key={`page-${index + 1}`}
                page={pageObject}
                pageNumber={index + 1}
                containerWidth={containerWidth}
                onPageRef={handlePageRef}
                onVisibilityChange={handlePageVisibilityChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          Inline Styles
          ============================================================ */}
      <style>{`
        /* Loading spinner animation */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Beautiful text selection color */
        .textLayer ::selection {
          background: rgba(0, 123, 255, 0.35);
          color: transparent;
        }

        .textLayer ::-moz-selection {
          background: rgba(0, 123, 255, 0.35);
          color: transparent;
        }

        /* Text layer must be positioned exactly */
        .textLayer {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 1;
          line-height: 1.0;
          cursor: text;
          z-index: 2;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Ensure ALL text elements (spans and divs) are properly styled */
        .textLayer span,
        .textLayer div:not(.endOfContent) {
          color: transparent !important;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          pointer-events: auto;
        }

        /* Ensure bold text, headers, and all font variations are selectable */
        .textLayer span[style*="font-weight"],
        .textLayer span[style*="font-size"],
        .textLayer span[style*="font-family"] {
          color: transparent !important;
          cursor: text;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
        }

        /* Prevent line breaks from affecting layout */
        .textLayer br {
          display: none;
        }

        /* End of content marker */
        .textLayer .endOfContent {
          display: block;
          position: absolute;
          left: 0;
          top: 100%;
          right: 0;
          bottom: 0;
          z-index: -1;
          cursor: default;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;
