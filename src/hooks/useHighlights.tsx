import { useCallback, useEffect, useState } from 'react';
import type { HighlightColor } from '../components/HighlightColorPicker';

// ===================================================================
// Types
// ===================================================================

export interface Highlight {
  id: string;
  pageNumber: number;
  color: HighlightColor;
  text: string;
  rects: DOMRect[]; // Bounding rectangles for the highlighted text
  timestamp: number;
}

interface UseHighlightsReturn {
  highlights: Highlight[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'timestamp'>) => void;
  removeHighlight: (id: string) => void;
  getHighlightsForPage: (pageNumber: number) => Highlight[];
  clearAllHighlights: () => void;
}

// ===================================================================
// Hook
// ===================================================================

/**
 * Hook for managing text highlights across PDF pages
 *
 * Features:
 * - Persistent storage via localStorage
 * - Per-document highlight storage
 * - Add/remove/query highlights
 */
export const useHighlights = (documentId: string | null): UseHighlightsReturn => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Load highlights from localStorage on mount or when document changes
  useEffect(() => {
    if (!documentId) {
      setHighlights([]);
      return;
    }

    const storageKey = `highlights-${documentId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHighlights(parsed);
      } catch (error) {
        console.error('Failed to parse highlights:', error);
        setHighlights([]);
      }
    } else {
      setHighlights([]);
    }
  }, [documentId]);

  // Save highlights to localStorage whenever they change
  useEffect(() => {
    if (!documentId) return;

    const storageKey = `highlights-${documentId}`;
    localStorage.setItem(storageKey, JSON.stringify(highlights));
  }, [highlights, documentId]);

  /**
   * Add a new highlight
   */
  const addHighlight = useCallback((highlight: Omit<Highlight, 'id' | 'timestamp'>) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHighlights(prev => [...prev, newHighlight]);
  }, []);

  /**
   * Remove a highlight by ID
   */
  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  /**
   * Get all highlights for a specific page
   */
  const getHighlightsForPage = useCallback(
    (pageNumber: number): Highlight[] => {
      return highlights.filter(h => h.pageNumber === pageNumber);
    },
    [highlights]
  );

  /**
   * Clear all highlights for the current document
   */
  const clearAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  return {
    highlights,
    addHighlight,
    removeHighlight,
    getHighlightsForPage,
    clearAllHighlights,
  };
};
