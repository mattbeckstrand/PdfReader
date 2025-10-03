import { BookOpen, Library } from 'lucide-react';
import React from 'react';

// ===================================================================
// Types
// ===================================================================

export type AppView = 'reader' | 'library';

interface AppNavigationProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  hasOpenDocument?: boolean;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Main navigation bar for switching between app views
 *
 * Features:
 * - Library view: Browse all documents
 * - Reader view: Read current document
 */
export const AppNavigation: React.FC<AppNavigationProps> = ({
  currentView,
  onViewChange,
  hasOpenDocument = false,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '40px',
        zIndex: 1001,
        display: 'flex',
        gap: '6px',
        background: 'var(--surface-2)',
        backdropFilter: 'blur(20px)',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid var(--stroke-1)',
        boxShadow: 'var(--shadow-1)',
      }}
    >
      {/* Library Button */}
      <button
        onClick={() => onViewChange('library')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 18px',
          border: 'none',
          borderRadius: '10px',
          background: currentView === 'library' ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: currentView === 'library' ? 'var(--text-1)' : 'var(--text-2)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all var(--transition)',
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={e => {
          if (currentView !== 'library') {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--text-1)';
          }
        }}
        onMouseLeave={e => {
          if (currentView !== 'library') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-2)';
          }
        }}
        title="Library"
      >
        <Library size={17} strokeWidth={2} />
        <span>Library</span>
      </button>

      {/* Reader Button - Only enabled when document is open */}
      <button
        onClick={() => hasOpenDocument && onViewChange('reader')}
        disabled={!hasOpenDocument}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 18px',
          border: 'none',
          borderRadius: '10px',
          background: currentView === 'reader' ? 'rgba(255,255,255,0.08)' : 'transparent',
          color:
            currentView === 'reader'
              ? 'var(--text-1)'
              : hasOpenDocument
              ? 'var(--text-2)'
              : 'rgba(255,255,255,0.25)',
          cursor: hasOpenDocument ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all var(--transition)',
          opacity: hasOpenDocument ? 1 : 0.5,
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={e => {
          if (currentView !== 'reader' && hasOpenDocument) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--text-1)';
          }
        }}
        onMouseLeave={e => {
          if (currentView !== 'reader' && hasOpenDocument) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-2)';
          }
        }}
        title={hasOpenDocument ? 'Reader' : 'Open a document to read'}
      >
        <BookOpen size={17} strokeWidth={2} />
        <span>Reader</span>
      </button>
    </div>
  );
};
