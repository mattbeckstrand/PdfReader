import 'katex/dist/katex.min.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { IconArrowUp, IconChat, IconClose, IconGrip } from './Icons';

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
  const userHasScrolledAwayRef = useRef<boolean>(false);
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 800;

  // Detect when user manually scrolls away from bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;

      if (isAtBottom) {
        // User scrolled back to bottom - re-enable auto-scroll
        userHasScrolledAwayRef.current = false;
      } else if (!userHasScrolledAwayRef.current) {
        // Check if this was an intentional scroll up
        const wasNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        if (!wasNearBottom) {
          // User scrolled significantly away - disable auto-scroll
          userHasScrolledAwayRef.current = true;
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only if user hasn't scrolled away
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Don't auto-scroll if user has manually scrolled away
    if (userHasScrolledAwayRef.current) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
          borderRadius: '10px',
          border: '1px solid #2a2a2a',
          background: 'linear-gradient(180deg, #101010, #0a0a0a)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.2s ease',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
        }}
        title={isOpen ? 'Close chat' : 'Open chat'}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <IconClose size={18} /> : <IconChat size={18} />}
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
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to right, rgba(255,255,255,0.06), rgba(255,255,255,0))',
          }}
          title="Drag to resize"
          aria-label="Drag to resize chat sidebar"
        >
          <IconGrip size={14} />
        </div>
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
          <span style={{ display: 'flex', alignItems: 'center', color: '#9aa4af' }}>
            <IconChat size={18} />
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>AI Chat</span>
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

        {/* Input Area - Show at top when no messages */}
        {messages.length === 0 && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '16px',
              borderBottom: '1px solid #1a1a1a',
              background: '#0a0a0a',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                background: 'linear-gradient(180deg, #0e0e10, #0b0b0d)',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '12px 14px',
                  paddingRight: '52px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '48px',
                  maxHeight: '120px',
                  lineHeight: '1.4',
                }}
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !currentQuestion.trim()}
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  background: currentQuestion.trim() && !isLoading ? '#fff' : '#2a2a2a',
                  color: currentQuestion.trim() && !isLoading ? '#000' : '#666',
                  border: 'none',
                  borderRadius: '50%',
                  padding: 0,
                  cursor: currentQuestion.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  boxShadow:
                    currentQuestion.trim() && !isLoading
                      ? '0 2px 8px rgba(255,255,255,0.2)'
                      : 'none',
                }}
                title={isLoading ? 'Sending...' : 'Send message'}
                aria-label="Send message"
              >
                {isLoading ? '...' : <IconArrowUp size={14} />}
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
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: sidebarWidth < 350 ? '12px 8px' : '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1 }} />
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {/* Message Content */}
                <div
                  style={{
                    padding: '8px 0',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#eee',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {msg.role === 'user' ? (
                    <div
                      style={{
                        background: 'linear-gradient(180deg, #0e0e10, #0b0b0d)',
                        border: '1px solid #2a2a2a',
                        borderRadius: '10px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        padding: '12px 14px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
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
                                padding: '8px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                margin: '4px 0',
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
                        // Style paragraphs
                        p: ({ children, ...props }: any) => (
                          <p style={{ margin: '8px 0 8px 0' }} {...props}>
                            {children}
                          </p>
                        ),
                        // Style headings - compact
                        h1: ({ children, ...props }: any) => (
                          <h1
                            style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 6px 0' }}
                            {...props}
                          >
                            {children}
                          </h1>
                        ),
                        h2: ({ children, ...props }: any) => (
                          <h2
                            style={{ fontSize: '15px', fontWeight: 600, margin: '10px 0 6px 0' }}
                            {...props}
                          >
                            {children}
                          </h2>
                        ),
                        h3: ({ children, ...props }: any) => (
                          <h3
                            style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px 0' }}
                            {...props}
                          >
                            {children}
                          </h3>
                        ),
                        // Style lists - minimal indentation
                        ul: ({ children, ...props }: any) => (
                          <ul
                            style={{
                              marginLeft: '12px',
                              marginTop: '4px',
                              marginBottom: '4px',
                              paddingLeft: '8px',
                            }}
                            {...props}
                          >
                            {children}
                          </ul>
                        ),
                        ol: ({ children, ...props }: any) => (
                          <ol
                            style={{
                              marginLeft: '12px',
                              marginTop: '4px',
                              marginBottom: '4px',
                              paddingLeft: '8px',
                            }}
                            {...props}
                          >
                            {children}
                          </ol>
                        ),
                        li: ({ children, ...props }: any) => (
                          <li style={{ marginBottom: '2px' }} {...props}>
                            {children}
                          </li>
                        ),
                        // Style blockquotes
                        blockquote: ({ children, ...props }: any) => (
                          <blockquote
                            style={{
                              borderLeft: '2px solid #444',
                              paddingLeft: '8px',
                              margin: '4px 0',
                              color: '#aaa',
                            }}
                            {...props}
                          >
                            {children}
                          </blockquote>
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
                gap: '4px',
                color: '#666',
                fontSize: '8px',
                padding: '0',
                marginTop: '-4px',
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
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Show at bottom when messages exist */}
        {messages.length > 0 && (
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
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                background: 'linear-gradient(180deg, #0e0e10, #0b0b0d)',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '12px 14px',
                  paddingRight: '52px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '48px',
                  maxHeight: '120px',
                  lineHeight: '1.4',
                }}
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !currentQuestion.trim()}
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  background: currentQuestion.trim() && !isLoading ? '#fff' : '#2a2a2a',
                  color: currentQuestion.trim() && !isLoading ? '#000' : '#666',
                  border: 'none',
                  borderRadius: '50%',
                  padding: 0,
                  cursor: currentQuestion.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  boxShadow:
                    currentQuestion.trim() && !isLoading
                      ? '0 2px 8px rgba(255,255,255,0.2)'
                      : 'none',
                }}
                title={isLoading ? 'Sending...' : 'Send message'}
                aria-label="Send message"
              >
                {isLoading ? '...' : <IconArrowUp size={14} />}
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
        )}
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
