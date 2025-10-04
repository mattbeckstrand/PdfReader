import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { captureCanvasRegion } from '../lib/utils';
import type { BoundingBox, RegionSelection } from '../types';
import { HighlightOverlay, type HighlightData } from './HighlightOverlay';

// ===================================================================
// Component Props Interface
// ===================================================================

interface PdfPageProps {
  page: PDFPageProxy;
  pageNumber: number;
  containerWidth: number;
  onPageRef?: (pageNum: number, element: HTMLDivElement | null) => void;
  onVisibilityChange?: (pageNum: number, isVisible: boolean) => void;
  onCanvasReady?: (pageNum: number, canvas: HTMLCanvasElement | null, scaleFactor?: number) => void;
  onRegionSelected?: (selection: RegionSelection) => void;
  highlights?: HighlightData[];
  onRemoveHighlight?: (id: string) => void;
  highlightModeActive?: boolean;
  highlightColor?: string;
  onTextHighlight?: (highlight: Omit<HighlightData, 'id' | 'timestamp'>) => void;
  zoom?: number;
  orientation?: number;
}

// ===================================================================
// Image Extraction Utility
// ===================================================================

/**
 * Extract image data from canvas region for OCR processing
 */
export function extractImageFromCanvasRegion(
  canvas: HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  scaleFactor: number = 1
): ImageData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    // Convert screen coordinates to canvas coordinates
    const x = Math.max(0, Math.floor(bbox.x * scaleFactor));
    const y = Math.max(0, Math.floor(bbox.y * scaleFactor));
    const width = Math.min(canvas.width - x, Math.floor(bbox.width * scaleFactor));
    const height = Math.min(canvas.height - y, Math.floor(bbox.height * scaleFactor));

    if (width <= 0 || height <= 0) return null;

    return ctx.getImageData(x, y, width, height);
  } catch (error) {
    console.error('Failed to extract image from canvas:', error);
    return null;
  }
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
  onCanvasReady,
  onRegionSelected,
  highlights = [],
  onRemoveHighlight,
  highlightModeActive = false,
  highlightColor = 'yellow',
  onTextHighlight,
  zoom = 1,
  orientation = 0,
}) => {
  // ===================================================================
  // Refs
  // ===================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef(false);
  const selectionOverlayRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // ===================================================================
  // State
  // ===================================================================

  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<BoundingBox | null>(null);

  // ===================================================================
  // Calculate Page Height
  // ===================================================================

  /**
   * Calculate page height without rendering (for placeholders)
   */
  useEffect(() => {
    if (containerWidth > 0) {
      const viewport = page.getViewport({ scale: 1.0, rotation: orientation });
      const calculatedScale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: calculatedScale, rotation: orientation });
      setPageHeight(scaledViewport.height);
    }
  }, [page, containerWidth, orientation]);

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
      const viewport = page.getViewport({ scale: 1.0, rotation: orientation });
      const calculatedScale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: calculatedScale, rotation: orientation });

      // Store scale factor for coordinate conversion (OCR needs this)
      setScaleFactor(calculatedScale);

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

      // Ensure overlay matches the same size
      if (selectionOverlayRef.current) {
        const overlay = selectionOverlayRef.current;
        overlay.style.width = `${exactWidth}px`;
        overlay.style.height = `${exactHeight}px`;
        overlay.style.left = '0px';
        overlay.style.top = '0px';
      }

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

      // Notify parent that canvas is ready for OCR
      if (onCanvasReady && canvas) {
        onCanvasReady(pageNumber, canvas, calculatedScale);
      }
    } catch (err) {
      console.error(`❌ Failed to render page ${pageNumber}:`, err);
    }
  }, [page, pageNumber, containerWidth, orientation, onCanvasReady]);

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
   * Force re-render when orientation changes (for already rendered pages)
   */
  useEffect(() => {
    if (isRendered && isVisible && containerWidth > 0) {
      // Reset render state to trigger re-render
      hasRenderedRef.current = false;
      setIsRendered(false);
    }
  }, [orientation]);

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

  /**
   * Cleanup canvas reference on unmount
   */
  useEffect(() => {
    return () => {
      if (onCanvasReady) {
        onCanvasReady(pageNumber, null);
      }
    };
  }, [pageNumber, onCanvasReady]);

  /**
   * Handle automatic text highlighting when in highlight mode
   */
  useEffect(() => {
    if (!highlightModeActive || !textLayerRef.current || !onTextHighlight) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
        return;
      }

      // Get the selected text and its bounding rectangles
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      const text = selection.toString().trim();

      // Convert client rects to page-relative coordinates and filter out artifacts
      const pageRect = pageContainerRef.current?.getBoundingClientRect();
      const MIN_RECT_WIDTH = 2; // Minimum width in pixels (filters out line breaks and empty fragments)
      const MIN_RECT_HEIGHT = 4; // Minimum height in pixels

      const relativeRects = rects
        .filter(rect => {
          // Filter out tiny rectangles that are layout artifacts
          // These are often line breaks, empty spans, or container boxes
          return rect.width >= MIN_RECT_WIDTH && rect.height >= MIN_RECT_HEIGHT;
        })
        .map(rect => {
          const relativeX = pageRect ? (rect.left - pageRect.left) / zoom : rect.left / zoom;
          const relativeY = pageRect ? (rect.top - pageRect.top) / zoom : rect.top / zoom;

          return {
            x: relativeX,
            y: relativeY,
            width: rect.width / zoom,
            height: rect.height / zoom,
          };
        });

      // Only add highlight if we have valid rectangles
      if (relativeRects.length === 0) {
        console.warn('No valid rectangles found for selection');
        selection.removeAllRanges();
        return;
      }

      // Add the highlight
      onTextHighlight({
        pageNumber,
        color: highlightColor as any,
        text,
        rects: relativeRects,
      });

      // Clear selection
      selection.removeAllRanges();
    };

    const textLayer = textLayerRef.current;
    textLayer.addEventListener('mouseup', handleMouseUp);

    return () => {
      textLayer.removeEventListener('mouseup', handleMouseUp);
    };
  }, [highlightModeActive, pageNumber, highlightColor, onTextHighlight, zoom]);

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
        className={`textLayer ${highlightModeActive ? 'highlight-active' : ''}`}
        style={{
          display: isRendered ? 'block' : 'none',
        }}
      />

      {/* Highlight overlay */}
      {isRendered && pageHeight && (
        <HighlightOverlay
          highlights={highlights}
          pageNumber={pageNumber}
          containerWidth={containerWidth}
          containerHeight={pageHeight}
          onRemoveHighlight={onRemoveHighlight}
        />
      )}

      {/* Selection overlay for region box drawing - only active when NOT in highlight mode */}
      {!highlightModeActive && (
        <div
          ref={selectionOverlayRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: isRendered ? 'block' : 'none',
            cursor: 'crosshair',
            zIndex: 3,
          }}
          onMouseDown={e => {
            if (!selectionOverlayRef.current) return;
            isDraggingRef.current = true;
            const rect = selectionOverlayRef.current.getBoundingClientRect();
            // Account for zoom: divide by zoom to get actual page coordinates
            const startX = (e.clientX - rect.left) / zoom;
            const startY = (e.clientY - rect.top) / zoom;
            dragStartRef.current = { x: startX, y: startY };
            setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
          }}
          onMouseMove={e => {
            if (!isDraggingRef.current || !selectionOverlayRef.current || !dragStartRef.current)
              return;
            const rect = selectionOverlayRef.current.getBoundingClientRect();
            // Account for zoom: divide by zoom to get actual page coordinates
            const currentX = (e.clientX - rect.left) / zoom;
            const currentY = (e.clientY - rect.top) / zoom;
            const startX = dragStartRef.current.x;
            const startY = dragStartRef.current.y;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            setSelectionBox({ x, y, width, height });
          }}
          onMouseUp={() => {
            if (!isDraggingRef.current || !selectionOverlayRef.current || !dragStartRef.current)
              return;
            isDraggingRef.current = false;
            const box = selectionBox;
            setTimeout(() => setSelectionBox(null), 0);
            dragStartRef.current = null;

            if (box && scaleFactor && onRegionSelected && canvasRef.current) {
              const cssBox = { ...box, x2: box.x + box.width, y2: box.y + box.height };
              const inv = 1 / scaleFactor;
              const pdfBox = {
                x: box.x * inv,
                y: box.y * inv,
                width: box.width * inv,
                height: box.height * inv,
                x2: (box.x + box.width) * inv,
                y2: (box.y + box.height) * inv,
              };

              // Capture screenshot of the selected region for multimodal AI
              const imageBase64 = captureCanvasRegion(
                canvasRef.current,
                box,
                window.devicePixelRatio || 1
              );

              const selection: RegionSelection = {
                pageNumber,
                css: cssBox,
                pdf: pdfBox,
                scaleFactor,
                timestamp: Date.now(),
                imageBase64: imageBase64 || undefined,
              };

              if (imageBase64) {
                console.log(
                  `📸 Captured screenshot for AI: ${Math.round(imageBase64.length / 1024)}KB`
                );
              }

              onRegionSelected(selection);
            }
          }}
          onMouseLeave={() => {
            if (isDraggingRef.current) {
              isDraggingRef.current = false;
              setSelectionBox(null);
              dragStartRef.current = null;
            }
          }}
        >
          {selectionBox && (
            <div
              style={{
                position: 'absolute',
                left: `${selectionBox.x}px`,
                top: `${selectionBox.y}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`,
                border: '1px solid rgba(0, 122, 255, 0.9)',
                background: 'rgba(0, 122, 255, 0.15)',
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PdfPage;
