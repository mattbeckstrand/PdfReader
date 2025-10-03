import type { ContextRequestOptions, ContextResult, IndexedDocument, Paragraph } from './types';

function findFocusParagraph(
  index: IndexedDocument,
  pageNumber: number,
  selectedText?: string
): Paragraph | null {
  const list = index.paragraphsByPage.get(pageNumber) || [];
  if (list.length === 0) return null;
  if (!selectedText || selectedText.trim().length === 0) return list[0];

  const needle = selectedText.trim();
  // Heuristic: choose paragraph with the longest overlap length
  let best: { para: Paragraph; score: number } | null = null;
  for (const para of list) {
    const i = para.text.indexOf(needle);
    if (i >= 0) {
      const score = needle.length; // exact substring match length
      if (!best || score > best.score) best = { para: para, score };
      continue;
    }
    // Fallback: token overlap heuristic
    const paraTokens = new Set(
      para.text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean)
    );
    const selTokens = new Set(
      needle
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean)
    );
    let overlap = 0;
    selTokens.forEach(t => {
      if (paraTokens.has(t)) overlap += 1;
    });
    if (!best || overlap > best.score) best = { para, score: overlap };
  }
  return best ? best.para : list[0];
}

export function getContextWindow(
  index: IndexedDocument,
  pageNumber: number,
  selectedText?: string,
  options?: ContextRequestOptions
): ContextResult {
  const windowBefore = options?.windowBefore ?? 2;
  const windowAfter = options?.windowAfter ?? 2;
  const minParagraphLength = options?.minParagraphLength ?? 40;

  const list = index.paragraphsByPage.get(pageNumber) || [];
  if (list.length === 0) return { focus: null, context: [] };

  const focus = findFocusParagraph(index, pageNumber, selectedText);
  if (!focus) return { focus: null, context: [] };

  const idx = list.findIndex(p => p.id === focus.id);
  const start = Math.max(0, idx - windowBefore);
  const end = Math.min(list.length - 1, idx + windowAfter);

  const windowParas = list.slice(start, end + 1);
  const filtered = windowParas.filter(p => p.text.trim().length >= minParagraphLength);

  return { focus, context: filtered };
}
