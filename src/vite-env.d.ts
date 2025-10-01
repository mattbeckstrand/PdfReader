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
  // Add custom env variables here if needed
  // readonly VITE_CUSTOM_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
