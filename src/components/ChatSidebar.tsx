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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to get accurate scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Allow Shift+Enter for new lines (default textarea behavior)
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
          backgroundColor: '#0a0a0a',
          borderLeft: '1px solid #1a1a1a',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
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
            padding: '20px 24px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0a0a0a',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 300,
              color: '#888',
              letterSpacing: '0.5px',
            }}
          >
            AI Assistant
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: '2px',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.borderColor = '#ffffff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.borderColor = '#333';
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
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#666',
                marginTop: '60px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '300',
                  letterSpacing: '0.3px',
                  marginBottom: '8px',
                }}
              >
                Highlight text to start
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
                  borderRadius: '2px',
                  backgroundColor: message.role === 'user' ? '#1a1a1a' : '#0f0f0f',
                  border: message.role === 'user' ? '1px solid #333' : '1px solid #1a1a1a',
                  color: message.role === 'user' ? '#fff' : '#888',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontWeight: '300',
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
                  fontSize: '10px',
                  color: '#444',
                  marginTop: '4px',
                  fontWeight: '300',
                  letterSpacing: '0.3px',
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
                gap: '10px',
                color: '#666',
                fontSize: '13px',
                fontWeight: '300',
                letterSpacing: '0.3px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid #333',
                  borderTop: '1px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span>Processing...</span>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #1a1a1a',
            backgroundColor: '#0a0a0a',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask... (Shift+Enter for new line)"
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #333',
                borderRadius: '2px',
                fontSize: '13px',
                fontWeight: '300',
                letterSpacing: '0.3px',
                outline: 'none',
                backgroundColor: '#0a0a0a',
                color: '#fff',
                transition: 'border-color 0.15s',
                resize: 'none',
                overflow: 'hidden',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                minHeight: '40px',
                maxHeight: '200px',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#666';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#333';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: isLoading || !inputValue.trim() ? '#0a0a0a' : '#fff',
                color: isLoading || !inputValue.trim() ? '#444' : '#000',
                border: '1px solid #333',
                borderRadius: '2px',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '300',
                letterSpacing: '0.3px',
                transition: 'all 0.15s',
                height: '40px',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#ffffff';
                }
              }}
              onMouseLeave={e => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#333';
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
