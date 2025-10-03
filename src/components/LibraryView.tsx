import { Clock, FileText, Grid3x3, List, Plus, Search, Star } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { SegmentedControl } from '../shared/components/SegmentedControl';
import { TextField } from '../shared/components/TextField';
import type { LibraryDocument, LibrarySortBy, LibraryViewMode } from '../types/library';

// ===================================================================
// Types
// ===================================================================

interface LibraryViewProps {
  documents: LibraryDocument[];
  onOpenDocument: (doc: LibraryDocument) => void;
  onAddDocument: () => void;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Library view for browsing all PDF documents
 *
 * Phase 1 Features:
 * - Grid/List view toggle
 * - Recently opened section
 * - Search by title
 * - Sort options
 * - Thumbnail previews
 */
export const LibraryView: React.FC<LibraryViewProps> = ({
  documents,
  onOpenDocument,
  onAddDocument,
}) => {
  // ===================================================================
  // Helpers (pure, typed)
  // ===================================================================

  const getInitials = useCallback((title: string): string => {
    const words = title
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 3);
    if (words.length === 0) return 'PDF';
    const letters = words.map(w => w.charAt(0).toUpperCase());
    return letters.join('').slice(0, 3);
  }, []);

  const getThumbGradient = useCallback((seed: string): string => {
    // Simple deterministic hash → hue
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    const hue2 = (hue + 20) % 360;
    // Dark gradients to fit the theme
    return `linear-gradient(135deg, hsl(${hue} 28% 20%), hsl(${hue2} 24% 14%))`;
  }, []);
  // ===================================================================
  // State
  // ===================================================================

  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [sortBy, setSortBy] = useState<LibrarySortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // ===================================================================
  // Computed Values
  // ===================================================================

  // Recently opened (last 5)
  const recentDocuments = useMemo(() => {
    return [...documents]
      .filter(doc => doc.lastOpened)
      .sort((a, b) => {
        const dateA = a.lastOpened ? new Date(a.lastOpened).getTime() : 0;
        const dateB = b.lastOpened ? new Date(b.lastOpened).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [documents]);

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc => doc.title.toLowerCase().includes(query) || doc.author?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          const dateA = a.lastOpened ? new Date(a.lastOpened).getTime() : 0;
          const dateB = b.lastOpened ? new Date(b.lastOpened).getTime() : 0;
          return dateB - dateA;
        }
        case 'title':
          return a.title.localeCompare(b.title);
        case 'dateAdded': {
          const dateA = new Date(a.dateAdded).getTime();
          const dateB = new Date(b.dateAdded).getTime();
          return dateB - dateA;
        }
        case 'progress':
          return b.readingProgress - a.readingProgress;
        default:
          return 0;
      }
    });

    return sorted;
  }, [documents, searchQuery, sortBy]);

  // ===================================================================
  // Handlers
  // ===================================================================

  const handleDocumentClick = useCallback(
    (doc: LibraryDocument) => {
      onOpenDocument(doc);
    },
    [onOpenDocument]
  );

  // ===================================================================
  // Render Helpers
  // ===================================================================

  const renderDocumentCard = (doc: LibraryDocument, isRecent: boolean = false) => {
    const progressPercent = Math.round(doc.readingProgress * 100);
    const thumbBg = getThumbGradient(doc.title);
    const initials = getInitials(doc.title);

    return (
      <div
        key={doc.id}
        onClick={() => handleDocumentClick(doc)}
        className="card"
        style={{ position: 'relative' }}
      >
        {/* Thumbnail */}
        <div
          className={`card-thumb ${isRecent ? 'recent' : ''}`}
          style={{
            background: doc.thumbnail
              ? `url(${doc.thumbnail}) center / contain no-repeat`
              : thumbBg,
          }}
        >
          {!doc.thumbnail && (
            <div
              className="thumb-initials"
              aria-hidden
              style={{ fontSize: isRecent ? '44px' : '60px' }}
            >
              {initials}
            </div>
          )}

          {/* Chips */}
          <div className="thumb-chip thumb-chip--tl">PDF</div>
          <div className="thumb-chip thumb-chip--bl">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={12} strokeWidth={2} /> {doc.pageCount} pages
            </span>
          </div>

          {/* Favorite Star */}
          {doc.isFavorite && (
            <div className="fav-badge">
              <Star size={14} fill="#fbbf24" color="#fbbf24" strokeWidth={1.5} />
            </div>
          )}

          {/* Progress indicator overlay */}
          {progressPercent > 0 && (
            <div className="card-progress">
              <div style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="card-info" style={{ padding: isRecent ? '16px' : undefined }}>
          {/* Title */}
          <h3
            className="card-title"
            style={{ fontSize: isRecent ? '15px' : undefined }}
            title={doc.title}
          >
            {doc.title}
          </h3>

          {/* Author */}
          {doc.author && <p className="card-author">{doc.author}</p>}

          {/* Metadata */}
          <div className="card-meta" style={{ marginTop: doc.author ? '0' : '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={12} strokeWidth={2} />
              {doc.pageCount} pages
            </span>
            {doc.currentPage > 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ opacity: 0.5 }}>•</span>
                Page {doc.currentPage}
              </span>
            )}
          </div>

          {/* Progress info */}
          {progressPercent > 0 && (
            <div
              style={{
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: '1px solid var(--stroke-1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-2)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Progress
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600 }}>
                {progressPercent}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div className="library-bg">
      <div className="library-container">
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <div className="library-header" style={{ marginBottom: '32px' }}>
            <h1>Library</h1>
            <p>Your personal reading collection</p>
          </div>

          {/* Featured Add Button + View Toggle */}
          <div className="library-cta" style={{ marginBottom: '16px' }}>
            <div className="cta-row">
              <PrimaryButton onClick={onAddDocument}>
                <Plus size={20} />
                Import PDF
              </PrimaryButton>
              <SegmentedControl
                value={viewMode}
                onChange={v => setViewMode(v)}
                options={[
                  {
                    value: 'grid',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Grid3x3 size={16} /> Grid
                      </span>
                    ),
                  },
                  {
                    value: 'list',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <List size={16} /> List
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            {/* Search */}
            <div className="toolbar-left">
              <TextField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search documents..."
                icon={<Search size={18} style={{ color: 'var(--text-muted)' }} />}
              />
            </div>

            {/* Sort & View Controls */}
            <div className="toolbar-right">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as LibrarySortBy)}
                className="sort-select"
              >
                <option value="recent">Recently Opened</option>
                <option value="title">Title</option>
                <option value="dateAdded">Date Added</option>
                <option value="progress">Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recently Opened Section */}
        {recentDocuments.length > 0 && !searchQuery && (
          <div style={{ marginBottom: '56px' }}>
            <div className="section-title">
              <Clock size={18} />
              <h2>Recently Opened</h2>
            </div>
            <div className="recent-row" style={{ maxWidth: '100%', overflowX: 'auto' }}>
              {recentDocuments.map(doc => renderDocumentCard(doc, true))}
            </div>
          </div>
        )}

        {/* All Documents Section */}
        <div>
          <div className="section-title" style={{ marginBottom: '24px' }}>
            <FileText size={18} />
            <h2>{searchQuery ? 'Search Results' : 'All Documents'}</h2>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="empty">
              <div className="circle">
                <FileText size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3>{searchQuery ? 'No documents found' : 'Your library is empty'}</h3>
              <p>
                {searchQuery
                  ? 'Try adjusting your search terms or browse all documents'
                  : 'Add your first PDF to start reading with AI assistance'}
              </p>
              {!searchQuery && (
                <PrimaryButton onClick={onAddDocument}>
                  <Plus size={18} />
                  Import Your First PDF
                </PrimaryButton>
              )}
            </div>
          ) : (
            <div
              className="doc-grid"
              style={{
                gridTemplateColumns: viewMode === 'grid' ? undefined : '1fr',
                gap: viewMode === 'grid' ? undefined : '16px',
              }}
            >
              {filteredDocuments.map(doc => renderDocumentCard(doc, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
