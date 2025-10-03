import { generateId, normalizeWhitespace } from '../../lib/utils';
import type { IndexedDocument, Paragraph } from './types';

function splitIntoParagraphs(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  const rawParagraphs = normalized.split(/\n\s*\n+/g);
  return rawParagraphs.map(p => p.trim()).filter(p => p.length > 0);
}

export function buildIndex(pages: { pageNumber: number; text: string }[]): IndexedDocument {
  const paragraphsByPage = new Map<number, Paragraph[]>();
  const allParagraphs: Paragraph[] = [];

  for (const p of pages) {
    const parts = splitIntoParagraphs(p.text);
    const paragraphs: Paragraph[] = parts.map((txt, idx) => ({
      id: generateId(),
      pageNumber: p.pageNumber,
      indexInPage: idx,
      text: txt,
    }));
    paragraphsByPage.set(p.pageNumber, paragraphs);
    allParagraphs.push(...paragraphs);
  }

  return { paragraphsByPage, allParagraphs };
}
