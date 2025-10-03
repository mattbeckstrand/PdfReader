// Contextual chunking feature types

export interface Paragraph {
  id: string;
  pageNumber: number;
  indexInPage: number;
  text: string;
}

export interface IndexedDocument {
  paragraphsByPage: Map<number, Paragraph[]>;
  allParagraphs: Paragraph[];
}

export interface ContextRequestOptions {
  windowBefore?: number;
  windowAfter?: number;
  minParagraphLength?: number;
}

export interface ContextResult {
  focus: Paragraph | null;
  context: Paragraph[]; // ordered: previous ... focus ... next
}
