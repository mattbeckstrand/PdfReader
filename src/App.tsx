import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppNavigation, AppView } from './components/AppNavigation';
import { ChatMessage, ChatSidebar } from './components/ChatSidebar';
import { LibraryView } from './components/LibraryView';
import PdfViewer from './components/PdfViewer';
import { useContextualChunks } from './features/contextual-chunking/useContextualChunks';
import { useLibrary } from './hooks/useLibrary';
import { usePdfDocument } from './hooks/usePdfDocument';
import { generateThumbnail } from './lib/thumbnails';
import type { RegionSelection } from './types';
import type { LibraryDocument } from './types/library';

// ===================================================================
// Component Implementation
// ===================================================================

const App: React.FC = () => {
  // ===================================================================
  // Hooks
  // ===================================================================

  const {
    currentPage,
    totalPages,
    loading,
    error,
    loadPdf,
    setCurrentPage,
    pdfDocument,
    allPageObjects,
  } = usePdfDocument();

  const {
    documents,
    addOrUpdateDocument,
    updateReadingProgress,
    updateThumbnail,
    getDocumentByPath,
  } = useLibrary();

  // ===================================================================
  // State
  // ===================================================================

  const [currentView, setCurrentView] = useState<AppView>('library');
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [lastSelection, setLastSelection] = useState<RegionSelection | null>(null);
  const [extractResult, setExtractResult] = useState<{
    loading: boolean;
    success?: boolean;
    text?: string;
    latex?: string;
    source?: string;
    error?: string;
  }>({ loading: false });

  // Contextual chunking index + query
  const {
    ready: ctxReady,
    build: buildContextIndex,
    getContextForSelection,
  } = useContextualChunks({
    allPageObjects,
  });

  useEffect(() => {
    if (allPageObjects.length > 0) {
      void buildContextIndex();
    }
  }, [allPageObjects, buildContextIndex]);

  const selectionContext = useMemo(() => {
    if (!lastSelection || !ctxReady) return null;
    const selectedText = extractResult.text || '';
    return getContextForSelection(lastSelection.pageNumber, selectedText, {
      windowBefore: 2,
      windowAfter: 2,
      minParagraphLength: 30,
    });
  }, [lastSelection, ctxReady, extractResult.text, getContextForSelection]);

  // Chat state
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleAsk = useCallback(async () => {
    console.log('🤔 [ASK] Sending message');
    if (!question.trim()) {
      console.warn('⚠️ [ASK] No question entered');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
      pageNumber: lastSelection?.pageNumber,
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input and start loading
    const currentQuestion = question;
    setQuestion('');
    setAsking(true);

    try {
      const contextStrings: string[] = [];
      if (extractResult.text) contextStrings.push(extractResult.text);
      if (extractResult.latex) contextStrings.push(`LaTeX:\n${extractResult.latex}`);
      if (selectionContext?.context?.length) {
        contextStrings.push(
          ...selectionContext.context.map(p => `p.${p.pageNumber} ¶${p.indexInPage + 1}: ${p.text}`)
        );
      }

      console.log('🤔 [ASK] Sending to AI:', {
        question: currentQuestion,
        contextCount: contextStrings.length,
        pageNumber: lastSelection?.pageNumber,
      });

      const res = await window.electronAPI.ai.ask(
        currentQuestion,
        contextStrings,
        lastSelection?.pageNumber
      );

      console.log('✅ [ASK] AI Response received:', res);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res?.answer || 'No response received',
        timestamp: Date.now(),
        pageNumber: lastSelection?.pageNumber,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('❌ [ASK] Error:', e);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${e?.message || 'Failed to get answer'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAsking(false);
    }
  }, [question, extractResult.text, extractResult.latex, selectionContext, lastSelection]);

  // ===================================================================
  // PDF Loading and Library Integration
  // ===================================================================

  /**
   * Enhanced PDF loading with library integration
   */
  const handleLoadPdfWithLibrary = useCallback(
    async (file: File, filePathToStore?: string) => {
      console.log('📚 [LIBRARY] Loading PDF with library integration');

      // Load PDF using existing hook
      await loadPdf(file, filePathToStore);

      if (!filePathToStore) {
        console.warn('⚠️ [LIBRARY] No file path provided, skipping library save');
        return;
      }

      // Check if document already exists
      let existingDoc = getDocumentByPath(filePathToStore);

      if (!existingDoc) {
        // Create new library document
        console.log('📚 [LIBRARY] Creating new document entry');

        try {
          // Load PDF to get metadata
          const arrayBuffer = await file.arrayBuffer();
          const { getDocument } = await import('pdfjs-dist/legacy/build/pdf');
          const loadingTask = getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          // Generate high-DPI first-page thumbnail
          let thumbnailData: string | undefined;
          try {
            thumbnailData = await generateThumbnail(pdf, {
              maxWidth: 1200,
              scanPages: 1, // strictly first page
              mimeType: 'image/jpeg',
              quality: 0.92,
            });
          } catch (error) {
            console.error('❌ [LIBRARY] Failed to generate thumbnail:', error);
          }

          const newDoc: LibraryDocument = {
            id: `doc-${Date.now()}`,
            filePath: filePathToStore,
            title: file.name.replace('.pdf', ''),
            pageCount: pdf.numPages,
            thumbnail: thumbnailData,
            dateAdded: new Date(),
            lastOpened: new Date(),
            currentPage: 1,
            readingProgress: 0,
            collections: [],
            tags: [],
            isFavorite: false,
            topics: [],
            timeSpentReading: 0,
            highlightCount: 0,
          };

          addOrUpdateDocument(newDoc);
          setCurrentDocumentId(newDoc.id);

          await pdf.destroy();
        } catch (error) {
          console.error('❌ [LIBRARY] Failed to create document entry:', error);
        }
      } else {
        // Update existing document's last opened time
        console.log('📚 [LIBRARY] Updating existing document');
        addOrUpdateDocument({
          ...existingDoc,
          lastOpened: new Date(),
        });
        setCurrentDocumentId(existingDoc.id);
      }
    },
    [loadPdf, getDocumentByPath, addOrUpdateDocument]
  );

  /**
   * Open document from library
   */
  const handleOpenDocumentFromLibrary = useCallback(
    async (doc: LibraryDocument) => {
      console.log('📖 [LIBRARY] Opening document from library:', doc.title);

      try {
        // Use Electron API to load file
        const result = await window.electronAPI.file.read(doc.filePath);

        if (!result.success || !result.data) {
          alert(`Failed to open file: ${result.error || 'File not found'}`);
          return;
        }

        // Convert Uint8Array to File
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const file = new File([blob], doc.title + '.pdf', { type: 'application/pdf' });

        // Load PDF
        await loadPdf(file, doc.filePath);

        // Update library metadata
        addOrUpdateDocument({
          ...doc,
          lastOpened: new Date(),
        });

        setCurrentDocumentId(doc.id);
        setCurrentView('reader');

        // Jump to last read page if available
        if (doc.currentPage > 1) {
          setTimeout(() => {
            setCurrentPage(doc.currentPage);
          }, 500);
        }
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to open document:', error);
        alert('Failed to open document. The file may have been moved or deleted.');
      }
    },
    [loadPdf, addOrUpdateDocument, setCurrentPage]
  );

  /**
   * Add new document from library view
   */
  const handleAddDocumentFromLibrary = useCallback(async () => {
    try {
      const result = await window.electronAPI.dialog.openFile();

      if (!result.success) {
        if (!(result as any).canceled) {
          alert(`Failed to open file: ${result.error}`);
        }
        return;
      }

      if (!result.data || !result.name || !result.path) {
        return;
      }

      // Convert to File object
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const file = new File([blob], result.name, { type: 'application/pdf' });

      // Load PDF with library integration
      await handleLoadPdfWithLibrary(file, result.path);

      // Switch to reader view
      setCurrentView('reader');
    } catch (error) {
      console.error('❌ [LIBRARY] Error adding document:', error);
      alert('Failed to add document');
    }
  }, [handleLoadPdfWithLibrary]);

  // ===================================================================
  // Reading Progress Tracking
  // ===================================================================

  /**
   * Update reading progress when page changes
   */
  useEffect(() => {
    if (currentDocumentId && currentPage > 0 && totalPages > 0) {
      updateReadingProgress(currentDocumentId, currentPage, totalPages);
    }
  }, [currentDocumentId, currentPage, totalPages, updateReadingProgress]);

  /**
   * Update thumbnail when PDF is loaded (if missing)
   */
  useEffect(() => {
    if (currentDocumentId && pdfDocument) {
      const doc = documents.find(d => d.id === currentDocumentId);
      if (doc && !doc.thumbnail) {
        generateThumbnail(pdfDocument, { maxWidth: 1200, scanPages: 1 })
          .then(thumbnailData => {
            updateThumbnail(currentDocumentId, thumbnailData);
          })
          .catch(error => {
            console.error('❌ [THUMBNAIL] Failed to generate thumbnail:', error);
          });
      }
    }
  }, [currentDocumentId, pdfDocument, documents, updateThumbnail]);

  // ===================================================================
  // Action Handlers
  // ===================================================================

  /**
   * Handle region selection from PDF page
   */
  const handleRegionSelected = useCallback((selection: RegionSelection) => {
    setLastSelection(selection);
    setExtractResult({ loading: true });

    (async () => {
      try {
        console.log('🔍 [EXTRACTION] Attempting to retrieve PDF path from localStorage...');
        const pdfPath = localStorage.getItem('lastPdfPath');
        console.log('🔍 [EXTRACTION] Retrieved path:', pdfPath);
        console.log('🔍 [EXTRACTION] All localStorage keys:', Object.keys(localStorage));

        if (!pdfPath) {
          console.error('❌ [EXTRACTION] No PDF path found in localStorage!');
          setExtractResult({ loading: false, success: false, error: 'No PDF path available' });
          return;
        }

        console.log('✅ [EXTRACTION] Using PDF path:', pdfPath);
        console.log('✅ [EXTRACTION] Selection bbox:', {
          x: selection.pdf.x,
          y: selection.pdf.y,
          width: selection.pdf.width,
          height: selection.pdf.height,
          pageNumber: selection.pageNumber,
        });
        const res = await window.electronAPI.extract.region(pdfPath, selection.pageNumber, {
          x: selection.pdf.x,
          y: selection.pdf.y,
          width: selection.pdf.width,
          height: selection.pdf.height,
        });
        console.log('✅ [EXTRACTION] Full response:', res);
        console.log('✅ [EXTRACTION] LaTeX received:', res.latex);
        console.log('✅ [EXTRACTION] Text received:', res.text);
        console.log('✅ [EXTRACTION] Source:', res.source);
        if (res.success) {
          setExtractResult({
            loading: false,
            success: true,
            text: res.text,
            latex: res.latex,
            source: res.source,
          });
        } else {
          setExtractResult({
            loading: false,
            success: false,
            error: res.error || 'Extraction failed',
          });
        }
      } catch (err: any) {
        setExtractResult({
          loading: false,
          success: false,
          error: err?.message || 'Extraction error',
        });
      }
    })();
  }, []);

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <AppNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        hasOpenDocument={pdfDocument !== null}
      />

      {/* Library View */}
      {currentView === 'library' && (
        <LibraryView
          documents={documents}
          onOpenDocument={handleOpenDocumentFromLibrary}
          onAddDocument={handleAddDocumentFromLibrary}
        />
      )}

      {/* Reader View */}
      {currentView === 'reader' && (
        <>
          <PdfViewer
            pdfDocument={pdfDocument}
            allPageObjects={allPageObjects}
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loading}
            error={error}
            onLoadPdf={handleLoadPdfWithLibrary}
            onSetCurrentPage={setCurrentPage}
            onRegionSelected={handleRegionSelected}
          />

          {/* Chat Sidebar */}
          <ChatSidebar
            messages={messages}
            currentQuestion={question}
            onQuestionChange={setQuestion}
            onSend={handleAsk}
            isLoading={asking}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            extractedText={extractResult.success ? extractResult.text : undefined}
            extractedLatex={extractResult.success ? extractResult.latex : undefined}
          />
        </>
      )}
    </div>
  );
};

export default App;
