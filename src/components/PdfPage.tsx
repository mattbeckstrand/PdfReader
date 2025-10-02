import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ===================================================================
// Component Props Interface
// ===================================================================

interface PdfPageProps {
  page: PDFPageProxy;
  pageNumber: number;
  containerWidth: number;
  onPageRef?: (pageNum: number, element: HTMLDivElement | null) => void;
  onVisibilityChange?: (pageNum: number, isVisible: boolean) => void;
}

// ===================================================================
// Component Implementation
// ===================================================================

/**
 * Individual PDF page component with virtual rendering support
 * Uses Intersection Observer to only render visible pages for performance
 */
const PdfPage: React.FC<PdfPageProps> = ({
  page,
  pageNumber,
  containerWidth,
  onPageRef,
  onVisibilityChange,
}) => {
  // ===================================================================
  // Refs
  // ===================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef(false);

  // ===================================================================
  // State
  // ===================================================================

  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  // ===================================================================
  // Calculate Page Height
  // ===================================================================

  /**
   * Calculate page height without rendering (for placeholders)
   */
  useEffect(() => {
    if (containerWidth > 0 && pageHeight === null) {
      const viewport = page.getViewport({ scale: 1.0 });
      const calculatedScale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: calculatedScale });
      setPageHeight(scaledViewport.height);
    }
  }, [page, containerWidth, pageHeight]);

  // ===================================================================
  // Page Rendering
  // ===================================================================

  /**
   * Render the PDF page to canvas with text layer overlay
   * Only called when page becomes visible (virtual rendering)
   */
  const renderPage = useCallback(async () => {
    // Only render once per page
    if (hasRenderedRef.current) return;

    if (!canvasRef.current || !textLayerRef.current || containerWidth === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error(`❌ Cannot get 2D context for page ${pageNumber}`);
      return;
    }

    try {
      console.log(`🎨 Rendering page ${pageNumber}...`);
      hasRenderedRef.current = true;

      // Clear previous content
      textLayer.innerHTML = '';

      // Calculate responsive scale to fit container
      const viewport = page.getViewport({ scale: 1.0 });
      const calculatedScale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: calculatedScale });

      // High-DPI (Retina) display support
      const dpr = window.devicePixelRatio || 1;
      const outputScale = dpr;

      // Set canvas dimensions with proper scaling for crisp rendering
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;

      // Apply the output scale for high-DPI displays
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      // Enable high-quality rendering
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      // Set text layer dimensions to match canvas EXACTLY (using same floor values)
      const exactWidth = Math.floor(scaledViewport.width);
      const exactHeight = Math.floor(scaledViewport.height);

      textLayer.style.width = `${exactWidth}px`;
      textLayer.style.height = `${exactHeight}px`;
      textLayer.style.left = '0px';
      textLayer.style.top = '0px';

      // Render PDF page to canvas
      const renderContext: any = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      if (transform) {
        renderContext.transform = transform;
      }

      await page.render(renderContext).promise;

      // Extract and render text layer for selection using PDF.js renderer
      // Use normalizeWhitespace: false to preserve formatting like headers, bold text, etc.
      const textContent = await page.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });

      // Configure text layer rendering with maximum precision
      const textLayerRenderTask = (pdfjsLib as unknown as any).renderTextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport: scaledViewport,
        textDivs: [],
        textContentItemsStr: [],
        enhanceTextSelection: true, // Critical: adds extra divs for better text selection
      });

      if (textLayerRenderTask && textLayerRenderTask.promise) {
        await textLayerRenderTask.promise;
      }

      // Post-process ALL text elements (spans, divs) for perfect alignment and selectability
      const textElements = textLayer.querySelectorAll('span, div:not(.endOfContent)');
      textElements.forEach((element: HTMLElement) => {
        // Ensure ALL text elements are selectable regardless of styling
        element.style.pointerEvents = 'auto';
        element.style.userSelect = 'text';
        element.style.WebkitUserSelect = 'text';
        element.style.MozUserSelect = 'text';

        // Ensure proper cursor for all text
        element.style.cursor = 'text';

        // Make sure all text is transparent (so we see the rendered PDF behind it)
        if (!element.style.color || element.style.color !== 'transparent') {
          element.style.color = 'transparent';
        }
      });

      // Add end-of-content marker for better text selection at document end
      const endOfContent = document.createElement('div');
      endOfContent.className = 'endOfContent';
      textLayer.appendChild(endOfContent);

      setIsRendered(true);
      console.log(`✅ Page ${pageNumber} rendered successfully`);
    } catch (err) {
      console.error(`❌ Failed to render page ${pageNumber}:`, err);
    }
  }, [page, pageNumber, containerWidth]);

  // ===================================================================
  // Effects
  // ===================================================================

  /**
   * Intersection Observer for virtual rendering
   * Only render pages when they become visible (with buffer)
   */
  useEffect(() => {
    if (!pageContainerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const visible = entry.isIntersecting;
          setIsVisible(visible);

          // Notify parent of visibility change
          if (onVisibilityChange) {
            onVisibilityChange(pageNumber, visible);
          }
        });
      },
      {
        // Render pages that are within 200% of viewport (buffer above and below)
        rootMargin: '200% 0px 200% 0px',
        threshold: 0,
      }
    );

    observer.observe(pageContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [pageNumber, onVisibilityChange]);

  /**
   * Render page when it becomes visible and container width is ready
   */
  useEffect(() => {
    if (isVisible && containerWidth > 0 && !isRendered) {
      renderPage();
    }
  }, [isVisible, containerWidth, isRendered, renderPage]);

  /**
   * Pass ref to parent for scroll management
   */
  useEffect(() => {
    if (onPageRef && pageContainerRef.current) {
      onPageRef(pageNumber, pageContainerRef.current);
    }
    return () => {
      if (onPageRef) {
        onPageRef(pageNumber, null);
      }
    };
  }, [pageNumber, onPageRef]);

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div
      ref={pageContainerRef}
      data-page-number={pageNumber}
      style={{
        position: 'relative',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '20px',
        minHeight: pageHeight ? `${pageHeight}px` : '800px',
      }}
    >
      {/* Page Number Label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10,
        }}
      >
        Page {pageNumber}
      </div>

      {/* Loading Skeleton - shown before rendering */}
      {!isRendered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: pageHeight ? `${pageHeight}px` : '800px',
            backgroundColor: '#f5f5f5',
          }}
        >
          {isVisible && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid #e0e0e0',
                  borderTop: '3px solid #666',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ color: '#999', fontSize: '14px' }}>Loading page {pageNumber}...</span>
            </div>
          )}
        </div>
      )}

      {/* Canvas for visual PDF rendering */}
      <canvas
        ref={canvasRef}
        style={{
          display: isRendered ? 'block' : 'none',
          maxWidth: '100%',
        }}
      />

      {/* Text layer for selection (transparent overlay) */}
      <div
        ref={textLayerRef}
        className="textLayer"
        style={{
          display: isRendered ? 'block' : 'none',
        }}
      />
    </div>
  );
};

export default PdfPage;
