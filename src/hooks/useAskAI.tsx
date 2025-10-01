import { AI_CONFIG, DEFAULT_AI_MODEL, ERROR_MESSAGES } from '@lib/constants';
import { useState } from 'react';

interface UseAskAIResult {
  ask: (question: string, context: string, pageNumber?: number) => Promise<void>;
  loading: boolean;
  answer: string | null;
  error: string | null;
  clearAnswer: () => void;
}

/**
 * Hook for asking AI questions with context
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
      const prompt = `You are helping someone read a PDF document. They highlighted some text and have a question about it.

Context from the document:
"""
${context}
"""

Question: ${question}

Provide a clear, concise answer based on the context above.${
        pageNumber ? ` (This is from page ${pageNumber})` : ''
      }`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_AI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: AI_CONFIG.temperature,
          max_tokens: AI_CONFIG.maxTokens,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
        }
        if (response.status === 401) {
          throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
        }
        throw new Error(ERROR_MESSAGES.AI_REQUEST_FAILED);
      }

      const json = await response.json();
      const answerText = json.choices?.[0]?.message?.content;

      if (!answerText) {
        throw new Error(ERROR_MESSAGES.AI_REQUEST_FAILED);
      }

      setAnswer(answerText);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.AI_REQUEST_FAILED;
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
