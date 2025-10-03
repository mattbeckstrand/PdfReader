import 'katex/dist/katex.min.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// ===================================================================
// Types
// ===================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pageNumber?: number;
  context?: string[];
}

interface ChatSidebarProps {
  messages: ChatMessage[];
  currentQuestion: string;
  onQuestionChange: (question: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  extractedText?: string;
  extractedLatex?: string;
}

// ===================================================================
// Component
// ===================================================================

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  currentQuestion,
  onQuestionChange,
  onSend,
  isLoading,
  isOpen,
  onToggle,
  extractedText,
  extractedLatex,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('chatSidebarWidth');
      const parsed = stored ? parseInt(stored, 10) : 400;
      if (!Number.isFinite(parsed)) return 400;
      return Math.min(Math.max(parsed, 280), 800);
    } catch {
      return 400;
    }
  });

  const isResizingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 800;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '' as any;
    };
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const delta = dragStartXRef.current - e.clientX;
    let next = startWidthRef.current + delta;
    next = Math.min(Math.max(next, MIN_WIDTH), MAX_WIDTH);
    setSidebarWidth(next);
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = '';
    document.body.style.userSelect = '' as any;
    try {
      localStorage.setItem('chatSidebarWidth', String(sidebarWidth));
    } catch {}
  }, [onMouseMove, sidebarWidth]);

  const startResizing = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      isResizingRef.current = true;
      dragStartXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none' as any;
    },
    [onMouseMove, stopResizing, sidebarWidth]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuestion.trim() && !isLoading) {
      onSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: '20px',
          right: isOpen ? `${sidebarWidth + 20}px` : '20px',
          zIndex: 1001,
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: '1px solid #333',
          background: '#1a1a1a',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: `${sidebarWidth}px`,
          height: '100vh',
          background: '#0a0a0a',
          borderLeft: '1px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 1000,
          boxShadow: isOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        }}
      >
        {/* Resizer Handle (left edge) */}
        <div
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1001,
            background: 'linear-gradient(to right, rgba(255,255,255,0.06), rgba(255,255,255,0))',
          }}
          title="Drag to resize"
        />
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>AI Chat</span>
          {messages.length > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '12px',
                color: '#666',
              }}
            >
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Context Display */}
        {(extractedText || extractedLatex) && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(10, 122, 255, 0.05)',
              borderBottom: '1px solid rgba(10, 122, 255, 0.2)',
              fontSize: '12px',
            }}
          >
            <div style={{ color: '#0af', marginBottom: '6px', fontWeight: '500' }}>
              📎 Selected Context
            </div>
            {extractedText && (
              <div
                style={{
                  color: '#aaa',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '100px',
                  overflow: 'auto',
                  lineHeight: '1.4',
                }}
              >
                {extractedText.substring(0, 200)}
                {extractedText.length > 200 ? '...' : ''}
              </div>
            )}
            {extractedLatex && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '4px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <div style={{ color: '#a78bfa', fontSize: '11px', marginBottom: '6px' }}>
                  LaTeX Extracted:
                </div>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }: any) => (
                      <div style={{ color: '#e0d0ff', fontSize: '13px', margin: 0 }}>
                        {children}
                      </div>
                    ),
                  }}
                >
                  {/* Convert MathPix format \( \) and \[ \] to $ and $$ for remark-math */}
                  {extractedLatex
                    .replace(/\\\(/g, '$')
                    .replace(/\\\)/g, '$')
                    .replace(/\\\[/g, '$$')
                    .replace(/\\\]/g, '$$')}
                </ReactMarkdown>
                {/* Show raw LaTeX for debugging */}
                <details style={{ marginTop: '6px' }}>
                  <summary style={{ color: '#666', fontSize: '10px', cursor: 'pointer' }}>
                    View raw LaTeX
                  </summary>
                  <pre
                    style={{
                      marginTop: '4px',
                      padding: '4px',
                      background: '#000',
                      color: '#8cf',
                      fontSize: '10px',
                      borderRadius: '2px',
                      overflow: 'auto',
                      maxHeight: '100px',
                    }}
                  >
                    {extractedLatex}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#888' }}>
                No messages yet
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                Select text in the PDF and ask a question to get started
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Message Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{msg.role === 'user' ? '👤' : '🤖'}</span>
                  <span style={{ fontWeight: '500', color: msg.role === 'user' ? '#0af' : '#8c8' }}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                  {msg.pageNumber && (
                    <span style={{ color: '#555', fontSize: '11px' }}>· Page {msg.pageNumber}</span>
                  )}
                  <span style={{ marginLeft: 'auto', color: '#555', fontSize: '11px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Message Content */}
                <div
                  style={{
                    background: msg.role === 'user' ? '#1a1a1a' : '#0f0f0f',
                    border: `1px solid ${msg.role === 'user' ? '#222' : '#1a1a1a'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#eee',
                  }}
                >
                  {msg.role === 'user' ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        // Style code blocks
                        code: ({ node, inline, className, children, ...props }: any) => {
                          return inline ? (
                            <code
                              style={{
                                background: '#1a1a1a',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre
                              style={{
                                background: '#1a1a1a',
                                padding: '12px',
                                borderRadius: '6px',
                                overflow: 'auto',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                            >
                              <code {...props}>{children}</code>
                            </pre>
                          );
                        },
                        // Style links
                        a: ({ children, ...props }: any) => (
                          <a style={{ color: '#0af', textDecoration: 'none' }} {...props}>
                            {children}
                          </a>
                        ),
                        // Style lists
                        ul: ({ children, ...props }: any) => (
                          <ul style={{ marginLeft: '20px', marginTop: '8px' }} {...props}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children, ...props }: any) => (
                          <ol style={{ marginLeft: '20px', marginTop: '8px' }} {...props}>
                            {children}
                          </ol>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666',
                fontSize: '13px',
              }}
            >
              <span style={{ fontSize: '16px' }}>🤖</span>
              <span>Thinking...</span>
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                }}
              >
                <span className="dot-pulse">●</span>
                <span className="dot-pulse" style={{ animationDelay: '0.2s' }}>
                  ●
                </span>
                <span className="dot-pulse" style={{ animationDelay: '0.4s' }}>
                  ●
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            borderTop: '1px solid #1a1a1a',
            background: '#0a0a0a',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={currentQuestion}
              onChange={e => onQuestionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the selected text..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                lineHeight: '1.4',
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !currentQuestion.trim()}
              style={{
                background: currentQuestion.trim() && !isLoading ? '#0a7aff' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: currentQuestion.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                height: '44px',
              }}
            >
              {isLoading ? '...' : '→'}
            </button>
          </div>
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#555',
              textAlign: 'center',
            }}
          >
            Press Enter to send · Shift+Enter for new line
          </div>
        </form>
      </div>

      {/* Animation Styles */}
      <style>
        {`
          @keyframes dot-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
          .dot-pulse {
            animation: dot-pulse 1.4s infinite;
          }
        `}
      </style>
    </>
  );
};
