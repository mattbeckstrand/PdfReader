import React, { useCallback, useEffect, useRef, useState } from 'react';

// ✅ CORRECT: Import from legacy build for Electron compatibility
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';

import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import type { RegionSelection } from '../types';
import { PageThumbnailSidebar } from './PageThumbnailSidebar';
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
  onCanvasReady?: (pageNum: number, canvas: HTMLCanvasElement | null, scaleFactor?: number) => void;
  onRegionSelected?: (selection: RegionSelection) => void;
  onToggleChat?: () => void;
  documentMenuSlot?: React.ReactNode;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
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
  onCanvasReady,
  onRegionSelected,
  onToggleChat,
  documentMenuSlot,
  theme,
  onThemeToggle,
}) => {
  const MAX_PAGE_WIDTH = 900; // Keep in sync with wrapper style below
  // ===================================================================
  // Refs
  // ===================================================================

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===================================================================
  // State
  // ===================================================================

  const [pageInput, setPageInput] = useState('');
  const [containerWidth, setContainerWidth] = useState(0);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true; // Default to open
  });

  // Sidebar width with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.sidebarWidth');
    return saved !== null ? parseInt(saved, 10) : 200; // Default to 200px
  });

  // Zoom level with localStorage persistence
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.zoom');
    return saved !== null ? parseFloat(saved) : 1.0; // Default to 100%
  });

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
  // Sidebar State Persistence
  // ===================================================================

  /**
   * Persist sidebar state to localStorage
   */
  useEffect(() => {
    localStorage.setItem('pdfViewer.sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  /**
   * Persist sidebar width to localStorage
   */
  useEffect(() => {
    localStorage.setItem('pdfViewer.sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  /**
   * Persist zoom level to localStorage
   */
  useEffect(() => {
    localStorage.setItem('pdfViewer.zoom', zoom.toString());
  }, [zoom]);

  /**
   * Toggle sidebar visibility
   */
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  /**
   * Handle sidebar width change
   */
  const handleSidebarWidthChange = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  /**
   * Handle page selection from sidebar
   */
  const handlePageSelect = useCallback(
    (pageNum: number) => {
      const pageElement = pageRefsMap.current.get(pageNum);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      onSetCurrentPage(pageNum);
    },
    [onSetCurrentPage]
  );

  /**
   * Zoom control functions
   */
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 3.0)); // Max 300%
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5)); // Min 50%
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
  }, []);

  // ===================================================================
  // Event Handlers
  // ===================================================================

  /**
   * Handle opening file via Electron dialog
   */
  const handleOpenFile = useCallback(async () => {
    console.log('📁 [FILE SELECT] Opening Electron file dialog...');

    try {
      const result = await window.electronAPI.dialog.openFile();

      if (!result.success) {
        if (!(result as any).canceled) {
          console.error('❌ [FILE SELECT] Failed to open file:', result.error);
          alert(`Failed to open file: ${result.error}`);
        }
        return;
      }

      if (!result.data || !result.name || !result.path) {
        console.error('❌ [FILE SELECT] Invalid result from dialog');
        return;
      }

      console.log('📁 [FILE SELECT] Selected file:', {
        name: result.name,
        path: result.path,
        size: result.data.length,
      });

      // Convert Uint8Array to File object
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const file = new File([blob], result.name, { type: 'application/pdf' });

      console.log('📁 [FILE SELECT] Calling onLoadPdf with path:', result.path);
      await onLoadPdf(file, result.path);
      console.log('📁 [FILE SELECT] onLoadPdf completed');
    } catch (error) {
      console.error('❌ [FILE SELECT] Error opening file:', error);
      alert('Failed to open file');
    }
  }, [onLoadPdf]);

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
   * Keyboard shortcuts for navigation and zoom
   */
  useEffect(() => {
    if (!pdfDocument) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement) return;

      // Zoom shortcuts (Cmd/Ctrl + Plus/Minus/0)
      if (event.metaKey || event.ctrlKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          handleZoomIn();
          return;
        }
        if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          handleZoomOut();
          return;
        }
        if (event.key === '0') {
          event.preventDefault();
          handleResetZoom();
          return;
        }
      }

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
  }, [pdfDocument, currentPage, totalPages, handleZoomIn, handleZoomOut, handleResetZoom]);

  /**
   * Trackpad pinch-to-zoom handler
   * Listens for wheel events with Ctrl/Cmd key (pinch gesture on trackpads)
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const handleWheel = (event: WheelEvent) => {
      // Check if this is a pinch-zoom gesture (Ctrl/Cmd + wheel)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        // Calculate zoom delta (negative deltaY = zoom in, positive = zoom out)
        const delta = -event.deltaY;
        const zoomSpeed = 0.01; // Adjust sensitivity
        const zoomDelta = delta * zoomSpeed;

        setZoom(prev => {
          const newZoom = prev + zoomDelta;
          return Math.max(0.5, Math.min(3.0, newZoom)); // Clamp between 50% and 300%
        });
      }
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div
      className="pdf-viewer"
      style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Page Thumbnail Sidebar */}
      {pdfDocument && (
        <PageThumbnailSidebar
          pdfDocument={pdfDocument}
          allPageObjects={allPageObjects}
          currentPage={currentPage}
          onPageSelect={handlePageSelect}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
        />
      )}

      {/* ============================================================
          Header - Controls and Navigation
          ============================================================ */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--stroke-1)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          backgroundColor: 'var(--bg)',
          flexShrink: 0,
          // Keep header anchored to left - no margin shift
        }}
      >
        {/* Left side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sidebar Toggle Button (only visible when PDF is loaded) */}
          {pdfDocument && (
            <button
              onClick={handleToggleSidebar}
              className="btn"
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '400',
                cursor: 'pointer',
                border: '1px solid var(--stroke-1)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--text-1)',
                transition: 'all 0.15s ease',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--surface-3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={sidebarOpen ? 'Hide pages' : 'Show pages'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          )}

          {/* Document Menu (passed from parent) */}
          {documentMenuSlot}
        </div>

        {/* Navigation Controls (only visible when PDF is loaded) */}
        {pdfDocument && (
          <>
            {/* Page Number Input - Jump to page */}
            <form
              onSubmit={handlePageInputSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  fontWeight: '300',
                  letterSpacing: '0.3px',
                }}
              >
                Page
              </span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                style={{
                  width: '50px',
                  padding: '6px 8px',
                  textAlign: 'center',
                  border: '1px solid var(--stroke-1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '400',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  fontWeight: '300',
                  letterSpacing: '0.3px',
                }}
              >
                / {totalPages}
              </span>
            </form>
          </>
        )}

        {/* Right side controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle Button */}
          {theme && onThemeToggle && (
            <button
              onClick={onThemeToggle}
              className="btn"
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                border: '1px solid var(--stroke-1)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--text-1)',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--surface-3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon size={16} strokeWidth={2} />
              ) : (
                <Sun size={16} strokeWidth={2} />
              )}
            </button>
          )}

          {/* Chat Toggle Button */}
          <button
            onClick={onToggleChat}
            className="btn"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              border: '1px solid var(--stroke-1)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--text-1)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--surface-3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Toggle AI Chat"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </button>
        </div>
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
          backgroundColor: 'var(--bg)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginLeft: pdfDocument && sidebarOpen ? `${sidebarWidth}px` : '0',
          transition: 'margin-left 0.2s ease',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              marginTop: '100px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                border: '1px solid var(--stroke-2)',
                borderTop: '1px solid var(--text-1)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p
              style={{
                color: 'var(--text-2)',
                fontSize: '13px',
                fontWeight: '300',
                letterSpacing: '0.5px',
              }}
            >
              Loading document...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: '24px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--stroke-1)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-2)',
              maxWidth: '400px',
              textAlign: 'center',
              marginTop: '100px',
            }}
          >
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '13px',
                fontWeight: '300',
                letterSpacing: '0.5px',
              }}
            >
              Error loading document
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{error}</p>
          </div>
        )}

        {/* Welcome / Empty State */}
        {!pdfDocument && !loading && !error && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg)',
              padding: '40px',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                maxWidth: '600px',
              }}
            >
              {/* Title */}
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: '300',
                  marginBottom: '12px',
                  color: 'var(--text-1)',
                  letterSpacing: '0.5px',
                }}
              >
                AI PDF Reader
              </h1>
              <div
                style={{
                  width: '60px',
                  height: '1px',
                  backgroundColor: 'var(--stroke-2)',
                  margin: '0 auto 40px',
                }}
              />

              {/* Description */}
              <p
                style={{
                  fontSize: '15px',
                  marginBottom: '48px',
                  color: 'var(--text-2)',
                  lineHeight: '1.6',
                  fontWeight: '300',
                }}
              >
                Select text to interact with document intelligence
              </p>

              {/* CTA Button */}
              <button
                onClick={handleOpenFile}
                className="btn"
                style={{
                  padding: '14px 32px',
                  fontSize: '14px',
                  fontWeight: '400',
                  cursor: 'pointer',
                  border: '1px solid var(--stroke-1)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-1)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.5px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Open Document
              </button>

              {/* Keyboard Shortcut Hint */}
              <p
                style={{
                  marginTop: '60px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.5px',
                }}
              >
                ⌘O to open
              </p>
            </div>
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
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.1s ease-out',
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
                onCanvasReady={onCanvasReady}
                onRegionSelected={onRegionSelected}
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

        /* Text selection color - visible on white PDF background */
        .textLayer ::selection {
          background: rgba(0, 0, 0, 0.15);
          color: transparent;
        }

        .textLayer ::-moz-selection {
          background: rgba(0, 0, 0, 0.15);
          color: transparent;
        }

        /* Math mode selection - purple highlight for mathematical content */
        .textLayer.math-mode ::selection {
          background: rgba(139, 92, 246, 0.2);
          color: transparent;
        }

        .textLayer.math-mode ::-moz-selection {
          background: rgba(139, 92, 246, 0.2);
          color: transparent;
        }

        /* Math content indicator - subtle glow for detected math spans */
        .textLayer span.math-detected {
          box-shadow: 0 0 2px rgba(139, 92, 246, 0.4);
          border-radius: 2px;
        }

        /* Math region highlight - for auto-expanded selections */
        .textLayer .math-region-highlight {
          background: linear-gradient(90deg,
            rgba(139, 92, 246, 0.1) 0%,
            rgba(139, 92, 246, 0.05) 50%,
            rgba(139, 92, 246, 0.1) 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 4px;
          position: absolute;
          pointer-events: none;
          animation: mathHighlightPulse 1.5s ease-in-out;
        }

        /* Subtle animation for math detection */
        @keyframes mathHighlightPulse {
          0% {
            background: rgba(139, 92, 246, 0.2);
            transform: scale(1.02);
          }
          50% {
            background: rgba(139, 92, 246, 0.1);
            transform: scale(1);
          }
          100% {
            background: rgba(139, 92, 246, 0.05);
            transform: scale(1);
          }
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
