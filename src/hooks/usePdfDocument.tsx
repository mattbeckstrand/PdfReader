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
  loadPdf: (file: File, filePathToStore?: string) => Promise<void>;
  setCurrentPage: (pageNum: number) => void;

  // For rendering
  pdfDocument: PDFDocumentProxy | null;

  // Original file (for File API upload)
  originalFile: File | null;
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

  // Original file (for File API upload to Gemini)
  const [originalFile, setOriginalFile] = useState<File | null>(null);

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
    async (file: File, filePathToStore?: string) => {
      console.log('🚀 [LOAD PDF] Called with:', { fileName: file.name, filePathToStore });
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

      // Store original file for File API
      setOriginalFile(file);

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
          filePath: filePathToStore || file.name,
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

        // Store file path for persistence (only if we have a real file path)
        if (filePathToStore) {
          console.log('💾 Storing PDF path for persistence:', filePathToStore);
          localStorage.setItem('lastPdfPath', filePathToStore);
          console.log(
            '✅ Stored in localStorage. Verification:',
            localStorage.getItem('lastPdfPath')
          );
        } else {
          console.warn('⚠️ No filePathToStore provided, path NOT stored in localStorage');
        }
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
  // Auto-load from localStorage
  // ===================================================================

  /**
   * On mount, check if there's a stored PDF path and reload it
   * This enables persistence across app refreshes
   */
  useEffect(() => {
    const loadStoredPdf = async () => {
      // Only try to load if we have the Electron API available
      if (!window.electronAPI?.file?.read) {
        console.log('⚠️ Electron file API not available, skipping auto-load');
        return;
      }

      console.log('🔍 [AUTO-RELOAD] Checking for stored PDF path...');
      const storedPath = localStorage.getItem('lastPdfPath');
      console.log('🔍 [AUTO-RELOAD] Stored path from localStorage:', storedPath);

      if (!storedPath) {
        console.log('ℹ️ [AUTO-RELOAD] No stored PDF path found');
        return;
      }

      console.log('🔄 [AUTO-RELOAD] Attempting to reload last PDF:', storedPath);
      setLoading(true);

      try {
        // Use Electron API to read the file
        const result = await window.electronAPI.file.read(storedPath);

        if (!result.success || !result.data || !result.name) {
          console.warn('⚠️ Failed to read stored PDF:', result.error);
          setError(`Could not reload previous PDF: ${result.error || 'File not found'}`);
          // Clear the stored path since it's no longer valid
          localStorage.removeItem('lastPdfPath');
          setLoading(false);
          return;
        }

        // Convert Uint8Array to File object
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const file = new File([blob], result.name, { type: 'application/pdf' });

        console.log('✅ [AUTO-RELOAD] Reloaded PDF file from storage:', {
          name: result.name,
          size: result.data.length,
          path: storedPath,
        });

        // Load the PDF and re-store the path to ensure it's available for extraction
        console.log('🔄 [AUTO-RELOAD] Calling loadPdf with storedPath:', storedPath);
        await loadPdf(file, storedPath);
        console.log(
          '✅ [AUTO-RELOAD] loadPdf completed. Verifying localStorage:',
          localStorage.getItem('lastPdfPath')
        );
      } catch (err) {
        console.error('❌ Failed to reload stored PDF:', err);
        setError('Could not reload previous PDF');
        localStorage.removeItem('lastPdfPath');
        setLoading(false);
      }
    };

    loadStoredPdf();
  }, []); // Run once on mount

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

    // Original file (for File API upload)
    originalFile,
  };
}
