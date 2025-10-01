/**
 * Simple context extraction - gets text around a highlighted selection
 * No embeddings, no vector search - just grab surrounding sentences for AI context
 */

interface ContextExtractionOptions {
  sentencesBefore?: number;
  sentencesAfter?: number;
}

/**
 * Extracts context around a selected text within a page
 * Returns the selected text plus surrounding sentences for AI context
 */
export function getContextAroundSelection(
  pageText: string,
  selectedText: string,
  options: ContextExtractionOptions = {}
): string {
  const { sentencesBefore = 2, sentencesAfter = 2 } = options;

  // Split text into sentences
  const sentences = pageText.split(/(?<=[.!?])\s+/);

  // Find which sentence(s) contain the selection
  const selectionIndex = sentences.findIndex(sentence => sentence.includes(selectedText.trim()));

  if (selectionIndex === -1) {
    // If exact match not found, just return the selection
    return selectedText;
  }

  // Get surrounding sentences
  const startIndex = Math.max(0, selectionIndex - sentencesBefore);
  const endIndex = Math.min(sentences.length, selectionIndex + sentencesAfter + 1);

  const contextSentences = sentences.slice(startIndex, endIndex);
  return contextSentences.join(' ');
}

/**
 * Extracts text from a specific page (helper for PDF.js integration)
 * Cleans up common PDF artifacts
 */
export function cleanPdfText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\x00/g, '') // Remove null bytes
    .trim();
}
