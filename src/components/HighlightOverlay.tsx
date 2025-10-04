import React from 'react';
import { getHighlightColorValue, type HighlightColor } from './HighlightColorPicker';

// ===================================================================
// Types
// ===================================================================

export interface HighlightData {
  id: string;
  pageNumber: number;
  color: HighlightColor;
  text: string;
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  timestamp: number;
}

interface HighlightOverlayProps {
  highlights: HighlightData[];
  pageNumber: number;
  containerWidth: number;
  containerHeight: number;
  onRemoveHighlight?: (id: string) => void;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Renders highlight overlays on a PDF page
 *
 * Features:
 * - Colored rectangles over highlighted text
 * - Right-click to remove highlight
 * - Tooltip with highlighted text
 */
export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  highlights,
  pageNumber,
  containerWidth,
  containerHeight,
  onRemoveHighlight,
}) => {
  const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);

  if (pageHighlights.length === 0) {
    return null;
  }

  const handleContextMenu = (e: React.MouseEvent, highlightId: string) => {
    e.preventDefault();
    if (onRemoveHighlight) {
      const confirmed = window.confirm('Remove this highlight?');
      if (confirmed) {
        onRemoveHighlight(highlightId);
      }
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      {pageHighlights.map(highlight => (
        <div key={highlight.id}>
          {highlight.rects.map((rect, idx) => (
            <div
              key={`${highlight.id}-${idx}`}
              onContextMenu={e => handleContextMenu(e, highlight.id)}
              title={highlight.text.substring(0, 100) + (highlight.text.length > 100 ? '...' : '')}
              style={{
                position: 'absolute',
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                backgroundColor: getHighlightColorValue(highlight.color),
                pointerEvents: 'auto',
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '1';
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
