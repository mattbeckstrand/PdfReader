import { ERROR_MESSAGES } from '@lib/constants';
import React from 'react';
import AnswerBubble from './components/AnswerBubble';
import { useAskAI } from './hooks/useAskAI';
import { useHighlight } from './hooks/useHighlight';

const App: React.FC = () => {
  const { ask, loading, answer, error, clearAnswer } = useAskAI();
  const { highlightedText, captureSelection } = useHighlight();

  const handleAsk = async () => {
    if (!highlightedText) {
      alert(ERROR_MESSAGES.NO_TEXT_SELECTED);
      return;
    }

    // For now, just use the highlighted text as context
    // When PDF viewer is built, this will include surrounding sentences
    await ask('Explain this', highlightedText);
  };

  return (
    <div onMouseUp={captureSelection} style={{ padding: '20px' }}>
      <h1>AI PDF Reader MVP (Simplified)</h1>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Highlight text below and click "Ask AI" to test the flow
      </p>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
          deserunt mollit anim id est laborum.
        </p>
      </div>

      <div style={{ marginTop: '15px' }}>
        <button
          onClick={handleAsk}
          disabled={!highlightedText || loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: !highlightedText || loading ? 'not-allowed' : 'pointer',
            opacity: !highlightedText || loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>

        {highlightedText && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Selected: "{highlightedText.substring(0, 50)}
            {highlightedText.length > 50 ? '...' : ''}"
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          Error: {error}
        </div>
      )}

      {answer && <AnswerBubble answer={answer} onClose={clearAnswer} />}
    </div>
  );
};

export default App;
