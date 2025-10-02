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
          transform: 'translate(-50%, calc(-100% - 12px))',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 1000,
          minWidth: '280px',
        }}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside menu
      >
        {/* Close button - top right, very visible */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#ff4444',
            color: 'white',
            border: '2px solid white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
            transition: 'all 0.2s',
            zIndex: 1001,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#ff0000';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#ff4444';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Close (Esc)"
        >
          ×
        </button>

        {/* Action buttons container */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
          }}
        >
          {/* Explain This Button */}
          <button
            onClick={onExplain}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px' }}>❓</span>
            <span>Explain This</span>
          </button>

          {/* Ask AI Button */}
          <button
            onClick={onAskAI}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px' }}>🔍</span>
            <span>Ask AI</span>
          </button>

          {/* Define Button */}
          <button
            onClick={onDefine}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px' }}>📖</span>
            <span>Define</span>
          </button>

          {/* Annotate Button */}
          <button
            onClick={onAnnotate}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px' }}>✏️</span>
            <span>Annotate</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default HighlightActionMenu;
