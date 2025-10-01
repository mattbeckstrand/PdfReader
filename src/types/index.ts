/**
 * Shared TypeScript types for the AI PDF Reader
 * Simplified for MVP: Highlight → Context → Ask AI → Answer
 */

// ============================================================================
// PDF Types
// ============================================================================

export interface PdfDocument {
  id: string;
  filePath: string;
  title: string;
  numPages: number;
  metadata?: PdfMetadata;
}

export interface PdfMetadata {
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PdfPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Highlight & Selection Types
// ============================================================================

export interface TextSelection {
  text: string;
  pageNumber: number;
  boundingBox?: BoundingBox;
  timestamp: number;
}

export interface Highlight {
  id: string;
  selection: TextSelection;
  color?: string;
  note?: string;
  createdAt: Date;
}

// ============================================================================
// AI Types
// ============================================================================

export interface AiQuestion {
  id: string;
  question: string;
  context: string;
  pageNumber?: number;
  timestamp: number;
}

export interface AiAnswer {
  id: string;
  questionId: string;
  answer: string;
  pageNumber?: number;
  model: string;
  timestamp: number;
  tokensUsed?: number;
}

export interface AiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AnswerBubblePosition {
  x: number;
  y: number;
  pageNumber: number;
}

export interface ViewerState {
  currentPage: number;
  zoom: number;
  scrollPosition: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class PdfReaderError extends Error {
  constructor(message: string, public code: string, public originalError?: unknown) {
    super(message);
    this.name = 'PdfReaderError';
  }
}

export class AiError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AiError';
  }
}
