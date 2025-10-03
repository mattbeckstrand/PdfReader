import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ===================================================================
// Types
// ===================================================================

interface PageThumbnailSidebarProps {
  pdfDocument: PDFDocumentProxy | null;
  allPageObjects: PDFPageProxy[];
  currentPage: number;
  onPageSelect: (pageNum: number) => void;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Page thumbnail sidebar for quick navigation
 * Shows thumbnails of all pages with the current page highlighted
 */
export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
  pdfDocument,
  allPageObjects,
  currentPage,
  onPageSelect,
  isOpen,
  onClose,
  width,
  onWidthChange,
}) => {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const thumbnailRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // ===================================================================
  // Generate Thumbnails
  // ===================================================================

  /**
   * Generate thumbnail for a single page
   */
  const generateThumbnail = useCallback(async (page: PDFPageProxy, pageNum: number) => {
    try {
      // Higher scale for clearer thumbnails (like Apple Preview)
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) return null;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

      // High quality rendering
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      const renderContext: any = {
        canvasContext: context,
        viewport: viewport,
      };

      if (transform) {
        renderContext.transform = transform;
      }

      await page.render(renderContext).promise;

      // Higher quality JPEG for better clarity
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (error) {
      console.error(`Failed to generate thumbnail for page ${pageNum}:`, error);
      return null;
    }
  }, []);

  /**
   * Generate thumbnails for all pages
   */
  useEffect(() => {
    if (!pdfDocument || allPageObjects.length === 0) return;

    const generateAllThumbnails = async () => {
      const newThumbnails = new Map<number, string>();

      // Generate thumbnails in batches to avoid overwhelming the system
      for (let i = 0; i < allPageObjects.length; i++) {
        const pageNum = i + 1;
        const page = allPageObjects[i];

        const thumbnailData = await generateThumbnail(page, pageNum);
        if (thumbnailData) {
          newThumbnails.set(pageNum, thumbnailData);
          // Update state incrementally so thumbnails appear as they're generated
          setThumbnails(new Map(newThumbnails));
        }
      }
    };

    generateAllThumbnails();
  }, [pdfDocument, allPageObjects, generateThumbnail]);

  // ===================================================================
  // Scroll to Current Page
  // ===================================================================

  /**
   * Scroll thumbnail list to show current page
   */
  useEffect(() => {
    if (!isOpen) return;

    const thumbnailElement = thumbnailRefsMap.current.get(currentPage);
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage, isOpen]);

  // ===================================================================
  // Handlers
  // ===================================================================

  const handleThumbnailClick = useCallback(
    (pageNum: number) => {
      onPageSelect(pageNum);
    },
    [onPageSelect]
  );

  const handleThumbnailRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
    if (element) {
      thumbnailRefsMap.current.set(pageNum, element);
    } else {
      thumbnailRefsMap.current.delete(pageNum);
    }
  }, []);

  // ===================================================================
  // Resize Handlers
  // ===================================================================

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(150, Math.min(400, resizeStartWidth.current + delta));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  // ===================================================================
  // Render
  // ===================================================================

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '73px', // Start below PDF header
        bottom: 0,
        width: `${width}px`,
        backgroundColor: 'var(--bg)',
        borderRight: '1px solid var(--stroke-1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* Thumbnail List - No header, just like Apple Preview */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {allPageObjects.map((_, index) => {
          const pageNum = index + 1;
          const thumbnailData = thumbnails.get(pageNum);
          const isCurrentPage = pageNum === currentPage;

          return (
            <div
              key={pageNum}
              ref={el => handleThumbnailRef(pageNum, el)}
              onClick={() => handleThumbnailClick(pageNum)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                backgroundColor: isCurrentPage ? 'var(--accent-bg)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isCurrentPage) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                }
              }}
              onMouseLeave={e => {
                if (!isCurrentPage) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Thumbnail Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                  border: isCurrentPage
                    ? '2px solid var(--accent)'
                    : '1px solid rgba(0, 0, 0, 0.15)',
                  backgroundColor: 'white',
                }}
              >
                {/* Thumbnail Image */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '8.5 / 11',
                    backgroundColor: thumbnailData ? 'white' : '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {thumbnailData ? (
                    <img
                      src={thumbnailData}
                      alt={`Page ${pageNum}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #ddd',
                        borderTop: '2px solid #888',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Page Number Label - Below thumbnail like Apple Preview */}
              <div
                style={{
                  marginTop: '4px',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: isCurrentPage ? '600' : '400',
                  color: isCurrentPage ? 'var(--text-1)' : 'var(--text-2)',
                  letterSpacing: '0.02em',
                }}
              >
                {pageNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'ew-resize',
          backgroundColor: isResizing ? 'var(--accent)' : 'transparent',
          transition: 'background-color 0.15s ease',
          zIndex: 101,
        }}
        onMouseEnter={e => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'var(--stroke-2)';
          }
        }}
        onMouseLeave={e => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Drag to resize"
      />
    </div>
  );
};
