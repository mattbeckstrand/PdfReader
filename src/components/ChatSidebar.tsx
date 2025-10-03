import 'katex/dist/katex.min.css';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { IconArrowUp, IconChat, IconClose } from './Icons';

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
  hasActiveContext?: boolean; // Whether there's an active selection/extraction
  activeContextData?: string[]; // The actual context strings to display
  onClearContext?: () => void; // Callback to clear the active context
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
  hasActiveContext = false,
  activeContextData = [],
  onClearContext,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userHasScrolledAwayRef = useRef<boolean>(false);

  // Minimized state - when true, shows as small pill
  const [isMinimized, setIsMinimized] = useState(false);

  // Track which message contexts are expanded
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(new Set());

  // Track if the active context (in input box) is expanded
  const [isActiveContextExpanded, setIsActiveContextExpanded] = useState(false);

  // Track hover state for context badge
  const [isContextHovered, setIsContextHovered] = useState(false);

  // Resize and position state
  const [chatSize, setChatSize] = useState({ width: 450, height: 600 });
  const [chatPosition, setChatPosition] = useState({ bottom: 24, right: 24 });
  const isResizingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, bottom: 0, right: 0 });

  // Handle resize and drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const deltaX = resizeStartRef.current.x - e.clientX;
        const deltaY = resizeStartRef.current.y - e.clientY;

        const newWidth = Math.max(350, Math.min(800, resizeStartRef.current.width + deltaX));
        const newHeight = Math.max(400, Math.min(900, resizeStartRef.current.height + deltaY));

        setChatSize({ width: newWidth, height: newHeight });
      } else if (isDraggingRef.current) {
        const deltaX = dragStartRef.current.x - e.clientX;
        const deltaY = e.clientY - dragStartRef.current.y;

        const newRight = Math.max(10, dragStartRef.current.right + deltaX);
        const newBottom = Math.max(10, dragStartRef.current.bottom - deltaY);

        setChatPosition({ right: newRight, bottom: newBottom });
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatSize, chatPosition]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: chatSize.width,
      height: chatSize.height,
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: chatPosition.bottom,
      right: chatPosition.right,
    };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

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

  // Don't render if not open
  if (!isOpen) return null;

  // Render minimized pill
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50px',
          padding: '12px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
        }}
      >
        <IconChat size={18} />
        <span>AI Chat</span>
        {messages.length > 0 && (
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
            }}
          >
            {messages.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Floating Popover */}
      <div
        style={{
          position: 'fixed',
          bottom: `${chatPosition.bottom}px`,
          right: `${chatPosition.right}px`,
          width: `${chatSize.width}px`,
          height: `${chatSize.height}px`,
          zIndex: 1000,
          background: '#0a0a0a',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Drag handle - top bar */}
        <div
          onMouseDown={handleDragStart}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            cursor: 'move',
            zIndex: 9,
          }}
          title="Drag to move chat"
        />

        {/* Resize handle - top-left corner (visible) */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '12px',
            height: '12px',
            cursor: 'nwse-resize',
            zIndex: 12,
            borderLeft: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            opacity: 0.5,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
          title="Resize chat"
        />
        {/* Floating control buttons in top-right corner */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            gap: '6px',
            zIndex: 10,
          }}
        >
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#aaa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              width: '28px',
              height: '28px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
              e.currentTarget.style.color = '#aaa';
            }}
            title="Minimize"
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>−</span>
          </button>
          {/* Close Button */}
          <button
            onClick={onToggle}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#aaa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              width: '28px',
              height: '28px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
              e.currentTarget.style.color = '#aaa';
            }}
            title="Close"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            paddingTop: '48px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1 }} />
          ) : (
            messages.map(msg => {
              const isContextExpanded = expandedContexts.has(msg.id);
              const toggleContext = () => {
                setExpandedContexts(prev => {
                  const next = new Set(prev);
                  if (next.has(msg.id)) {
                    next.delete(msg.id);
                  } else {
                    next.add(msg.id);
                  }
                  return next;
                });
              };

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
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
                      maxWidth: '85%',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '16px',
                          borderBottomRightRadius: '4px',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                          padding: '12px 14px',
                          paddingTop: msg.context && msg.context.length > 0 ? '40px' : '12px',
                          whiteSpace: 'pre-wrap',
                          position: 'relative',
                          color: '#fff',
                        }}
                      >
                        {/* Context indicator inside user message bubble */}
                        {msg.context && msg.context.length > 0 && (
                          <div
                            style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1 }}
                          >
                            <button
                              type="button"
                              onClick={toggleContext}
                              style={{
                                padding: '2px 6px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                color: '#aaa',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span>Context</span>
                              <svg
                                width="8"
                                height="8"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{
                                  transform: isContextExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                            {isContextExpanded && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  padding: '10px 12px',
                                  background: 'rgba(0, 0, 0, 0.9)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  maxHeight: '200px',
                                  maxWidth: '350px',
                                  overflow: 'auto',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                                }}
                              >
                                {msg.context.map((ctx, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      color: '#aaa',
                                      lineHeight: '1.4',
                                      whiteSpace: 'pre-wrap',
                                      marginBottom: idx < msg.context!.length - 1 ? '8px' : '0',
                                      paddingBottom: idx < msg.context!.length - 1 ? '8px' : '0',
                                      borderBottom:
                                        idx < msg.context!.length - 1
                                          ? '1px solid rgba(255, 255, 255, 0.05)'
                                          : 'none',
                                    }}
                                  >
                                    {ctx}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
              );
            })
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

        {/* Input Area - Always at bottom */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            paddingTop: '12px',
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
            {/* Context indicator inside input box */}
            {hasActiveContext && (
              <div
                style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1 }}
                onMouseEnter={() => setIsContextHovered(true)}
                onMouseLeave={() => setIsContextHovered(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsActiveContextExpanded(!isActiveContextExpanded)}
                  style={{
                    padding: '2px 6px',
                    paddingRight: isContextHovered ? '22px' : '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    color: '#aaa',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Context</span>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: isActiveContextExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {/* X button to clear context - appears on hover */}
                  {isContextHovered && onClearContext && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onClearContext();
                        setIsActiveContextExpanded(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '2px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 100, 100, 0.2)',
                        border: 'none',
                        borderRadius: '3px',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#faa',
                        fontSize: '10px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 100, 100, 0.4)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 100, 100, 0.2)';
                        e.currentTarget.style.color = '#faa';
                      }}
                      title="Remove context"
                    >
                      ×
                    </button>
                  )}
                </button>
                {isActiveContextExpanded && activeContextData.length > 0 && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      maxHeight: '200px',
                      maxWidth: '350px',
                      overflow: 'auto',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {activeContextData.map((ctx, idx) => (
                      <div
                        key={idx}
                        style={{
                          color: '#aaa',
                          lineHeight: '1.4',
                          whiteSpace: 'pre-wrap',
                          marginBottom: idx < activeContextData.length - 1 ? '8px' : '0',
                          paddingBottom: idx < activeContextData.length - 1 ? '8px' : '0',
                          borderBottom:
                            idx < activeContextData.length - 1
                              ? '1px solid rgba(255, 255, 255, 0.05)'
                              : 'none',
                        }}
                      >
                        {ctx}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                paddingTop: hasActiveContext ? '36px' : '12px',
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
                  currentQuestion.trim() && !isLoading ? '0 2px 8px rgba(255,255,255,0.2)' : 'none',
              }}
              title={isLoading ? 'Sending...' : 'Send message'}
              aria-label="Send message"
            >
              {isLoading ? '...' : <IconArrowUp size={14} />}
            </button>
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
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </>
  );
};
