import { useCallback, useState } from 'react';

// ===================================================================
// Type Definitions
// ===================================================================

interface SelectionPosition {
  x: number;
  y: number;
}

interface UseHighlightResult {
  highlightedText: string | null;
  selectionPosition: SelectionPosition | null;
  captureSelection: () => void;
  clearSelection: () => void;
}

// ===================================================================
// Hook Implementation
// ===================================================================

/**
 * Hook for capturing text selection and its position
 *
 * Features:
 * - Captures selected text from the document
 * - Tracks position for displaying action menu near selection
 * - Provides clear method to reset state
 */
export function useHighlight(): UseHighlightResult {
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);

  /**
   * Capture the current text selection and calculate its position
   */
  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const text = selection.toString().trim();
      setHighlightedText(text);

      // Get position of selection for menu placement
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position menu at the center-top of the selection
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, []);

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    setHighlightedText(null);
    setSelectionPosition(null);
  }, []);

  return {
    highlightedText,
    selectionPosition,
    captureSelection,
    clearSelection,
  };
}
