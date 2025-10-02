import React from 'react';

// ===================================================================
// Component Props Interface
// ===================================================================

interface HighlightActionMenuProps {
  /** Highlighted text */
  selectedText: string;
  /** Position to display menu (from text selection) */
  position: { x: number; y: number };
  /** Callback when "Explain This" is clicked */
  onExplain: () => void;
  /** Callback when "Ask AI" is clicked */
  onAskAI: () => void;
  /** Callback when "Define" is clicked */
  onDefine: () => void;
  /** Callback when "Annotate" is clicked */
  onAnnotate: () => void;
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
 * - Four action buttons: Explain This, Ask AI, Define, Annotate
 * - Clean, modern UI with icons
 * - Dismissible by clicking outside or pressing Escape
 */
const HighlightActionMenu: React.FC<HighlightActionMenuProps> = ({
  selectedText,
  position,
  onExplain,
  onAskAI,
  onDefine,
  onAnnotate,
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
  // Render
  // ===================================================================

  const actions = [
    { label: 'Explain', onClick: onExplain },
    { label: 'Ask AI', onClick: onAskAI },
    { label: 'Define', onClick: onDefine },
    { label: 'Annotate', onClick: onAnnotate },
  ];

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
        {/* Menu Card */}
        <div
          style={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '2px',
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
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRight: idx < actions.length - 1 ? '1px solid #333' : 'none',
                backgroundColor: '#0a0a0a',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '300',
                color: '#888',
                transition: 'all 0.15s ease',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#0a0a0a';
                e.currentTarget.style.color = '#888';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default HighlightActionMenu;
