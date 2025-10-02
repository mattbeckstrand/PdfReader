import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG, DEFAULT_AI_MODEL, ERROR_MESSAGES, GEMINI_API_KEY } from '@lib/constants';
import { useCallback, useRef, useState } from 'react';

// ===================================================================
// Type Definitions
// ===================================================================

interface PdfMetadata {
  title?: string;
  pages: number;
  author?: string;
}

interface UsePdfContextResult {
  initializeContext: (pdfFile: File, metadata: PdfMetadata) => Promise<void>;
  ask: (question: string, highlightedText?: string, pageNumber?: number) => Promise<string>;
  clearContext: () => Promise<void>;

  contextInitialized: boolean;
  isUploading: boolean;
  loading: boolean;
  error: string | null;
  uploadedFileUri: string | null;
}

// ===================================================================
// Hook Implementation
// ===================================================================

/**
 * Hook for managing full PDF context with Gemini File API
 *
 * Features:
 * - Uploads entire PDF to Gemini (includes text + images + diagrams)
 * - Multimodal understanding (perfect for math PDFs with equations/figures)
 * - Context caching for cost efficiency
 * - Cross-page reasoning (AI has full document context)
 *
 * Usage:
 * 1. Call initializeContext() when PDF loads (uploads file to Gemini)
 * 2. Call ask() to query with full document context (text + vision)
 * 3. Call clearContext() when done (deletes file from Gemini)
 */
export function usePdfContext(): UsePdfContextResult {
  // ===================================================================
  // State
  // ===================================================================

  const [contextInitialized, setContextInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileUri, setUploadedFileUri] = useState<string | null>(null);

  // Store uploaded file reference and metadata
  const uploadedFileRef = useRef<any>(null);
  const pdfMetadataRef = useRef<PdfMetadata | null>(null);
  const genAIRef = useRef<GoogleGenerativeAI | null>(null);

  // ===================================================================
  // Initialize Context (Upload PDF)
  // ===================================================================

  const initializeContext = useCallback(async (pdfFile: File, metadata: PdfMetadata) => {
    console.log('🚀 Initializing PDF context with File API...', {
      fileName: pdfFile.name,
      fileSize: pdfFile.size,
      pages: metadata.pages,
    });

    setIsUploading(true);
    setError(null);
    setContextInitialized(false);

    try {
      // Validate API key
      if (!GEMINI_API_KEY) {
        throw new Error(ERROR_MESSAGES.NO_API_KEY);
      }

      // Validate file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (pdfFile.size > MAX_FILE_SIZE) {
        throw new Error(
          `PDF file is too large (${(pdfFile.size / 1024 / 1024).toFixed(
            1
          )}MB). Maximum size is 50MB.`
        );
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      genAIRef.current = genAI;

      // Convert PDF to base64 for inline use
      // In browser/Electron renderer, we use inline files instead of pre-upload
      console.log('📤 Preparing PDF for AI processing...');
      const arrayBuffer = await pdfFile.arrayBuffer();

      // Convert to base64 in chunks to avoid call stack overflow
      const uint8Array = new Uint8Array(arrayBuffer);
      const chunkSize = 8192; // Process in 8KB chunks
      let binary = '';

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }

      const base64 = btoa(binary);

      console.log('✅ PDF ready for processing:', {
        name: pdfFile.name,
        size: pdfFile.size,
        type: pdfFile.type,
      });

      // Store file data for inline use with each query
      uploadedFileRef.current = {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf',
        },
        name: metadata.title || pdfFile.name,
      };
      pdfMetadataRef.current = metadata;
      setUploadedFileUri('inline-base64'); // Indicator that we're using inline mode
      setContextInitialized(true);

      console.log('🎉 PDF context initialized! AI now has full document access (text + images).');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize PDF context';
      setError(errorMsg);
      console.error('❌ PDF context initialization failed:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ===================================================================
  // Ask Question (With Full PDF Context)
  // ===================================================================

  const ask = useCallback(
    async (question: string, highlightedText?: string, pageNumber?: number): Promise<string> => {
      if (!uploadedFileRef.current) {
        throw new Error('PDF not uploaded. Please initialize context first.');
      }

      console.log('🤖 Asking AI with full PDF context:', {
        question,
        hasHighlight: !!highlightedText,
        pageNumber,
      });

      setLoading(true);
      setError(null);

      try {
        // Initialize Gemini model
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
          model: DEFAULT_AI_MODEL,
          generationConfig: {
            temperature: AI_CONFIG.temperature,
            maxOutputTokens: AI_CONFIG.maxTokens,
            topP: AI_CONFIG.topP,
          },
        });

        // Build prompt with highlighted text as focus point (if provided)
        const contextPrompt = highlightedText
          ? `I'm reading this PDF document. I've highlighted this text on page ${pageNumber || '?'}:

"""
${highlightedText}
"""

Question: ${question}

INSTRUCTIONS:
- Analyze the ENTIRE document (all pages, text, images, diagrams, equations)
- Focus on the highlighted text, but use knowledge from anywhere in the document
- For math problems: Show step-by-step work with clear explanations
- For figures/diagrams: Describe what you see and explain their significance
- For equations: Parse them accurately and explain the notation
- Reference specific pages or sections when helpful (e.g., "As shown on page 5...")
- Use **bold** for key terms and concepts
- Use bullet lists for multiple related points
- Keep answers concise but complete (2-4 sentences for simple questions, more for complex topics)

Your answer:`
          : `I'm reading this PDF document.

Question: ${question}

INSTRUCTIONS:
- Analyze the ENTIRE document (all pages, text, images, diagrams)
- Provide a comprehensive answer using information from anywhere in the PDF
- For math content: Be precise and show your reasoning
- Reference specific pages or sections when helpful
- Keep it concise but thorough

Your answer:`;

        // Generate content with inline PDF data
        console.log('📨 Sending request to Gemini with inline PDF...');
        const result = await model.generateContent([
          {
            inlineData: uploadedFileRef.current.inlineData,
          },
          { text: contextPrompt },
        ]);

        const answer = result.response.text();

        if (!answer) {
          throw new Error(ERROR_MESSAGES.AI_REQUEST_FAILED);
        }

        console.log('✅ Answer received:', { answerLength: answer.length });
        return answer;
      } catch (err) {
        let errorMessage: string = ERROR_MESSAGES.AI_REQUEST_FAILED;

        if (err instanceof Error) {
          if (err.message.includes('API_KEY') || err.message.includes('API key')) {
            errorMessage = ERROR_MESSAGES.INVALID_API_KEY;
          } else if (err.message.includes('quota') || err.message.includes('429')) {
            errorMessage = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        console.error('❌ AI request failed:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ===================================================================
  // Clear Context (Cleanup)
  // ===================================================================

  const clearContext = useCallback(async () => {
    console.log('🧹 Clearing PDF context...');

    try {
      // Inline mode doesn't require deletion from server
      // Just clear local references
      console.log('🧹 Clearing inline PDF data...');
    } catch (err) {
      console.warn('⚠️ Failed to clear context (non-critical):', err);
    }

    // Reset all state
    uploadedFileRef.current = null;
    pdfMetadataRef.current = null;
    genAIRef.current = null;
    setUploadedFileUri(null);
    setContextInitialized(false);
    setError(null);

    console.log('✅ Context cleared');
  }, []);

  // ===================================================================
  // Return Hook Interface
  // ===================================================================

  return {
    initializeContext,
    ask,
    clearContext,
    contextInitialized,
    isUploading,
    loading,
    error,
    uploadedFileUri,
  };
}
