import { useCallback, useRef, useState } from 'react';
import { detectMathAtPoint, detectMathInSelection, MathRegion } from '../lib/mathDetection';
import { extractImageFromCanvas, mathOCRService, OCRResult } from '../lib/ocrService';

// ===================================================================
// Type Definitions
// ===================================================================

interface SelectionPosition {
  x: number;
  y: number;
}

interface MathAwareSelectionResult {
  // Standard selection properties
  highlightedText: string | null;
  selectionPosition: SelectionPosition | null;

  // Math-specific properties
  mathContent: string | null;           // Clean LaTeX from OCR
  mathPlainText: string | null;         // Human-readable math text
  isMathMode: boolean;                  // Whether math was detected
  mathRegion: MathRegion | null;        // Math region details
  ocrConfidence: number | null;         // OCR confidence score
  processingOCR: boolean;               // Loading state for OCR
  ocrError: string | null;              // OCR error message

  // Methods
  captureSelection: () => void;                          // Standard capture
  captureSelectionWithMath: () => Promise<void>;        // OCR-enhanced capture
  captureClickMath: (x: number, y: number) => Promise<void>; // Single-click math
  correctMathContent: (latex: string) => void;          // User correction
  clearSelection: () => void;                            // Clear all state
}

// ===================================================================
// Hook Implementation
// ===================================================================

/**
 * Enhanced selection hook with mathematical content awareness
 *
 * Combines standard text selection with OCR-based math recognition
 * for seamless equation handling in PDF documents.
 */
export function useMathAwareSelection(): MathAwareSelectionResult {
  // ===================================================================
  // State
  // ===================================================================

  // Standard selection state
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);

  // Math-specific state
  const [mathContent, setMathContent] = useState<string | null>(null);
  const [mathPlainText, setMathPlainText] = useState<string | null>(null);
  const [isMathMode, setIsMathMode] = useState(false);
  const [mathRegion, setMathRegion] = useState<MathRegion | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Refs for tracking
  const abortController = useRef<AbortController | null>(null);

  // ===================================================================
  // Helper Functions
  // ===================================================================

  /**
   * Clear all state
   */
  const clearAllState = useCallback(() => {
    setHighlightedText(null);
    setSelectionPosition(null);
    setMathContent(null);
    setMathPlainText(null);
    setIsMathMode(false);
    setMathRegion(null);
    setOcrConfidence(null);
    setProcessingOCR(false);
    setOcrError(null);

    // Abort any ongoing OCR
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  /**
   * Update selection position from range
   */
  const updateSelectionPosition = useCallback((range: Range) => {
    const rect = range.getBoundingClientRect();
    setSelectionPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  /**
   * Find PDF canvas for image extraction
   */
  const findPdfCanvas = useCallback((): HTMLCanvasElement | null => {
    // Look for PDF canvas in the document
    const canvases = document.querySelectorAll('canvas');

    // Find the canvas that's part of a PDF page
    for (const canvas of canvases) {
      const parent = canvas.closest('[data-page-number], .pdf-page, .page');
      if (parent) {
        return canvas;
      }
    }

    // Fallback: return the largest canvas
    if (canvases.length > 0) {
      return Array.from(canvases).reduce((largest, current) =>
        (current.width * current.height) > (largest.width * largest.height) ? current : largest
      );
    }

    return null;
  }, []);

  /**
   * Process OCR for math region
   */
  const processOCR = useCallback(async (mathRegion: MathRegion): Promise<OCRResult | null> => {
    // Abort any existing OCR
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setProcessingOCR(true);
    setOcrError(null);

    try {
      // Find the PDF canvas
      const canvas = findPdfCanvas();
      if (!canvas) {
        throw new Error('Could not find PDF canvas for OCR processing');
      }

      // Calculate scale factor between screen coordinates and canvas
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;

      // Convert screen bbox to canvas coordinates
      const canvasBbox = {
        x: (mathRegion.bbox.x - canvasRect.left) * scaleX,
        y: (mathRegion.bbox.y - canvasRect.top) * scaleY,
        width: mathRegion.bbox.width * scaleX,
        height: mathRegion.bbox.height * scaleY,
      };

      // Extract image data
      const imageData = extractImageFromCanvas(canvas, canvasBbox);
      if (!imageData) {
        throw new Error('Failed to extract image data from canvas');
      }

      // Process with OCR
      const result = await mathOCRService.processEquation(imageData, canvasBbox, mathRegion);

      // Check if we were aborted
      if (abortController.current?.signal.aborted) {
        return null;
      }

      return result;

    } catch (error) {
      const errorObj = error as Error;
      if (errorObj.name === 'AbortError') {
        return null; // Silently handle aborts
      }
      
      console.error('OCR processing failed:', error);
      setOcrError(errorObj.message || 'OCR processing failed');
      return null;
    } finally {
      setProcessingOCR(false);
      abortController.current = null;
    }
  }, [findPdfCanvas]);

  // ===================================================================
  // Public Methods
  // ===================================================================

  /**
   * Standard text selection capture (existing functionality)
   */
  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      return;
    }

    const text = selection.toString().trim();
    setHighlightedText(text);

    const range = selection.getRangeAt(0);
    updateSelectionPosition(range);

    // Reset math state for standard capture
    setIsMathMode(false);
    setMathContent(null);
    setMathPlainText(null);
    setMathRegion(null);
    setOcrConfidence(null);
    setOcrError(null);
  }, [updateSelectionPosition]);

  /**
   * OCR-enhanced selection capture
   */
  const captureSelectionWithMath = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      return;
    }

    // 1. Standard text capture
    const text = selection.toString().trim();
    setHighlightedText(text);

    const range = selection.getRangeAt(0);
    updateSelectionPosition(range);

    // 2. Math detection
    const mathDetection = detectMathInSelection(selection);

    if (mathDetection.isMathContent && mathDetection.mathRegion) {
      console.log('🔢 Math content detected:', mathDetection);

      setIsMathMode(true);
      setMathRegion(mathDetection.mathRegion);

      // Use expanded selection if available
      if (mathDetection.expandedSelection) {
        const expandedText = mathDetection.expandedSelection.toString().trim();
        setHighlightedText(expandedText);

        const expandedRange = mathDetection.expandedSelection.getRangeAt(0);
        updateSelectionPosition(expandedRange);
      }

      // 3. Process with OCR
      try {
        const ocrResult = await processOCR(mathDetection.mathRegion);

        if (ocrResult) {
          setMathContent(ocrResult.latex);
          setMathPlainText(ocrResult.plainText);
          setOcrConfidence(ocrResult.confidence);

          console.log('✅ OCR completed:', {
            latex: ocrResult.latex,
            plainText: ocrResult.plainText,
            confidence: ocrResult.confidence,
            processingTime: ocrResult.processingTime,
          });
        }
      } catch (error) {
        console.error('OCR processing failed:', error);
        // Math mode stays active but without OCR results
      }
    } else {
      // No math detected - standard text mode
      setIsMathMode(false);
      setMathContent(null);
      setMathPlainText(null);
      setMathRegion(null);
      setOcrConfidence(null);
    }
  }, [updateSelectionPosition, processOCR]);

  /**
   * Single-click math capture (snap-to-equation)
   */
  const captureClickMath = useCallback(async (x: number, y: number) => {
    console.log('🎯 Click math detection at:', { x, y });

    // Detect math at the click point
    const mathDetection = detectMathAtPoint(x, y);

    if (mathDetection.isMathContent && mathDetection.mathRegion) {
      console.log('🔢 Math detected at click point:', mathDetection);

      setHighlightedText(mathDetection.textContent);
      setSelectionPosition({ x, y });
      setIsMathMode(true);
      setMathRegion(mathDetection.mathRegion);

      // Process with OCR
      try {
        const ocrResult = await processOCR(mathDetection.mathRegion);

        if (ocrResult) {
          setMathContent(ocrResult.latex);
          setMathPlainText(ocrResult.plainText);
          setOcrConfidence(ocrResult.confidence);

          console.log('✅ Click OCR completed:', {
            latex: ocrResult.latex,
            confidence: ocrResult.confidence,
          });
        }
      } catch (error) {
        console.error('Click OCR processing failed:', error);
      }
    } else {
      console.log('❌ No math content detected at click point');
    }
  }, [processOCR]);

  /**
   * Allow user to correct OCR results
   */
  const correctMathContent = useCallback((correctedLatex: string) => {
    setMathContent(correctedLatex);

    // Try to generate plain text from corrected LaTeX
    // This is a simplified conversion - in practice you might want a more sophisticated parser
    const plainText = correctedLatex
      .replace(/\\([a-zA-Z]+)/g, (match, cmd) => {
        const symbols: Record<string, string> = {
          'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
          'pi': 'π', 'theta': 'θ', 'lambda': 'λ', 'mu': 'μ',
          'sigma': 'σ', 'phi': 'φ', 'omega': 'ω',
          'infty': '∞', 'pm': '±', 'neq': '≠', 'approx': '≈',
          'sum': '∑', 'int': '∫', 'prod': '∏',
        };
        return symbols[cmd] || match;
      })
      .replace(/\{([^}]+)\}/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    setMathPlainText(plainText);

    // Update confidence to indicate user correction
    setOcrConfidence(0.95); // High confidence for user-corrected content

    console.log('✏️ Math content corrected:', {
      correctedLatex,
      plainText
    });
  }, []);

  /**
   * Clear selection and reset state
   */
  const clearSelection = useCallback(() => {
    clearAllState();

    // Clear browser selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, [clearAllState]);

  // ===================================================================
  // Return Hook Result
  // ===================================================================

  return {
    // Standard properties
    highlightedText,
    selectionPosition,

    // Math properties
    mathContent,
    mathPlainText,
    isMathMode,
    mathRegion,
    ocrConfidence,
    processingOCR,
    ocrError,

    // Methods
    captureSelection,
    captureSelectionWithMath,
    captureClickMath,
    correctMathContent,
    clearSelection,
  };
}
