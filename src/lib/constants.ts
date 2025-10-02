/**
 * Application-wide constants
 */

// ============================================================================
// AI Configuration - Google Gemini
// ============================================================================

// Updated to Gemini 2.0 models (Gemini 1.5 was deprecated Sept 2025)
export const DEFAULT_AI_MODEL = import.meta.env['VITE_GEMINI_MODEL'] || 'gemini-2.0-flash-exp';
export const GEMINI_PRO_MODEL = import.meta.env['VITE_GEMINI_PRO_MODEL'] || 'gemini-2.0-pro-exp';
export const GEMINI_API_KEY = import.meta.env['VITE_GEMINI_API_KEY'];

export const AI_CONFIG = {
  // Lower temperature (0.3) = more focused, concise, deterministic responses
  // Higher temperature (0.7+) = more creative, varied responses
  temperature: Number(import.meta.env['VITE_AI_TEMPERATURE']) || 0.3,
  // Reduced max tokens to encourage conciseness (500 is ~375 words)
  maxTokens: Number(import.meta.env['VITE_AI_MAX_TOKENS']) || 500,
  topP: 1.0,
} as const;

// ============================================================================
// Chunking Configuration
// ============================================================================

export const CHUNK_CONFIG = {
  maxChunkSize: 500, // characters
  overlapSize: 50, // characters for context overlap
  minChunkSize: 100, // minimum chunk size
} as const;

// ============================================================================
// Vector Search Configuration
// ============================================================================

export const VECTOR_SEARCH_CONFIG = {
  topK: 5, // number of similar chunks to retrieve
  minSimilarity: 0.7, // minimum cosine similarity threshold
} as const;

// ============================================================================
// PDF Configuration
// ============================================================================

export const PDF_CONFIG = {
  defaultZoom: 1.0,
  minZoom: 0.5,
  maxZoom: 3.0,
  zoomStep: 0.1,
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  answerBubbleDelay: 200, // ms before showing answer bubble
  highlightColor: '#ffd54f', // default highlight color
  debounceDelay: 300, // ms for debouncing expensive operations
} as const;

// ============================================================================
// File API Configuration (for PDF upload to Gemini)
// ============================================================================

export const FILE_API_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB limit for Gemini File API
  maxPages: 1000, // Maximum pages per PDF
  supportedMimeType: 'application/pdf',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  PDF_LOAD_FAILED: 'Failed to load PDF. Please try again or choose a different file.',
  AI_REQUEST_FAILED: 'Unable to get AI response. Please check your connection and try again.',
  INVALID_API_KEY: 'Invalid API key. Please check your Google Gemini API key in the .env file.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  NO_TEXT_SELECTED: 'Please highlight some text before asking a question.',
  PDF_TEXT_EXTRACTION_FAILED: 'Failed to extract text from PDF page.',
  NO_API_KEY: 'No API key found. Please add VITE_GEMINI_API_KEY to your .env file.',
  PDF_UPLOAD_FAILED: 'Failed to upload PDF to AI service. Please try again.',
  FILE_TOO_LARGE: 'PDF file is too large. Maximum size is 50MB.',
} as const;

// ============================================================================
// IPC Channels (for Electron communication - optional for MVP)
// ============================================================================

export const IPC_CHANNELS = {
  PDF_OPEN: 'pdf:open',
  PDF_CLOSE: 'pdf:close',
  PDF_GET_PAGE: 'pdf:get-page',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  RECENT_FILES: 'recent_files',
  USER_SETTINGS: 'user_settings',
  HIGHLIGHTS: 'highlights',
  QA_HISTORY: 'qa_history', // Store Q&A pairs for reference
} as const;
