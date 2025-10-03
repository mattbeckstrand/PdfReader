import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, ChatSidebar } from './components/ChatSidebar';
import PdfViewer from './components/PdfViewer';
import { useContextualChunks } from './features/contextual-chunking/useContextualChunks';
import { usePdfDocument } from './hooks/usePdfDocument';
import type { RegionSelection } from './types';

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

  // ===================================================================
  // State
  // ===================================================================

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

  // Streaming state using refs to persist across renders
  const streamStateRef = useRef({
    textBuffer: '',
    displayedText: '',
    isDone: false,
    currentRequestId: '',
  });

  // Set up streaming listener with smooth character-by-character rendering
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const displayNextChars = () => {
      const state = streamStateRef.current;
      const remainingChars = state.textBuffer.length - state.displayedText.length;
      const charsToAdd = Math.min(3, remainingChars);

      if (charsToAdd > 0) {
        state.displayedText = state.textBuffer.slice(0, state.displayedText.length + charsToAdd);

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];

          if (lastMessage && lastMessage.role === 'assistant') {
            return [...newMessages.slice(0, -1), { ...lastMessage, content: state.displayedText }];
          }

          return newMessages;
        });
      } else if (state.isDone && state.displayedText.length >= state.textBuffer.length) {
        // All text displayed and streaming is done
        setAsking(false);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    // Display characters every 30ms for smooth typewriter effect
    intervalId = setInterval(displayNextChars, 30);

    const cleanup = window.electronAPI.ai.onStreamChunk(data => {
      const state = streamStateRef.current;

      // If this is a new request, reset the state
      if (data.requestId !== state.currentRequestId) {
        state.textBuffer = '';
        state.displayedText = '';
        state.isDone = false;
        state.currentRequestId = data.requestId;
      }

      if (data.done) {
        state.isDone = true;
      } else if (data.chunk) {
        state.textBuffer += data.chunk;
      }
    });

    return () => {
      cleanup();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleAsk = useCallback(async () => {
    console.log('🤔 [ASK] Sending message');
    if (!question.trim()) {
      console.warn('⚠️ [ASK] No question entered');
      return;
    }

    // Capture conversation history BEFORE adding new messages
    // Get last 4 Q&A pairs (8 messages max)
    const conversationHistory = messages.slice(-8).map(msg => ({
      role: msg.role,
      content: msg.content,
      pageNumber: msg.pageNumber,
    }));

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
      pageNumber: lastSelection?.pageNumber,
    };
    setMessages(prev => [...prev, userMessage]);

    // Add empty assistant message that will be filled by streaming
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      pageNumber: lastSelection?.pageNumber,
    };
    setMessages(prev => [...prev, assistantMessage]);

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
        historyLength: conversationHistory.length,
      });

      const res = await window.electronAPI.ai.ask(
        currentQuestion,
        contextStrings,
        lastSelection?.pageNumber,
        lastSelection?.imageBase64, // Pass screenshot for multimodal AI
        conversationHistory // Pass conversation history
      );

      console.log('✅ [ASK] Streaming started with requestId:', res.requestId);
    } catch (e: any) {
      console.error('❌ [ASK] Error:', e);
      // Update the last assistant message with error
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = `Error: ${e?.message || 'Failed to get answer'}`;
        }
        return newMessages;
      });
      setAsking(false);
    }
  }, [question, extractResult.text, extractResult.latex, selectionContext, lastSelection]);

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
      <PdfViewer
        pdfDocument={pdfDocument}
        allPageObjects={allPageObjects}
        currentPage={currentPage}
        totalPages={totalPages}
        loading={loading}
        error={error}
        onLoadPdf={loadPdf}
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
    </div>
  );
};

export default App;
