import { ERROR_MESSAGES } from '@lib/constants';
import { getContextAroundSelection } from '@lib/chunking';
import React from 'react';
import AnswerBubble from './components/AnswerBubble';
import PdfViewer from './components/PdfViewer';
import { useAskAI } from './hooks/useAskAI';
import { useHighlight } from './hooks/useHighlight';
import { usePdfDocument } from './hooks/usePdfDocument';

const App: React.FC = () => {
  const { ask, loading, answer, error, clearAnswer } = useAskAI();
  const { highlightedText, captureSelection } = useHighlight();
  const {
    document,
    currentPage,
    totalPages,
    pageText,
    loading: pdfLoading,
    error: pdfError,
    loadPdf,
    nextPage,
    prevPage,
    goToPage,
    pdfDocument,
    currentPageObject,
  } = usePdfDocument();

  const handleAsk = async () => {
    if (!highlightedText) {
      alert(ERROR_MESSAGES.NO_TEXT_SELECTED);
      return;
    }

    // Extract context around the highlighted text from the current page
    const context = pageText 
      ? getContextAroundSelection(pageText, highlightedText)
      : highlightedText;

    // Ask AI with page context
    await ask('Explain this', context, currentPage);
  };

  return (
    <div onMouseUp={captureSelection} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* PDF Viewer */}
      <div style={{ flex: 1, position: 'relative' }}>
        <PdfViewer
          pdfDocument={pdfDocument}
          currentPageObject={currentPageObject}
          currentPage={currentPage}
          totalPages={totalPages}
          loading={pdfLoading}
          error={pdfError}
          onLoadPdf={loadPdf}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          onGoToPage={goToPage}
        />
        
        {/* AI Controls - Fixed position over PDF viewer */}
        {pdfDocument && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #ddd',
              maxWidth: '300px',
              zIndex: 1000,
            }}
          >
            <button
              onClick={handleAsk}
              disabled={!highlightedText || loading}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                cursor: !highlightedText || loading ? 'not-allowed' : 'pointer',
                opacity: !highlightedText || loading ? 0.5 : 1,
                border: '1px solid #007bff',
                borderRadius: '4px',
                backgroundColor: !highlightedText || loading ? '#f8f9fa' : '#007bff',
                color: !highlightedText || loading ? '#6c757d' : 'white',
                width: '100%',
              }}
            >
              {loading ? 'Thinking...' : 'Ask AI'}
            </button>

            {highlightedText && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                Selected: "{highlightedText.substring(0, 40)}
                {highlightedText.length > 40 ? '...' : ''}"
              </div>
            )}

            {/* Show current page info */}
            {pageText && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                Page {currentPage} • {pageText.length} characters
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
            zIndex: 1001,
            maxWidth: '400px',
          }}
        >
          AI Error: {error}
        </div>
      )}

      {/* Answer Bubble */}
      {answer && <AnswerBubble answer={answer} onClose={clearAnswer} />}
    </div>
  );
};

export default App;
