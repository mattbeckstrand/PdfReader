import React, { useCallback, useEffect, useState } from 'react';
import ChatSidebar, { Message } from './components/ChatSidebar';
import HighlightActionMenu from './components/HighlightActionMenu';
import PdfViewer from './components/PdfViewer';
import { useAskAI } from './hooks/useAskAI';
import { useHighlight } from './hooks/useHighlight';
import { usePdfDocument } from './hooks/usePdfDocument';

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

  const { highlightedText, selectionPosition, captureSelection, clearSelection } = useHighlight();

  const { ask, loading: aiLoading, answer, error: aiError, clearAnswer } = useAskAI();

  // ===================================================================
  // State
  // ===================================================================

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');

  // ===================================================================
  // Text Selection Handler
  // ===================================================================

  /**
   * Handle text selection events on the document
   */
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        captureSelection();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [captureSelection]);

  // ===================================================================
  // AI Response Handler
  // ===================================================================

  /**
   * When AI returns an answer, add it to messages
   */
  useEffect(() => {
    if (answer) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      clearAnswer();
    }
  }, [answer, clearAnswer]);

  /**
   * Handle AI errors by adding error message to chat
   */
  useEffect(() => {
    if (aiError) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${aiError}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [aiError]);

  // ===================================================================
  // Action Handlers
  // ===================================================================

  /**
   * Handle "Explain This" action
   */
  const handleExplain = useCallback(() => {
    if (!highlightedText) return;

    // Store context for follow-up questions
    setCurrentContext(highlightedText);

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Explain this: "${highlightedText}"`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Open chat sidebar
    setIsChatOpen(true);

    // Ask AI
    ask(`Explain this text in simple terms: "${highlightedText}"`, highlightedText, currentPage);

    // Clear selection
    clearSelection();
  }, [highlightedText, currentPage, ask, clearSelection]);

  /**
   * Handle "Ask AI" action
   */
  const handleAskAI = useCallback(() => {
    if (!highlightedText) return;

    // Store context
    setCurrentContext(highlightedText);

    // Open chat sidebar with context
    setIsChatOpen(true);

    // Add context message to chat
    const contextMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Context: "${highlightedText}"`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, contextMessage]);

    // Add prompt message
    const promptMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'What would you like to know about this text?',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, promptMessage]);

    // Clear selection
    clearSelection();
  }, [highlightedText, clearSelection]);

  /**
   * Handle "Define" action
   */
  const handleDefine = useCallback(() => {
    if (!highlightedText) return;

    // Store context
    setCurrentContext(highlightedText);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Define: "${highlightedText}"`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Open chat sidebar
    setIsChatOpen(true);

    // Ask for definition
    ask(`Provide a clear definition of: "${highlightedText}"`, highlightedText, currentPage);

    // Clear selection
    clearSelection();
  }, [highlightedText, currentPage, ask, clearSelection]);

  /**
   * Handle "Annotate" action
   */
  const handleAnnotate = useCallback(() => {
    if (!highlightedText) return;

    // For now, just show a message (can be enhanced later)
    alert(`Annotation feature coming soon!\n\nSelected text: "${highlightedText}"`);

    // Clear selection
    clearSelection();
  }, [highlightedText, clearSelection]);

  /**
   * Handle sending a message in the chat
   */
  const handleSendMessage = useCallback(
    (message: string) => {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Ask AI with context
      ask(message, currentContext, currentPage);
    },
    [currentContext, currentPage, ask]
  );

  /**
   * Handle closing the chat sidebar
   */
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  /**
   * Handle closing the action menu
   */
  const handleCloseMenu = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

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
      />

      {/* Highlight Action Menu */}
      {highlightedText && selectionPosition && (
        <HighlightActionMenu
          selectedText={highlightedText}
          position={selectionPosition}
          onExplain={handleExplain}
          onAskAI={handleAskAI}
          onDefine={handleDefine}
          onAnnotate={handleAnnotate}
          onClose={handleCloseMenu}
        />
      )}

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={aiLoading}
      />
    </div>
  );
};

export default App;
