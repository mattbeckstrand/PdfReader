import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import { useCallback, useMemo, useRef, useState } from 'react';
import { getContextWindow } from './context';
import { buildIndex } from './indexer';
import type { ContextRequestOptions, ContextResult, IndexedDocument } from './types';

interface UseContextualChunksArgs {
  allPageObjects: PDFPageProxy[];
}

interface UseContextualChunksResult {
  ready: boolean;
  index: IndexedDocument | null;
  build: () => Promise<void>;
  getContextForSelection: (
    pageNumber: number,
    selectedText?: string,
    options?: ContextRequestOptions
  ) => ContextResult;
}

export function useContextualChunks({
  allPageObjects,
}: UseContextualChunksArgs): UseContextualChunksResult {
  const [ready, setReady] = useState(false);
  const indexRef = useRef<IndexedDocument | null>(null);

  const build = useCallback(async () => {
    if (!allPageObjects || allPageObjects.length === 0) return;
    const pageData: { pageNumber: number; text: string }[] = [];
    for (const p of allPageObjects) {
      const textContent = await p.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });
      const text = textContent.items.map((it: any) => it.str).join('\n');
      pageData.push({ pageNumber: (p as any)._pageIndex + 1, text });
    }
    indexRef.current = buildIndex(pageData);
    setReady(true);
  }, [allPageObjects]);

  const getContextForSelection = useCallback(
    (pageNumber: number, selectedText?: string, options?: ContextRequestOptions): ContextResult => {
      if (!indexRef.current) return { focus: null, context: [] };
      return getContextWindow(indexRef.current, pageNumber, selectedText, options);
    },
    []
  );

  return useMemo(
    () => ({
      ready,
      index: indexRef.current,
      build,
      getContextForSelection,
    }),
    [ready, build, getContextForSelection]
  );
}
