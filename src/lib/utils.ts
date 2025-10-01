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
