import React, { useCallback, useEffect, useState } from 'react';
import ChatSidebar, { Message } from './components/ChatSidebar';
import HighlightActionMenu from './components/HighlightActionMenu';
import PdfViewer from './components/PdfViewer';
import { useHighlight } from './hooks/useHighlight';
import { usePdfContext } from './hooks/usePdfContext';
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
    document: pdfDocumentData,
    originalFile,
  } = usePdfDocument();

  const { highlightedText, selectionPosition, captureSelection, clearSelection } = useHighlight();

  const {
    initializeContext,
    ask: askWithContext,
    clearContext,
    contextInitialized,
    isUploading,
    loading: aiLoading,
    error: aiError,
  } = usePdfContext();

  // ===================================================================
  // State
  // ===================================================================

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [latestAnswer, setLatestAnswer] = useState<string | null>(null);

  // ===================================================================
  // Initialize PDF Context (Upload to Gemini)
  // ===================================================================

  /**
   * When PDF loads, upload it to Gemini for full document context
   */
  useEffect(() => {
    if (originalFile && pdfDocumentData && !contextInitialized && !isUploading) {
      console.log('🚀 PDF loaded, initializing AI context...');
      initializeContext(originalFile, {
        title: pdfDocumentData.title,
        pages: pdfDocumentData.numPages,
        author: pdfDocumentData.metadata?.author,
      }).catch(err => {
        console.error('Failed to initialize PDF context:', err);
      });
    }
  }, [originalFile, pdfDocumentData, contextInitialized, isUploading, initializeContext]);

  /**
   * Cleanup: Clear context when component unmounts or PDF changes
   */
  useEffect(() => {
    return () => {
      if (contextInitialized) {
        console.log('🧹 Component unmounting, clearing PDF context');
        clearContext().catch(err => console.error('Failed to clear context:', err));
      }
    };
  }, [contextInitialized, clearContext]);

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
    if (latestAnswer) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: latestAnswer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setLatestAnswer(null);
    }
  }, [latestAnswer]);

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
    if (!highlightedText || !contextInitialized) {
      if (!contextInitialized) {
        alert('Please wait for the PDF to be processed by AI...');
      }
      return;
    }

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

    // Ask AI with full PDF context
    askWithContext(
      `Explain this text in simple terms: "${highlightedText}"`,
      highlightedText,
      currentPage
    )
      .then(answer => {
        setLatestAnswer(answer);
      })
      .catch(err => {
        console.error('Failed to get AI response:', err);
      });

    // Clear selection
    clearSelection();
  }, [highlightedText, currentPage, askWithContext, clearSelection, contextInitialized]);

  /**
   * Handle "Ask AI" action
   */
  const handleAskAI = useCallback(() => {
    if (!highlightedText || !contextInitialized) {
      if (!contextInitialized) {
        alert('Please wait for the PDF to be processed by AI...');
      }
      return;
    }

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
  }, [highlightedText, clearSelection, contextInitialized]);

  /**
   * Handle "Define" action
   */
  const handleDefine = useCallback(() => {
    if (!highlightedText || !contextInitialized) {
      if (!contextInitialized) {
        alert('Please wait for the PDF to be processed by AI...');
      }
      return;
    }

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

    // Ask for definition with full PDF context
    askWithContext(
      `Provide a clear definition of: "${highlightedText}"`,
      highlightedText,
      currentPage
    )
      .then(answer => {
        setLatestAnswer(answer);
      })
      .catch(err => {
        console.error('Failed to get AI response:', err);
      });

    // Clear selection
    clearSelection();
  }, [highlightedText, currentPage, askWithContext, clearSelection, contextInitialized]);

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
      if (!contextInitialized) {
        alert('Please wait for the PDF to be processed by AI...');
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Ask AI with full PDF context
      askWithContext(message, currentContext, currentPage)
        .then(answer => {
          setLatestAnswer(answer);
        })
        .catch(err => {
          console.error('Failed to get AI response:', err);
        });
    },
    [currentContext, currentPage, askWithContext, contextInitialized]
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

      {/* PDF Upload Progress Indicator */}
      {isUploading && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '30px 40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            textAlign: 'center',
            minWidth: '300px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 600 }}>
            Preparing PDF for AI...
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Enabling full document understanding with vision
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Context Ready Indicator */}
      {contextInitialized && !isUploading && pdfDocument && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: '18px' }}>✓</span>
          <span>AI has full document context</span>
        </div>
      )}

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
