import React, { useCallback, useEffect, useRef } from 'react';

// ===================================================================
// Types
// ===================================================================

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

interface HighlightColorPickerProps {
  selectedColor: HighlightColor;
  onColorSelect: (color: HighlightColor) => void;
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onDisableMode?: () => void;
  highlightModeActive?: boolean;
}

// ===================================================================
// Color Definitions
// ===================================================================

const HIGHLIGHT_COLORS: Array<{ color: HighlightColor; label: string; value: string }> = [
  { color: 'yellow', label: 'Yellow', value: 'rgba(255, 235, 59, 0.4)' },
  { color: 'green', label: 'Green', value: 'rgba(76, 175, 80, 0.4)' },
  { color: 'blue', label: 'Blue', value: 'rgba(33, 150, 243, 0.4)' },
  { color: 'pink', label: 'Pink', value: 'rgba(233, 30, 99, 0.4)' },
  { color: 'orange', label: 'Orange', value: 'rgba(255, 152, 0, 0.4)' },
  { color: 'purple', label: 'Purple', value: 'rgba(156, 39, 176, 0.4)' },
];

// ===================================================================
// Component
// ===================================================================

export const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  isOpen,
  onClose,
  buttonRef,
  onDisableMode,
  highlightModeActive = false,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  const handleColorClick = useCallback(
    (color: HighlightColor) => {
      onColorSelect(color);
      onClose();
    },
    [onColorSelect, onClose]
  );

  const handleDisableClick = useCallback(() => {
    if (onDisableMode) {
      onDisableMode();
    }
  }, [onDisableMode]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--stroke-1)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        minWidth: '180px',
        zIndex: 1000,
        animation: 'dropdownFadeIn 0.15s ease-out',
      }}
    >
      {/* Disable option if highlight mode is active */}
      {highlightModeActive && onDisableMode && (
        <>
          <button
            onClick={handleDisableClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: 'var(--text-1)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
              fontWeight: '500',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--surface-3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: '2px solid var(--stroke-1)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              ✕
            </div>
            <span>Disable Highlighting</span>
          </button>
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--stroke-1)',
              margin: '8px 0',
            }}
          />
        </>
      )}

      {HIGHLIGHT_COLORS.map(({ color, label, value }) => (
        <button
          key={color}
          onClick={() => handleColorClick(color)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: selectedColor === color ? 'var(--surface-3)' : 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => {
            if (selectedColor !== color) {
              e.currentTarget.style.backgroundColor = 'var(--surface-3)';
            }
          }}
          onMouseLeave={e => {
            if (selectedColor !== color) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* Color swatch */}
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: value,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              flexShrink: 0,
            }}
          />
          <span>{label}</span>
          {selectedColor === color && (
            <span style={{ marginLeft: 'auto', fontSize: '16px' }}>✓</span>
          )}
        </button>
      ))}

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// Export color mapping for use in other components
export const getHighlightColorValue = (color: HighlightColor): string => {
  const colorObj = HIGHLIGHT_COLORS.find(c => c.color === color);
  return colorObj?.value || HIGHLIGHT_COLORS[0].value;
};
