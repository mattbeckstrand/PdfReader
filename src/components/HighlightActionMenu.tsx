import React from 'react';

// ===================================================================
// Component Props Interface
// ===================================================================

interface HighlightActionMenuProps {
  /** Highlighted text */
  selectedText: string;
  /** Position to display menu (from text selection) */
  position: { x: number; y: number };

  // Math-specific props
  /** Whether math content was detected */
  isMathMode?: boolean;
  /** Processed LaTeX content */
  mathContent?: string;
  /** OCR confidence score (0-1) */
  ocrConfidence?: number;
  /** Whether OCR is currently processing */
  processingOCR?: boolean;
  /** OCR error message */
  ocrError?: string | null;

  // Standard action callbacks
  /** Callback when "Explain This" is clicked */
  onExplain: () => void;
  /** Callback when "Ask AI" is clicked */
  onAskAI: () => void;
  /** Callback when "Define" is clicked */
  onDefine: () => void;
  /** Callback when "Annotate" is clicked */
  onAnnotate: () => void;

  // Math-specific action callbacks
  /** Callback when "Solve" is clicked (math mode) */
  onSolve?: () => void;
  /** Callback when "Simplify" is clicked (math mode) */
  onSimplify?: () => void;
  /** Callback when "Edit Equation" is clicked (math mode) */
  onEditEquation?: () => void;

  /** Callback when menu should be closed */
  onClose: () => void;
}

// ===================================================================
// Component Implementation
// ===================================================================

/**
 * Floating action menu that appears when text is highlighted
 *
 * Features:
 * - Appears near the text selection
 * - Different actions for text vs mathematical content
 * - Visual feedback for math mode and OCR processing
 * - Clean, modern UI with contextual icons
 * - Dismissible by clicking outside or pressing Escape
 */
const HighlightActionMenu: React.FC<HighlightActionMenuProps> = ({
  selectedText,
  position,
  isMathMode = false,
  mathContent,
  ocrConfidence,
  processingOCR = false,
  ocrError,
  onExplain,
  onAskAI,
  onDefine,
  onAnnotate,
  onSolve,
  onSimplify,
  onEditEquation,
  onClose,
}) => {
  // ===================================================================
  // Effects
  // ===================================================================

  // Handle Escape key to close menu
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ===================================================================
  // Render Logic
  // ===================================================================

  // Define actions based on content type
  interface ActionItem {
    label: string;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
    warning?: boolean;
  }

  const mathActions: ActionItem[] = [
    { label: '🤖 Explain', onClick: onExplain, primary: true },
    { label: '🧮 Solve', onClick: onSolve, disabled: !onSolve },
    { label: '📝 Simplify', onClick: onSimplify, disabled: !onSimplify },
    { 
      label: ocrConfidence && ocrConfidence < 0.8 ? '⚠️ Edit' : '✏️ Edit', 
      onClick: onEditEquation, 
      disabled: !onEditEquation,
      warning: ocrConfidence ? ocrConfidence < 0.8 : false
    },
  ].filter(action => !action.disabled);

  const textActions: ActionItem[] = [
    { label: 'Explain', onClick: onExplain, primary: true },
    { label: 'Ask AI', onClick: onAskAI },
    { label: 'Define', onClick: onDefine },
    { label: 'Annotate', onClick: onAnnotate },
  ];

  const actions = isMathMode ? mathActions : textActions;

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
      />

      {/* Action Menu */}
      <div
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          transform: 'translate(-50%, calc(-100% - 10px))',
          zIndex: 1000,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Math Mode Indicator */}
        {(isMathMode || processingOCR) && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '8px',
              fontSize: '11px',
              color: isMathMode ? '#8b5cf6' : '#666',
              fontWeight: '400',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            {processingOCR ? (
              <>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '1px solid #333',
                    borderTop: '1px solid #8b5cf6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                📐 Recognizing equation...
              </>
            ) : isMathMode ? (
              <>
                📐 Mathematical content
                {ocrConfidence && (
                  <span style={{ color: ocrConfidence > 0.8 ? '#10b981' : '#f59e0b' }}>
                    ({Math.round(ocrConfidence * 100)}%)
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* OCR Error Display */}
        {ocrError && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '8px',
              fontSize: '11px',
              color: '#ef4444',
              fontWeight: '400',
              letterSpacing: '0.5px',
              maxWidth: '200px',
            }}
          >
            ⚠️ {ocrError}
          </div>
        )}

        {/* LaTeX Preview (for math mode) */}
        {isMathMode && mathContent && !processingOCR && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '8px',
              fontSize: '12px',
              color: '#d1d5db',
              fontFamily: 'monospace',
              maxWidth: '300px',
              wordBreak: 'break-all',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#8b5cf6', marginBottom: '4px', fontSize: '10px' }}>
              RECOGNIZED AS:
            </div>
            {mathContent}
          </div>
        )}

        {/* Menu Card */}
        <div
          style={{
            backgroundColor: '#0a0a0a',
            border: isMathMode ? '1px solid #8b5cf6' : '1px solid #333',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            gap: '1px',
            overflow: 'hidden',
          }}
        >
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              disabled={processingOCR}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRight: idx < actions.length - 1 ? '1px solid #333' : 'none',
                backgroundColor: processingOCR ? '#1a1a1a' : '#0a0a0a',
                cursor: processingOCR ? 'wait' : 'pointer',
                fontSize: '13px',
                fontWeight: action.primary ? '400' : '300',
                color: processingOCR ? '#666' : action.warning ? '#f59e0b' : '#888',
                transition: 'all 0.15s ease',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
                opacity: processingOCR ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (!processingOCR) {
                  e.currentTarget.style.backgroundColor = action.warning ? '#f59e0b' : '#ffffff';
                  e.currentTarget.style.color = action.warning ? '#000' : '#000';
                }
              }}
              onMouseLeave={e => {
                if (!processingOCR) {
                  e.currentTarget.style.backgroundColor = '#0a0a0a';
                  e.currentTarget.style.color = action.warning ? '#f59e0b' : '#888';
                }
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Inline spinner animation */}
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

export default HighlightActionMenu;
