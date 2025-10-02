import { MessageSquare } from 'lucide-react';
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
  const [contextPreview, setContextPreview] = useState<string>(''); // For showing context in input area

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

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+Shift+K (Mac) or Ctrl+Shift+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // Add user message to chat with shortened context preview
    const preview =
      highlightedText.length > 60 ? `${highlightedText.substring(0, 60)}...` : highlightedText;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `📄 Context: "${preview}"\n\nExplain this`,
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

    // Set context preview for input area
    const preview =
      highlightedText.length > 60 ? `${highlightedText.substring(0, 60)}...` : highlightedText;
    setContextPreview(preview);

    // Open chat sidebar (no messages added - context shown in input area)
    setIsChatOpen(true);

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

    // Add user message with shortened context preview
    const preview =
      highlightedText.length > 60 ? `${highlightedText.substring(0, 60)}...` : highlightedText;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `📄 Context: "${preview}"\n\nDefine this`,
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

      // Clear context preview after first message is sent
      setContextPreview('');

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
    setContextPreview(''); // Clear context preview when closing
  }, []);

  /**
   * Handle closing the action menu
   */
  const handleCloseMenu = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Toggle chat sidebar
   */
  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
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
      />

      {/* PDF Upload Progress Indicator */}
      {isUploading && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            color: '#888',
            padding: '30px 40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            textAlign: 'center',
            minWidth: '280px',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              border: '1px solid #333',
              borderTop: '1px solid #fff',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: '300',
              letterSpacing: '0.5px',
            }}
          >
            Preparing document for AI...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* AI Chat Button */}
      {contextInitialized && !isUploading && pdfDocument && (
        <button
          onClick={handleToggleChat}
          style={{
            position: 'fixed',
            top: '18px',
            right: '24px',
            backgroundColor: isChatOpen ? '#1a1a1a' : '#0a0a0a',
            border: '1px solid #333',
            color: isChatOpen ? '#fff' : '#888',
            padding: '0',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.borderColor = '#ffffff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = isChatOpen ? '#1a1a1a' : '#0a0a0a';
            e.currentTarget.style.color = isChatOpen ? '#fff' : '#888';
            e.currentTarget.style.borderColor = '#333';
          }}
          title="⌘⇧K"
        >
          <MessageSquare size={18} />
        </button>
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
        contextPreview={contextPreview}
      />
    </div>
  );
};

export default App;
