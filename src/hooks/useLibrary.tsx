import { useCallback, useEffect, useState } from 'react';
import type { Collection, LibraryDocument } from '../types/library';

// ===================================================================
// Storage Keys
// ===================================================================

const STORAGE_KEYS = {
  DOCUMENTS: 'library_documents',
  COLLECTIONS: 'library_collections',
} as const;

// ===================================================================
// Hook
// ===================================================================

/**
 * Custom hook for managing library documents and collections
 *
 * Features:
 * - Add/update/remove documents
 * - Generate thumbnails
 * - Track reading progress
 * - Manage collections
 * - Persist to localStorage
 */
export const useLibrary = () => {
  // ===================================================================
  // State
  // ===================================================================

  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // ===================================================================
  // Load from Storage
  // ===================================================================

  useEffect(() => {
    try {
      const docsJson = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      const collectionsJson = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);

      if (docsJson) {
        const parsed = JSON.parse(docsJson);
        // Convert date strings back to Date objects
        const docs = parsed.map((doc: any) => ({
          ...doc,
          dateAdded: new Date(doc.dateAdded),
          lastOpened: doc.lastOpened ? new Date(doc.lastOpened) : undefined,
        }));
        setDocuments(docs);
      }

      if (collectionsJson) {
        const parsed = JSON.parse(collectionsJson);
        const cols = parsed.map((col: any) => ({
          ...col,
          createdAt: new Date(col.createdAt),
        }));
        setCollections(cols);
      }
    } catch (error) {
      console.error('❌ [LIBRARY] Failed to load from storage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===================================================================
  // Document Operations
  // ===================================================================

  /**
   * Add or update a document in the library
   */
  const addOrUpdateDocument = useCallback((doc: LibraryDocument) => {
    setDocuments(prevDocuments => {
      const existingIndex = prevDocuments.findIndex(d => d.filePath === doc.filePath);

      let updated: LibraryDocument[];
      if (existingIndex >= 0) {
        // Update existing
        updated = [...prevDocuments];
        updated[existingIndex] = { ...updated[existingIndex], ...doc };
      } else {
        // Add new
        updated = [...prevDocuments, doc];
      }

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save documents:', error);
      }

      return updated;
    });
  }, []);

  /**
   * Remove a document from the library
   */
  const removeDocument = useCallback((docId: string) => {
    setDocuments(prevDocuments => {
      const filtered = prevDocuments.filter(d => d.id !== docId);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save documents:', error);
      }

      return filtered;
    });
  }, []);

  /**
   * Get a document by file path
   */
  const getDocumentByPath = useCallback(
    (filePath: string): LibraryDocument | undefined => {
      return documents.find(d => d.filePath === filePath);
    },
    [documents]
  );

  /**
   * Update reading progress for a document
   */
  const updateReadingProgress = useCallback(
    (docId: string, currentPage: number, totalPages: number) => {
      setDocuments(prevDocuments => {
        const doc = prevDocuments.find(d => d.id === docId);
        if (!doc) return prevDocuments;

        const progress = totalPages > 0 ? currentPage / totalPages : 0;
        const updated = prevDocuments.map(d =>
          d.id === docId
            ? {
                ...d,
                currentPage,
                readingProgress: progress,
                lastOpened: new Date(),
              }
            : d
        );

        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
        } catch (error) {
          console.error('❌ [LIBRARY] Failed to save documents:', error);
        }

        return updated;
      });
    },
    []
  );

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback((docId: string) => {
    setDocuments(prevDocuments => {
      const updated = prevDocuments.map(d =>
        d.id === docId ? { ...d, isFavorite: !d.isFavorite } : d
      );

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save documents:', error);
      }

      return updated;
    });
  }, []);

  /**
   * Update document thumbnail
   */
  const updateThumbnail = useCallback((docId: string, thumbnailData: string) => {
    setDocuments(prevDocuments => {
      const updated = prevDocuments.map(d =>
        d.id === docId ? { ...d, thumbnail: thumbnailData } : d
      );

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save documents:', error);
      }

      return updated;
    });
  }, []);

  // ===================================================================
  // Collection Operations
  // ===================================================================

  /**
   * Create a new collection
   */
  const createCollection = useCallback((name: string, color?: string) => {
    setCollections(prevCollections => {
      const newCollection: Collection = {
        id: `col-${Date.now()}`,
        name,
        color,
        documentIds: [],
        createdAt: new Date(),
      };
      const updated = [...prevCollections, newCollection];

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save collections:', error);
      }

      return updated;
    });
  }, []);

  /**
   * Add document to collection
   */
  const addToCollection = useCallback((docId: string, collectionId: string) => {
    setDocuments(prevDocuments => {
      const doc = prevDocuments.find(d => d.id === docId);
      if (!doc) return prevDocuments;

      const updated = prevDocuments.map(d =>
        d.id === docId ? { ...d, collections: [...new Set([...d.collections, collectionId])] } : d
      );

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save documents:', error);
      }

      return updated;
    });

    setCollections(prevCollections => {
      const updatedCollections = prevCollections.map(c =>
        c.id === collectionId ? { ...c, documentIds: [...new Set([...c.documentIds, docId])] } : c
      );

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updatedCollections));
      } catch (error) {
        console.error('❌ [LIBRARY] Failed to save collections:', error);
      }

      return updatedCollections;
    });
  }, []);

  // ===================================================================
  // Return
  // ===================================================================

  return {
    // State
    documents,
    collections,
    loading,

    // Document operations
    addOrUpdateDocument,
    removeDocument,
    getDocumentByPath,
    updateReadingProgress,
    toggleFavorite,
    updateThumbnail,

    // Collection operations
    createCollection,
    addToCollection,
  };
};
