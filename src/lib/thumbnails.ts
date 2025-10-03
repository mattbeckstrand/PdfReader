// ✅ CORRECT: Import from legacy build for Electron compatibility
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// ===================================================================
// Thumbnail Generation
// ===================================================================

export interface ThumbnailOptions {
  /** Max CSS width of the thumbnail image (logical pixels). Default: 280 */
  maxWidth?: number;
  /** Prefer this page if provided (1-based). */
  preferredPage?: number;
  /** Number of initial pages to scan for a good cover. Default: 3 */
  scanPages?: number;
  /** Image MIME type. Default: 'image/jpeg' */
  mimeType?: 'image/jpeg' | 'image/png';
  /** JPEG/PNG quality (0-1). Default: 0.9 for JPEG; ignored for PNG */
  quality?: number;
}

async function renderToCanvas(
  page: PDFPageProxy,
  cssWidth: number,
  dpr: number
): Promise<HTMLCanvasElement> {
  const baseViewport = page.getViewport({ scale: 1.0 });
  const scale = cssWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  // High-DPI support
  const internalWidth = Math.floor(viewport.width * dpr);
  const internalHeight = Math.floor(viewport.height * dpr);
  canvas.width = internalWidth;
  canvas.height = internalHeight;
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  // Paint white background to avoid transparent backgrounds affecting density or JPEG artifacts
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(dpr, dpr);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, viewport.width, viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

async function estimateContentDensity(page: PDFPageProxy): Promise<number> {
  // Render a tiny version to cheaply estimate non-white pixel ratio
  const tinyWidth = 160; // css pixels
  const dpr = 1; // keep small for speed
  const canvas = await renderToCanvas(page, tinyWidth, dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  let nonWhite = 0;
  const threshold = 245; // treat near-white as white
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // ignore alpha channel; canvas filled white, so alpha=255
    if (!(r >= threshold && g >= threshold && b >= threshold)) {
      nonWhite++;
    }
  }
  const total = width * height;
  return total > 0 ? nonWhite / total : 0;
}

async function pickBestCoverPage(
  pdfDocument: PDFDocumentProxy,
  options?: ThumbnailOptions
): Promise<PDFPageProxy> {
  const preferred = options?.preferredPage;
  if (preferred && preferred >= 1 && preferred <= pdfDocument.numPages) {
    return pdfDocument.getPage(preferred);
  }

  const pagesToScan = Math.min(pdfDocument.numPages, options?.scanPages ?? 3);
  let bestPage: PDFPageProxy | null = null;
  let bestDensity = -1;
  for (let i = 1; i <= pagesToScan; i++) {
    const page = await pdfDocument.getPage(i);
    try {
      const density = await estimateContentDensity(page);
      if (density > bestDensity) {
        bestDensity = density;
        if (bestPage) bestPage.cleanup();
        bestPage = page;
      } else {
        page.cleanup();
      }
    } catch {
      // If estimation fails, fallback to first page
      if (!bestPage) bestPage = page;
      else page.cleanup();
    }
  }
  if (!bestPage) {
    return pdfDocument.getPage(1);
  }
  return bestPage;
}

/**
 * Generate a thumbnail image from a PDF, picking a good cover page and rendering sharply on high-DPI screens.
 */
export async function generateThumbnail(
  pdfDocument: PDFDocumentProxy,
  options?: ThumbnailOptions
): Promise<string> {
  try {
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const maxWidth = options?.maxWidth ?? 280;
    const mimeType = options?.mimeType ?? 'image/jpeg';
    const quality = options?.quality ?? 0.9;

    // Select a good cover page
    const page = await pickBestCoverPage(pdfDocument, options);

    // Render at DPR-aware resolution for crisp output
    const canvas = await renderToCanvas(page, maxWidth, dpr);

    const dataUrl =
      mimeType === 'image/png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality);

    page.cleanup();
    return dataUrl;
  } catch (error) {
    console.error('❌ [THUMBNAIL] Failed to generate thumbnail:', error);
    throw error;
  }
}

/**
 * Generate thumbnail from a PDF file
 *
 * @param file - The PDF file to generate thumbnail from
 * @returns Base64 encoded image data
 */
export async function generateThumbnailFromFile(
  file: File,
  options?: ThumbnailOptions
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    const thumbnail = await generateThumbnail(pdfDocument, options);

    // Cleanup
    await pdfDocument.destroy();

    return thumbnail;
  } catch (error) {
    console.error('❌ [THUMBNAIL] Failed to generate thumbnail from file:', error);
    throw error;
  }
}
