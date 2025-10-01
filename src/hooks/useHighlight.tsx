import { useState } from 'react';

export function useHighlight() {
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  function captureSelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setHighlightedText(selection.toString());
    }
  }

  return { highlightedText, captureSelection };
}
