/**
 * Utility functions for the application
 */

import { AiError, PdfReaderError } from '@/types';

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncates text to a maximum length, adding ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Normalizes whitespace in text (removes extra spaces, tabs, newlines)
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts sentences from text using simple regex
 */
export function extractSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 0);
}

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * Counts approximate tokens in text (rough estimate: ~4 chars per token)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncates context if it exceeds max length
 */
export function truncateContext(context: string, maxLength: number): string {
  if (context.length <= maxLength) return context;

  // Try to cut at sentence boundary
  const truncated = context.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');

  if (lastPeriod > maxLength * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }

  return truncated + '...';
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(fn: () => Promise<T>, errorMessage: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new PdfReaderError(errorMessage, 'UNKNOWN_ERROR', error);
  }
}

/**
 * Checks if an error is retryable (e.g., network errors, rate limits)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AiError) {
    return error.retryable;
  }

  // Check for network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('429') ||
      message.includes('rate limit')
    );
  }

  return false;
}

/**
 * Formats an error for user-friendly display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof PdfReaderError || error instanceof AiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Creates a debounced function that delays execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a throttled function that limits execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates a unique ID for chunks, highlights, etc.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Date & Time Utilities
// ============================================================================

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns relative time (e.g., "2 minutes ago")
 */
export function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates that an OpenAI API key has the correct format
 */
export function isValidApiKey(key: string): boolean {
  return /^sk-[a-zA-Z0-9]{32,}$/.test(key);
}

/**
 * Validates that text is not empty after normalization
 */
export function hasValidText(text: string): boolean {
  return normalizeWhitespace(text).length > 0;
}

// ============================================================================
// Canvas & Screenshot Utilities
// ============================================================================

/**
 * Captures a region of a canvas as a base64 PNG string
 * Used for sending visual context to multimodal AI
 */
export function captureCanvasRegion(
  canvas: HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  scaleFactor: number = 1
): string | null {
  try {
    // Create a temporary canvas for the cropped region
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      console.warn('Failed to get 2D context for temp canvas');
      return null;
    }

    // Convert CSS coordinates to canvas coordinates
    const x = Math.max(0, Math.floor(bbox.x * scaleFactor));
    const y = Math.max(0, Math.floor(bbox.y * scaleFactor));
    const width = Math.min(canvas.width - x, Math.floor(bbox.width * scaleFactor));
    const height = Math.min(canvas.height - y, Math.floor(bbox.height * scaleFactor));

    if (width <= 0 || height <= 0) {
      console.warn('Invalid region dimensions:', { width, height });
      return null;
    }

    // Set temp canvas size to match the region
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw the cropped region
    tempCtx.drawImage(
      canvas,
      x,
      y,
      width,
      height, // Source rectangle
      0,
      0,
      width,
      height // Destination rectangle
    );

    // Convert to base64 PNG (without data URL prefix for efficient transmission)
    const dataUrl = tempCanvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1]; // Remove "data:image/png;base64," prefix

    return base64;
  } catch (error) {
    console.error('Failed to capture canvas region:', error);
    return null;
  }
}

// ============================================================================
// Local Storage Helpers
// ============================================================================

/**
 * Safely gets an item from localStorage with type safety
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage
 */
export function setInStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Removes an item from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}
