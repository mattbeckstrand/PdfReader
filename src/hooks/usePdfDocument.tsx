import { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanPdfText } from '@lib/chunking';
import { ERROR_MESSAGES } from '@lib/constants';
import type { PdfDocument, PdfPage, PdfReaderError } from '@/types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  currentPageObject: pdfjsLib.PDFPageProxy | null;
}

/**
 * Hook for managing PDF document loading, navigation, and text extraction
 * Integrates with PDF.js for rendering and text extraction
 */
export function usePdfDocument(): UsePdfDocumentResult {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageText, setPageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PDF.js objects
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPageObject, setCurrentPageObject] = useState<pdfjsLib.PDFPageProxy | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Extract text from a PDF page
   */
  const extractPageText = useCallback(async (page: pdfjsLib.PDFPageProxy): Promise<string> => {
    try {
      const textContent = await page.getTextContent();
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
      
      return cleanPdfText(pageText);
    } catch (err) {
      console.error('Failed to extract text from page:', err);
      throw new Error(ERROR_MESSAGES.PDF_TEXT_EXTRACTION_FAILED);
    }
  }, []);

  /**
   * Load and change to a specific page
   */
  const loadPage = useCallback(async (pageNum: number) => {
    if (!pdfDocument || pageNum < 1 || pageNum > pdfDocument.numPages) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean up previous page
      if (currentPageObject) {
        currentPageObject.cleanup();
      }

      const page = await pdfDocument.getPage(pageNum);
      const text = await extractPageText(page);
      
      setCurrentPageObject(page);
      setPageText(text);
      setCurrentPage(pageNum);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.PDF_TEXT_EXTRACTION_FAILED;
      setError(errorMessage);
      console.error('Failed to load page:', err);
    } finally {
      setLoading(false);
    }
  }, [pdfDocument, currentPageObject, extractPageText]);

  /**
   * Load a PDF file
   */
  const loadPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setDocument(null);
    setPdfDocument(null);
    setCurrentPageObject(null);
    setPageText('');
    setCurrentPage(1);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      const pdfDoc = await loadingTask.promise;
      
      // Create our document metadata
      const metadata = await pdfDoc.getMetadata();
      const pdfDocument: PdfDocument = {
        id: crypto.randomUUID(),
        filePath: file.name,
        title: metadata.info?.Title || file.name,
        numPages: pdfDoc.numPages,
        metadata: {
          author: metadata.info?.Author,
          title: metadata.info?.Title,
          subject: metadata.info?.Subject,
          creator: metadata.info?.Creator,
          producer: metadata.info?.Producer,
          creationDate: metadata.info?.CreationDate ? new Date(metadata.info.CreationDate) : undefined,
          modificationDate: metadata.info?.ModDate ? new Date(metadata.info.ModDate) : undefined,
        }
      };

      setPdfDocument(pdfDoc);
      setDocument(pdfDocument);
      
      // Load first page
      await loadPage(1);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.PDF_LOAD_FAILED;
      setError(errorMessage);
      console.error('Failed to load PDF:', err);
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  /**
   * Navigation functions
   */
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

  const goToPage = useCallback((pageNum: number) => {
    if (pdfDocument && pageNum >= 1 && pageNum <= pdfDocument.numPages) {
      loadPage(pageNum);
    }
  }, [pdfDocument, loadPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentPageObject) {
        currentPageObject.cleanup();
      }
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [currentPageObject, pdfDocument]);

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