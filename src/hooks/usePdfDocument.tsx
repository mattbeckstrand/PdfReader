import { cleanPdfText } from '@lib/chunking';
import { ERROR_MESSAGES } from '@lib/constants';
import { useCallback, useEffect, useRef, useState } from 'react';

// ✅ CORRECT: Import from legacy build for Electron compatibility
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

import type { PdfDocument } from '../types';

// ===================================================================
// PDF.js Worker Setup - The Correct Way for Electron + Vite
// ===================================================================

if (typeof window !== 'undefined') {
  console.log('🔧 Configuring PDF.js worker (legacy build)...');

  // Determine worker path based on environment
  const isDev = import.meta.env.DEV === true;

  // In both dev and production, serve from root (public directory)
  // Vite serves public/ files at root, and built app will have worker at root
  const workerPath = '/pdf.worker.js';

  // Set the worker source to legacy build worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  console.log('✅ PDF.js worker configured:', {
    workerPath,
    isDev,
    build: 'legacy',
  });
}

// ===================================================================
// Hook Interface
// ===================================================================

interface UsePdfDocumentResult {
  // Document state
  document: PdfDocument | null;
  currentPage: number;
  totalPages: number;

  // Current page data
  pageText: string;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Actions
  loadPdf: (file: File) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (pageNum: number) => void;

  // For rendering
  pdfDocument: PDFDocumentProxy | null;
  currentPageObject: PDFPageProxy | null;
}

// ===================================================================
// Hook Implementation
// ===================================================================

/**
 * Hook for managing PDF document loading, navigation, and text extraction
 *
 * Built for Electron + React + Vite using PDF.js legacy build for maximum
 * compatibility with Electron's security model (contextIsolation, sandbox).
 *
 * Features:
 * - Load PDF from File object
 * - Page-by-page navigation
 * - Text extraction with cleanup
 * - Proper memory management (cleanup on unmount)
 * - Worker-based rendering for performance
 */
export function usePdfDocument(): UsePdfDocumentResult {
  // ===================================================================
  // State Management
  // ===================================================================

  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageText, setPageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF.js proxy objects
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPageObject, setCurrentPageObject] = useState<PDFPageProxy | null>(null);

  // Refs for cleanup (to avoid stale closures)
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const currentPageRef = useRef<PDFPageProxy | null>(null);

  // ===================================================================
  // Text Extraction
  // ===================================================================

  /**
   * Extract and clean text from a PDF page
   * Handles text items, spacing, and end-of-line markers
   */
  const extractPageText = useCallback(async (page: PDFPageProxy): Promise<string> => {
    console.log('📝 Extracting text from page...');
    try {
      const textContent = await page.getTextContent();
      console.log('📄 Text content received:', { itemCount: textContent.items.length });

      // Build text string from text items
      const textItems = textContent.items as Array<{ str: string; hasEOL?: boolean }>;
      let pageText = '';

      textItems.forEach(item => {
        pageText += item.str;
        // Add newline or space based on EOL marker
        if (item.hasEOL) {
          pageText += '\n';
        } else {
          pageText += ' ';
        }
      });

      // Clean up the text (remove extra whitespace, normalize)
      const cleanedText = cleanPdfText(pageText);
      console.log('✅ Text extracted and cleaned:', {
        originalLength: pageText.length,
        cleanedLength: cleanedText.length,
        preview: cleanedText.substring(0, 100) + '...',
      });

      return cleanedText;
    } catch (err) {
      console.error('❌ Failed to extract text from page:', err);
      throw new Error(ERROR_MESSAGES.PDF_TEXT_EXTRACTION_FAILED);
    }
  }, []);

  // ===================================================================
  // Page Management
  // ===================================================================

  /**
   * Load and render a specific page
   * Handles cleanup of previous page and text extraction
   */
  const loadPage = useCallback(
    async (pageNum: number) => {
      console.log('📖 Loading page:', pageNum);

      if (!pdfDocument) {
        console.warn('⚠️ No PDF document available');
        return;
      }

      if (pageNum < 1 || pageNum > pdfDocument.numPages) {
        console.warn('⚠️ Invalid page number:', { pageNum, totalPages: pdfDocument.numPages });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get the page proxy from PDF.js
        console.log('⏳ Getting page from PDF document...');
        const page = await pdfDocument.getPage(pageNum);
        console.log('✅ Page object received');

        // Extract text from the page
        console.log('⏳ Extracting text from page...');
        const text = await extractPageText(page);
        console.log('✅ Page text extracted');

        // Update state and refs
        setCurrentPageObject(page);
        currentPageRef.current = page;
        setPageText(text);
        setCurrentPage(pageNum);
        console.log('🎉 Page loaded successfully:', pageNum);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : ERROR_MESSAGES.PDF_TEXT_EXTRACTION_FAILED;
        setError(errorMessage);
        console.error('❌ Failed to load page:', { pageNum, error: err });
      } finally {
        setLoading(false);
      }
    },
    [pdfDocument, extractPageText] // Removed currentPageObject to prevent unnecessary recreations
  );

  // ===================================================================
  // Document Loading
  // ===================================================================

  /**
   * Load a PDF file into the viewer
   * Creates PDF.js document proxy and extracts metadata
   */
  const loadPdf = useCallback(
    async (file: File) => {
      console.log('📂 Loading PDF file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      });

      // Reset all state
      setLoading(true);
      setError(null);
      setDocument(null);
      setPdfDocument(null);
      setCurrentPageObject(null);
      setPageText('');
      setCurrentPage(1);

      try {
        // Convert File to ArrayBuffer for PDF.js
        console.log('⏳ Reading file as array buffer...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('✅ Array buffer created:', { byteLength: arrayBuffer.byteLength });

        // Create PDF.js loading task
        console.log('⏳ Creating PDF.js loading task...');
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          // CMap support for Unicode characters
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          // Use system fonts when possible
          useSystemFonts: true,
          // Disable eval for security (important in Electron)
          isEvalSupported: false,
        });

        // Track loading progress
        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
          const percent = progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;
          console.log('📈 PDF loading progress:', {
            loaded: progress.loaded,
            total: progress.total,
            percent,
          });
        };

        // Wait for PDF to load
        console.log('⏳ Waiting for PDF document to load...');
        const pdfDoc = await loadingTask.promise;
        console.log('✅ PDF document loaded:', {
          numPages: pdfDoc.numPages,
          fingerprints: pdfDoc.fingerprints,
        });

        // Extract metadata
        console.log('⏳ Extracting metadata...');
        const metadata = await pdfDoc.getMetadata();
        const info: any = metadata.info;
        console.log('📋 PDF metadata:', info);

        // Create our document object
        const pdfDocument: PdfDocument = {
          id: crypto.randomUUID(),
          filePath: file.name,
          title: info?.Title || file.name,
          numPages: pdfDoc.numPages,
          metadata: {
            author: info?.Author,
            title: info?.Title,
            subject: info?.Subject,
            creator: info?.Creator,
            producer: info?.Producer,
            creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
            modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined,
          },
        };

        console.log('✅ Document object created:', pdfDocument);

        // Update state and refs
        setPdfDocument(pdfDoc);
        pdfDocumentRef.current = pdfDoc;
        setDocument(pdfDocument);

        // Load first page
        console.log('⏳ Loading first page...');
        await loadPage(1);
        console.log('🎉 PDF loading completed successfully!');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.PDF_LOAD_FAILED;
        setError(errorMessage);
        console.error('❌ Failed to load PDF:', {
          fileName: file.name,
          error: err,
          stack: err instanceof Error ? err.stack : 'No stack trace',
        });
      } finally {
        setLoading(false);
      }
    },
    [loadPage]
  );

  // ===================================================================
  // Navigation Functions
  // ===================================================================

  const nextPage = useCallback(() => {
    if (pdfDocument && currentPage < pdfDocument.numPages) {
      loadPage(currentPage + 1);
    }
  }, [pdfDocument, currentPage, loadPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      loadPage(currentPage - 1);
    }
  }, [currentPage, loadPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      if (pdfDocument && pageNum >= 1 && pageNum <= pdfDocument.numPages) {
        loadPage(pageNum);
      }
    },
    [pdfDocument, loadPage]
  );

  // ===================================================================
  // Cleanup
  // ===================================================================

  /**
   * Clean up PDF.js objects on unmount ONLY
   * Important for preventing memory leaks
   * Uses refs to avoid stale closures and prevent cleanup on page changes
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up PDF resources');
      if (currentPageRef.current) {
        console.log('🧹 Cleanup: Destroying page object');
        currentPageRef.current.cleanup();
      }
      if (pdfDocumentRef.current) {
        console.log('🧹 Cleanup: Destroying PDF document');
        pdfDocumentRef.current.destroy();
      }
    };
  }, []); // Empty deps - only run on unmount

  // ===================================================================
  // Return Hook Interface
  // ===================================================================

  return {
    // Document state
    document,
    currentPage,
    totalPages: pdfDocument?.numPages || 0,

    // Current page data
    pageText,

    // Loading and error states
    loading,
    error,

    // Actions
    loadPdf,
    nextPage,
    prevPage,
    goToPage,

    // For rendering
    pdfDocument,
    currentPageObject,
  };
}
