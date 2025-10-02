/**
 * Preload script - secure bridge between main and renderer processes
 *
 * This exposes a limited, type-safe API to the renderer process
 * Never expose the full Node.js or Electron APIs directly!
 */
interface ElectronAPI {
    pdf: {
        open: (filePath?: string) => Promise<PdfDocument>;
        close: (documentId: string) => Promise<void>;
        getPage: (documentId: string, pageNumber: number) => Promise<PdfPage>;
    };
    ai: {
        ask: (question: string, context: string[], pageNumber?: number) => Promise<AiAnswer>;
        embed: (text: string) => Promise<number[]>;
        search: (documentId: string, query: string, topK?: number) => Promise<VectorSearchResult[]>;
    };
    settings: {
        get: <T>(key: string) => Promise<T | null>;
        set: <T>(key: string, value: T) => Promise<void>;
    };
    file: {
        read: (filePath: string) => Promise<FileReadResult>;
    };
    system: {
        platform: NodeJS.Platform;
        openExternal: (url: string) => Promise<void>;
    };
}
interface FileReadResult {
    success: boolean;
    data?: Uint8Array;
    name?: string;
    path?: string;
    error?: string;
}
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
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map