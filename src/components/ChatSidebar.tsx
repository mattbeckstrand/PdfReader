import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// ===================================================================
// Type Definitions
// ===================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  /** Whether the sidebar is visible */
  isOpen: boolean;
  /** Callback to close the sidebar */
  onClose: () => void;
  /** Current conversation messages */
  messages: Message[];
  /** Callback to send a message */
  onSendMessage: (message: string) => void;
  /** Loading state for AI response */
  isLoading: boolean;
}

// ===================================================================
// Component Implementation
// ===================================================================

/**
 * Chat sidebar that slides in from the right
 *
 * Features:
 * - Slides in/out with smooth animation
 * - Shows conversation history
 * - Input field for asking follow-up questions
 * - Auto-scrolls to latest message
 * - Clean, modern design
 */
const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
}) => {
  // ===================================================================
  // State & Refs
  // ===================================================================

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===================================================================
  // Effects
  // ===================================================================

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ===================================================================
  // Event Handlers
  // ===================================================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !isLoading) {
      onSendMessage(trimmedValue);
      setInputValue('');
    }
  };

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <>
      {/* Backdrop (darkens background when open) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 998,
            transition: 'opacity 0.3s',
            opacity: isOpen ? 1 : 0,
          }}
        />
      )}

      {/* Sidebar Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8f9fa',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>
            AI Assistant
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#e5e5e5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#999',
                marginTop: '40px',
              }}
            >
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>👋 Hi there!</p>
              <p style={{ fontSize: '14px' }}>
                Highlight text in the PDF and click "Explain This" to start a conversation.
              </p>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: message.role === 'user' ? '#007bff' : '#f1f1f1',
                  color: message.role === 'user' ? 'white' : '#333',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  wordWrap: 'break-word',
                }}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      // Style headings
                      h1: ({ node, ...props }) => (
                        <h1
                          style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginTop: '12px',
                            marginBottom: '8px',
                          }}
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            marginTop: '10px',
                            marginBottom: '6px',
                          }}
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            marginTop: '8px',
                            marginBottom: '4px',
                          }}
                          {...props}
                        />
                      ),
                      // Style lists
                      ul: ({ node, ...props }) => (
                        <ul
                          style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                      // Style paragraphs
                      p: ({ node, ...props }) => (
                        <p style={{ marginTop: '8px', marginBottom: '8px' }} {...props} />
                      ),
                      // Style code blocks
                      code: ({ node, inline, ...props }) =>
                        inline ? (
                          <code
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              fontSize: '13px',
                            }}
                            {...props}
                          />
                        ) : (
                          <code
                            style={{
                              display: 'block',
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              padding: '8px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              overflowX: 'auto',
                              marginTop: '8px',
                              marginBottom: '8px',
                            }}
                            {...props}
                          />
                        ),
                      // Style strong/bold
                      strong: ({ node, ...props }) => (
                        <strong style={{ fontWeight: '600' }} {...props} />
                      ),
                      // Style blockquotes
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          style={{
                            borderLeft: '3px solid #ddd',
                            paddingLeft: '12px',
                            marginLeft: '0',
                            fontStyle: 'italic',
                            color: '#666',
                          }}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#999',
                  marginTop: '4px',
                  paddingLeft: message.role === 'user' ? '0' : '8px',
                  paddingRight: message.role === 'user' ? '8px' : '0',
                }}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666',
                fontSize: '14px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e5e5',
                  borderTop: '2px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span>AI is thinking...</span>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            borderTop: '1px solid #e5e5e5',
            backgroundColor: 'white',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '12px 20px',
                backgroundColor: isLoading || !inputValue.trim() ? '#e5e5e5' : '#007bff',
                color: isLoading || !inputValue.trim() ? '#999' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#0056b3';
                }
              }}
              onMouseLeave={e => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#007bff';
                }
              }}
            >
              Send
            </button>
          </div>
        </form>

        {/* Inline CSS for spinner animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
};

export default ChatSidebar;
export type { Message };
