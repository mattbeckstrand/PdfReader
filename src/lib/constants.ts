/**
 * Application-wide constants
 */

// ============================================================================
// AI Configuration
// ============================================================================

export const DEFAULT_AI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';
export const DEFAULT_EMBEDDING_MODEL =
  import.meta.env.VITE_EMBEDDING_MODEL || 'text-embedding-3-small';

export const AI_CONFIG = {
  temperature: 0.7,
  maxTokens: 1000,
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
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  PDF_LOAD_FAILED: 'Failed to load PDF. Please try again or choose a different file.',
  AI_REQUEST_FAILED: 'Unable to get AI response. Please check your connection and try again.',
  INVALID_API_KEY: 'Invalid API key. Please check your OpenAI API key in settings.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  NO_TEXT_SELECTED: 'Please highlight some text before asking a question.',
  PDF_TEXT_EXTRACTION_FAILED: 'Failed to extract text from PDF page.',
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
