import { FileText, FolderOpen } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LibraryDocument } from '../types/library';

// ===================================================================
// Types
// ===================================================================

interface DocumentMenuProps {
  documents: LibraryDocument[];
  currentDocumentId: string | null;
  onOpenDocument: (doc: LibraryDocument) => void;
  onGoToLibrary: () => void;
  onOpenFile: () => void;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Single menu button that provides access to:
 * - Library view
 * - Recent documents
 * - Open new document
 */
export const DocumentMenu: React.FC<DocumentMenuProps> = ({
  documents,
  currentDocumentId,
  onOpenDocument,
  onGoToLibrary,
  onOpenFile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenDocument = useCallback(
    (doc: LibraryDocument) => {
      onOpenDocument(doc);
      setIsOpen(false);
    },
    [onOpenDocument]
  );

  const handleGoToLibrary = useCallback(() => {
    onGoToLibrary();
    setIsOpen(false);
  }, [onGoToLibrary]);

  const handleOpenFile = useCallback(() => {
    onOpenFile();
    setIsOpen(false);
  }, [onOpenFile]);

  // Get current document name
  const currentDoc = documents.find(d => d.id === currentDocumentId);
  const buttonLabel = currentDoc ? currentDoc.title : 'Documents';

  // Recent documents (last 5)
  const recentDocs = [...documents]
    .sort((a, b) => {
      const dateA = a.lastOpened ? new Date(a.lastOpened).getTime() : 0;
      const dateB = b.lastOpened ? new Date(b.lastOpened).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          border: '1px solid var(--stroke-1)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-2)',
          color: 'var(--text-1)',
          transition: 'all 0.15s ease',
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '250px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-2)';
        }}
      >
        <FileText size={16} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{buttonLabel}</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            minWidth: '280px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--stroke-1)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-2)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Open File Option */}
          <button
            onClick={handleOpenFile}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderBottom: recentDocs.length > 0 ? '1px solid var(--stroke-1)' : 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-1)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FolderOpen size={16} />
            <span>Open Document...</span>
          </button>

          {/* Recent Documents */}
          {recentDocs.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 'var(--surface-2)',
                }}
              >
                Recent
              </div>
              {recentDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleOpenDocument(doc)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    backgroundColor:
                      currentDocumentId === doc.id ? 'var(--accent-bg)' : 'transparent',
                    color: 'var(--text-1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (currentDocumentId !== doc.id) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (currentDocumentId !== doc.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      fontWeight: currentDocumentId === doc.id ? '600' : '400',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{doc.pageCount} pages</span>
                    {doc.currentPage > 1 && (
                      <>
                        <span>•</span>
                        <span>Page {doc.currentPage}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
