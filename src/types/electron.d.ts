/**
 * Type definitions for Electron API exposed via preload script
 *
 * This file ensures TypeScript knows about window.electronAPI
 * in the renderer process
 */

import type { AiAnswer, PdfDocument, PdfPage, VectorSearchResult } from './index';

export interface FileReadResult {
  success: boolean;
  data?: Uint8Array;
  name?: string;
  path?: string;
  error?: string;
}

export interface ElectronAPI {
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
