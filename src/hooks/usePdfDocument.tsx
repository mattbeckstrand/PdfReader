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

  // All pages data
  allPageObjects: PDFPageProxy[];

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Actions
  loadPdf: (file: File) => Promise<void>;
  setCurrentPage: (pageNum: number) => void;

  // For rendering
  pdfDocument: PDFDocumentProxy | null;
}

// ===================================================================
// Hook Implementation
// ===================================================================

/**
 * Hook for managing PDF document loading with continuous scroll support
 *
 * Built for Electron + React + Vite using PDF.js legacy build for maximum
 * compatibility with Electron's security model (contextIsolation, sandbox).
 *
 * Features:
 * - Load PDF from File object
 * - Load all pages for continuous scrolling
 * - Proper memory management (cleanup on unmount)
 * - Worker-based rendering for performance
 */
export function usePdfDocument(): UsePdfDocumentResult {
  // ===================================================================
  // State Management
  // ===================================================================

  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF.js proxy objects
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [allPageObjects, setAllPageObjects] = useState<PDFPageProxy[]>([]);

  // Refs for cleanup (to avoid stale closures)
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const allPageObjectsRef = useRef<PDFPageProxy[]>([]);

  // ===================================================================
  // Page Loading
  // ===================================================================

  /**
   * Load all pages from the PDF document at once
   * This enables continuous scrolling through all pages
   */
  const loadAllPages = useCallback(async (pdfDoc: PDFDocumentProxy): Promise<PDFPageProxy[]> => {
    console.log('📚 Loading all pages from PDF...');
    const totalPages = pdfDoc.numPages;
    const pagePromises: Promise<PDFPageProxy>[] = [];

    // Create promises for all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      pagePromises.push(pdfDoc.getPage(pageNum));
    }

    try {
      console.log(`⏳ Loading ${totalPages} pages...`);
      const pages = await Promise.all(pagePromises);
      console.log(`✅ All ${totalPages} pages loaded successfully`);
      return pages;
    } catch (err) {
      console.error('❌ Failed to load all pages:', err);
      throw new Error(ERROR_MESSAGES.PDF_LOAD_FAILED);
    }
  }, []);

  // ===================================================================
  // Document Loading
  // ===================================================================

  /**
   * Load a PDF file into the viewer
   * Creates PDF.js document proxy, extracts metadata, and loads all pages
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
      setAllPageObjects([]);
      setCurrentPage(1);

      try {
        // Convert File to ArrayBuffer for PDF.js
        console.log('⏳ Reading file as array buffer...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('✅ Array buffer created:', { byteLength: arrayBuffer.byteLength });

        // Create PDF.js loading task
        console.log('⏳ Creating PDF.js loading task...');
        // Configure font handling differently for Electron vs Web builds
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');

        const baseDocumentOptions = {
          data: new Uint8Array(arrayBuffer),
          // CMap support for Unicode characters
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          // Provide standard fonts over HTTPS to avoid CORS/font fallback issues on web
          standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
        } as const;

        const documentOptions = isElectron
          ? {
              ...baseDocumentOptions,
              // Electron: allow system fonts and keep eval disabled for security
              useSystemFonts: true,
              isEvalSupported: false,
            }
          : {
              ...baseDocumentOptions,
              // Web: avoid system font substitution, allow eval for accurate font engine
              useSystemFonts: false,
              isEvalSupported: true,
            };

        console.log('🛠 PDF.js getDocument options', { isElectron, documentOptions });

        const loadingTask = pdfjsLib.getDocument(documentOptions);

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

        // Load all pages for continuous scrolling
        console.log('⏳ Loading all pages...');
        const pages = await loadAllPages(pdfDoc);
        setAllPageObjects(pages);
        allPageObjectsRef.current = pages;
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
    [loadAllPages]
  );

  // ===================================================================
  // Cleanup
  // ===================================================================

  /**
   * Clean up PDF.js objects on unmount ONLY
   * Important for preventing memory leaks
   * Uses refs to avoid stale closures
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up PDF resources');

      // Cleanup all page objects
      if (allPageObjectsRef.current.length > 0) {
        console.log(`🧹 Cleanup: Destroying ${allPageObjectsRef.current.length} page objects`);
        allPageObjectsRef.current.forEach((page, index) => {
          try {
            page.cleanup();
          } catch (err) {
            console.warn(`⚠️ Failed to cleanup page ${index + 1}:`, err);
          }
        });
      }

      // Cleanup PDF document
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

    // All pages for rendering
    allPageObjects,

    // Loading and error states
    loading,
    error,

    // Actions
    loadPdf,
    setCurrentPage,

    // For rendering
    pdfDocument,
  };
}
