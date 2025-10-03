import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - secure bridge between main and renderer processes
 *
 * This exposes a limited, type-safe API to the renderer process
 * Never expose the full Node.js or Electron APIs directly!
 */

// ============================================================================
// Type Definitions (should match types in src/types/electron.d.ts)
// ============================================================================

interface ElectronAPI {
  // PDF operations
  pdf: {
    open: (filePath?: string) => Promise<PdfDocument>;
    close: (documentId: string) => Promise<void>;
    getPage: (documentId: string, pageNumber: number) => Promise<PdfPage>;
  };

  // AI operations
  ai: {
    ask: (question: string, context: string[], pageNumber?: number) => Promise<AiAnswer>;
    embed: (text: string) => Promise<number[]>;
    search: (documentId: string, query: string, topK?: number) => Promise<VectorSearchResult[]>;
  };

  // Settings
  settings: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
  };

  // File system operations
  file: {
    read: (filePath: string) => Promise<FileReadResult>;
  };

  // Dialog operations
  dialog: {
    openFile: () => Promise<FileReadResult>;
  };

  // System
  system: {
    platform: NodeJS.Platform;
    openExternal: (url: string) => Promise<void>;
  };

  // Extraction
  extract: {
    region: (
      pdfPath: string,
      pageNumber: number,
      bbox: { x: number; y: number; width: number; height: number },
      pythonPath?: string
    ) => Promise<{
      success: boolean;
      text?: string;
      latex?: string;
      source?: string;
      error?: string;
    }>;
  };
}

interface FileReadResult {
  success: boolean;
  data?: Uint8Array;
  name?: string;
  path?: string;
  error?: string;
}

// Import types (these should be defined in src/types/index.ts)
interface PdfDocument {
  id: string;
  filePath: string;
  title: string;
  numPages: number;
  metadata?: Record<string, any>;
}

interface PdfPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

interface AiAnswer {
  id: string;
  questionId: string;
  answer: string;
  citations?: Citation[];
  model: string;
  timestamp: number;
  tokensUsed?: number;
}

interface Citation {
  pageNumber: number;
  text: string;
  relevanceScore?: number;
}

interface VectorSearchResult {
  chunk: {
    id: string;
    pageNumber: number;
    text: string;
    embedding?: number[];
    startIndex: number;
    endIndex: number;
  };
  similarity: number;
}

// ============================================================================
// API Implementation
// ============================================================================

const electronAPI: ElectronAPI = {
  pdf: {
    open: (filePath?: string) => ipcRenderer.invoke('pdf:open', filePath),
    close: (documentId: string) => ipcRenderer.invoke('pdf:close', documentId),
    getPage: (documentId: string, pageNumber: number) =>
      ipcRenderer.invoke('pdf:get-page', { documentId, pageNumber }),
  },

  ai: {
    ask: (question: string, context: string[], pageNumber?: number) =>
      ipcRenderer.invoke('ai:ask', { question, context, pageNumber }),
    embed: (text: string) => ipcRenderer.invoke('ai:embed', text),
    search: (documentId: string, query: string, topK = 5) =>
      ipcRenderer.invoke('ai:search', { documentId, query, topK }),
  },

  settings: {
    get: <T>(key: string) => ipcRenderer.invoke('settings:get', key) as Promise<T | null>,
    set: <T>(key: string, value: T) => ipcRenderer.invoke('settings:set', { key, value }),
  },

  file: {
    read: (filePath: string) =>
      ipcRenderer.invoke('file:read', filePath) as Promise<FileReadResult>,
  },

  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile') as Promise<FileReadResult>,
  },

  system: {
    platform: process.platform,
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  },

  extract: {
    region: (pdfPath, pageNumber, bbox, pythonPath) =>
      ipcRenderer.invoke('extract:region', { pdfPath, pageNumber, bbox, pythonPath }),
  },
};

// ============================================================================
// Expose API to Renderer
// ============================================================================

// Expose the API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// ============================================================================
// Type Declaration for TypeScript
// ============================================================================

// This makes TypeScript aware of window.electronAPI in the renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
