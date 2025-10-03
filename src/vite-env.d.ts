/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables and import.meta
 *
 * This file ensures TypeScript recognizes:
 * - import.meta.env (Vite environment variables)
 * - import.meta.hot (Vite HMR API)
 */

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;

  // Google Gemini API Configuration
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_PRO_MODEL?: string;

  // AI Configuration (Optional)
  readonly VITE_AI_TEMPERATURE?: string;
  readonly VITE_AI_MAX_TOKENS?: string;

  // Mathpix OCR configuration
  readonly VITE_MATHPIX_APP_ID?: string;
  readonly VITE_MATHPIX_APP_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
