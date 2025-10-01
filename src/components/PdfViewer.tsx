import React, { useCallback, useEffect, useRef, useState } from 'react';

// ✅ CORRECT: Import from legacy build for Electron compatibility
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';

// ===================================================================
// Component Props Interface
// ===================================================================

interface PdfViewerProps {
  pdfDocument: PDFDocumentProxy | null;
  currentPageObject: PDFPageProxy | null;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onLoadPdf: (file: File) => Promise<void>;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (pageNum: number) => void;
  onPageChange?: (pageNum: number) => void;
  onTextExtracted?: (text: string) => void;
}

// ===================================================================
// Component Implementation
// ===================================================================

/**
 * PDF Viewer component for rendering PDFs in Electron + React
 *
 * Features:
 * - Canvas-based PDF rendering using PDF.js legacy build
 * - Transparent text layer overlay for text selection
 * - Responsive scaling to fit container
 * - Navigation controls (prev/next/goto page)
 * - File picker for loading PDFs
 *
 * Built for Electron environment with proper worker communication
 */
const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  currentPageObject,
  currentPage,
  totalPages,
  loading,
  error,
  onLoadPdf,
  onNextPage,
  onPrevPage,
  onGoToPage,
  onPageChange,
  onTextExtracted,
}) => {
  // ===================================================================
  // Refs
  // ===================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ===================================================================
  // State
  // ===================================================================

  const [pageInput, setPageInput] = useState('');

  // ===================================================================
  // Page Rendering
  // ===================================================================

  /**
   * Render the current PDF page to canvas with text layer overlay
   * Handles responsive scaling and text extraction
   */
  const renderPage = useCallback(async () => {
    console.log('🎨 Starting page render...');

    // Validate prerequisites
    if (!currentPageObject) {
      console.warn('⚠️ No current page object for rendering');
      return;
    }
    if (!canvasRef.current || !textLayerRef.current || !containerRef.current) {
      console.warn('⚠️ DOM refs not available');
      return;
    }

    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const container = containerRef.current;
    console.log('✅ All DOM elements available for rendering');

    const context = canvas.getContext('2d');
    if (!context) {
      console.error('❌ Cannot get 2D context from canvas');
      return;
    }

    try {
      // Clear previous content
      textLayer.innerHTML = '';
      console.log('🧹 Text layer cleared');

      // Calculate responsive scale to fit container
      const containerWidth = container.clientWidth - 40; // Account for padding
      const viewport = currentPageObject.getViewport({ scale: 1.0 });
      const calculatedScale = containerWidth / viewport.width;

      console.log('🔍 Scaling calculation:', {
        containerWidth,
        pageWidth: viewport.width,
        scale: calculatedScale,
      });

      // Get viewport with calculated scale
      const scaledViewport = currentPageObject.getViewport({ scale: calculatedScale });
      console.log('📍 Viewport:', {
        width: scaledViewport.width,
        height: scaledViewport.height,
      });

      // Set canvas dimensions (both actual and CSS)
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;

      // Set text layer dimensions to match canvas
      textLayer.style.width = `${scaledViewport.width}px`;
      textLayer.style.height = `${scaledViewport.height}px`;
      console.log('✅ Canvas and text layer dimensions set');

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      console.log('⏳ Rendering PDF page to canvas...');
      await currentPageObject.render(renderContext).promise;
      console.log('✅ PDF page rendered to canvas');

      // Extract and render text layer for selection
      console.log('⏳ Getting text content for text layer...');
      const textContent = await currentPageObject.getTextContent();
      console.log('✅ Text content retrieved:', {
        itemCount: textContent.items.length,
      });

      // Render text layer manually for selection support
      console.log('⏳ Rendering text layer...');
      const textItems = textContent.items as Array<{
        str: string;
        transform: number[];
        width: number;
        height: number;
      }>;

      textItems.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.position = 'absolute';
        span.style.left = `${item.transform[4]}px`;
        span.style.top = `${item.transform[5]}px`;
        span.style.fontSize = `${Math.sqrt(
          item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]
        )}px`;
        span.style.fontFamily = 'sans-serif';
        textLayer.appendChild(span);
      });
      console.log('✅ Text layer rendered');

      // Call text extraction callback if provided
      if (onTextExtracted) {
        const textItems = textContent.items as Array<{ str: string; hasEOL?: boolean }>;
        let pageText = '';
        textItems.forEach(item => {
          pageText += item.str;
          if (item.hasEOL) {
            pageText += '\n';
          } else {
            pageText += ' ';
          }
        });
        onTextExtracted(pageText);
        console.log('✅ Text extracted for callback:', {
          length: pageText.length,
          preview: pageText.substring(0, 50) + '...',
        });
      }

      console.log('🎉 Page render completed successfully!');
    } catch (err) {
      console.error('❌ Failed to render page:', {
        error: err,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        currentPageNumber: currentPage,
      });
    }
  }, [currentPageObject, onTextExtracted, currentPage]);

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
        await onLoadPdf(file);
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
   * Handle page navigation via input field
   */
  const handlePageInputSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const pageNum = parseInt(pageInput, 10);
      if (pageNum >= 1 && pageNum <= totalPages) {
        onGoToPage(pageNum);
      }
      setPageInput('');
    },
    [pageInput, totalPages, onGoToPage]
  );

  // ===================================================================
  // Effects
  // ===================================================================

  /**
   * Handle window resize - re-render page with new scale
   */
  useEffect(() => {
    const handleResize = () => {
      if (currentPageObject) {
        renderPage();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPageObject, renderPage]);

  /**
   * Render page when current page object changes
   */
  useEffect(() => {
    if (currentPageObject) {
      renderPage();
    }
  }, [currentPageObject, renderPage]);

  /**
   * Notify parent component of page changes
   */
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  /**
   * Update page input field when current page changes
   */
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Previous Page Button */}
              <button
                onClick={onPrevPage}
                disabled={currentPage <= 1}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                Previous
              </button>

              {/* Page Number Input */}
              <form
                onSubmit={handlePageInputSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
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

              {/* Next Page Button */}
              <button
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                Next
              </button>
            </div>

            {/* Document Info */}
            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
              {pdfDocument.numPages} pages
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

        {/* PDF Rendering (Canvas + Text Layer) */}
        {pdfDocument && currentPageObject && !loading && (
          <div
            style={{
              position: 'relative',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {/* Canvas for visual PDF rendering */}
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
              }}
            />

            {/* Text layer for selection (transparent overlay) */}
            <div
              ref={textLayerRef}
              className="textLayer"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                color: 'transparent',
                transformOrigin: '0% 0%',
                mixBlendMode: 'normal',
                userSelect: 'text',
                cursor: 'text',
              }}
            />
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

        /* Text layer styles - transparent spans for text selection */
        .textLayer > span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }

        /* Highlight style for selected text */
        .textLayer .highlight {
          margin: -1px;
          padding: 1px;
          background-color: rgba(180, 0, 170, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;
