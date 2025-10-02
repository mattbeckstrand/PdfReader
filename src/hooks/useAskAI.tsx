import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG, DEFAULT_AI_MODEL, ERROR_MESSAGES, GEMINI_API_KEY } from '@lib/constants';
import { useState } from 'react';

interface UseAskAIResult {
  ask: (question: string, context: string, pageNumber?: number) => Promise<void>;
  loading: boolean;
  answer: string | null;
  error: string | null;
  clearAnswer: () => void;
}

/**
 * Hook for asking AI questions with context using Google Gemini
 * Simplified: Just takes question + context string (no embeddings, no vector search)
 */
export function useAskAI(): UseAskAIResult {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string, context: string, pageNumber?: number) {
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      // Check for API key
      if (!GEMINI_API_KEY) {
        throw new Error(ERROR_MESSAGES.NO_API_KEY);
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: DEFAULT_AI_MODEL,
        generationConfig: {
          temperature: AI_CONFIG.temperature,
          maxOutputTokens: AI_CONFIG.maxTokens,
          topP: AI_CONFIG.topP,
        },
      });

      // Build the prompt
      const prompt = `You are helping someone read a PDF document. They highlighted some text and have a question about it.

Context from the document:
"""
${context}
"""

Question: ${question}

Provide a clear, concise answer based on the context above.${
        pageNumber ? ` (This is from page ${pageNumber})` : ''
      }`;

      // Get response from Gemini
      const result = await model.generateContent(prompt);
      const response = result.response;
      const answerText = response.text();

      if (!answerText) {
        throw new Error(ERROR_MESSAGES.AI_REQUEST_FAILED);
      }

      setAnswer(answerText);
    } catch (err) {
      let errorMessage = ERROR_MESSAGES.AI_REQUEST_FAILED;

      if (err instanceof Error) {
        // Handle specific Gemini errors
        if (err.message.includes('API_KEY')) {
          errorMessage = ERROR_MESSAGES.INVALID_API_KEY;
        } else if (err.message.includes('quota') || err.message.includes('429')) {
          errorMessage = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('AI request failed:', err);
    } finally {
      setLoading(false);
    }
  }

  function clearAnswer() {
    setAnswer(null);
    setError(null);
  }

  return { ask, loading, answer, error, clearAnswer };
}
