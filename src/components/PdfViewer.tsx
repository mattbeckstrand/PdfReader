import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfViewerProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  currentPageObject: pdfjsLib.PDFPageProxy | null;
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

/**
 * PDF Viewer component that renders PDFs with text selection support
 * Uses canvas for visual rendering and overlays transparent text layer for selection
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pageInput, setPageInput] = useState('');
  const [scale, setScale] = useState(1.0);

  /**
   * Render the PDF page on canvas with text layer
   */
  const renderPage = useCallback(async () => {
    if (!currentPageObject || !canvasRef.current || !textLayerRef.current || !containerRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const container = containerRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Clear previous content
    textLayer.innerHTML = '';

    // Calculate scale to fit container width
    const containerWidth = container.clientWidth - 40; // Account for padding
    const viewport = currentPageObject.getViewport({ scale: 1.0 });
    const calculatedScale = containerWidth / viewport.width;
    setScale(calculatedScale);

    const scaledViewport = currentPageObject.getViewport({ scale: calculatedScale });

    // Set canvas dimensions
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    canvas.style.width = `${scaledViewport.width}px`;
    canvas.style.height = `${scaledViewport.height}px`;

    // Set text layer dimensions
    textLayer.style.width = `${scaledViewport.width}px`;
    textLayer.style.height = `${scaledViewport.height}px`;

    // Render PDF page on canvas
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };

    try {
      await currentPageObject.render(renderContext).promise;

      // Render text layer for selection
      const textContent = await currentPageObject.getTextContent();
      
      // Use PDF.js built-in text layer rendering
      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayer,
        viewport: scaledViewport,
        textDivs: [],
        textContentItemsStr: [],
        isOffscreenCanvasSupported: false,
      });

      // Call callback when text is extracted
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
      }

    } catch (err) {
      console.error('Failed to render page:', err);
    }
  }, [currentPageObject, onTextExtracted]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await onLoadPdf(file);
    } else {
      alert('Please select a valid PDF file');
    }
    // Reset input
    event.target.value = '';
  }, [onLoadPdf]);

  /**
   * Handle page input change
   */
  const handlePageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(event.target.value);
  }, []);

  /**
   * Handle page navigation via input
   */
  const handlePageInputSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onGoToPage(pageNum);
    }
    setPageInput('');
  }, [pageInput, totalPages, onGoToPage]);

  /**
   * Handle window resize
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
   * Render page when current page changes
   */
  useEffect(() => {
    if (currentPageObject) {
      renderPage();
    }
  }, [currentPageObject, renderPage]);

  /**
   * Notify parent of page changes
   */
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  /**
   * Update page input when current page changes
   */
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  return (
    <div className="pdf-viewer" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        backgroundColor: '#f8f9fa',
        flexShrink: 0,
      }}>
        {/* File Loading */}
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
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Navigation Controls - only show when PDF is loaded */}
        {pdfDocument && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                <span style={{ fontSize: '14px', color: '#666' }}>
                  of {totalPages}
                </span>
              </form>

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

      {/* Content Area */}
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            marginTop: '100px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #ddd',
              borderTop: '3px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
            <p style={{ color: '#666', fontSize: '16px' }}>Loading PDF...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: '20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00',
            maxWidth: '400px',
            textAlign: 'center',
            marginTop: '100px',
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Error Loading PDF</h3>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Welcome State */}
        {!pdfDocument && !loading && !error && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            marginTop: '100px',
          }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>AI PDF Reader</h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Click "Open PDF" to get started
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Once loaded, highlight text and ask AI questions about it
            </p>
          </div>
        )}

        {/* PDF Rendering */}
        {pdfDocument && currentPageObject && !loading && (
          <div style={{
            position: 'relative',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {/* Canvas for PDF rendering */}
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
              }}
            />
            
            {/* Text layer for selection */}
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

      {/* CSS for loading animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .textLayer > span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        
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