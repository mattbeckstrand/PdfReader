/**
 * Type definitions for Electron API exposed via preload script
 *
 * This file ensures TypeScript knows about window.electronAPI
 * in the renderer process
 */

import type { PdfDocument, PdfPage, VectorSearchResult } from './index';

export interface FileReadResult {
  success: boolean;
  data?: Uint8Array;
  name?: string;
  path?: string;
  error?: string;
}

export interface StreamChunk {
  requestId: string;
  chunk: string;
  done: boolean;
  pageNumber?: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  pageNumber?: number;
}

export interface LicenseStatus {
  valid: boolean;
  email?: string;
  activatedAt?: string;
  expiresAt?: string | null;
  plan?: 'lifetime' | 'monthly' | 'yearly';
  error?: string;
}

export interface ActivateLicenseResponse {
  success: boolean;
  license?: LicenseStatus;
  error?: string;
}

export interface StoredLicense {
  licenseKey: string;
  email: string;
}

export interface CreateCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
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
    ask: (
      question: string,
      context: string[],
      pageNumber?: number,
      imageBase64?: string,
      conversationHistory?: ConversationMessage[]
    ) => Promise<{ requestId: string }>;
    onStreamChunk: (callback: (data: StreamChunk) => void) => () => void;
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
    openOAuthModal: (url: string) => Promise<void>;
    onOAuthCallback: (callback: (data: { url: string }) => void) => () => void;
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

  // License & Payment
  license: {
    verify: (licenseKey: string) => Promise<LicenseStatus>;
    activate: (licenseKey: string, email: string) => Promise<ActivateLicenseResponse>;
    getStored: () => Promise<StoredLicense | null>;
    store: (licenseKey: string, email: string) => Promise<void>;
    clear: () => Promise<void>;
    createCheckout: (priceId: string, email: string) => Promise<CreateCheckoutResponse>;
    getByEmail: (email: string) => Promise<{
      success: boolean;
      licenseKey?: string;
      email?: string;
      plan?: string;
      error?: string;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
