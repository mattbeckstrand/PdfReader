import React from 'react';
import PdfViewer from './components/PdfViewer';
import { usePdfDocument } from './hooks/usePdfDocument';

const App: React.FC = () => {
  const {
    currentPage,
    totalPages,
    loading,
    error,
    loadPdf,
    nextPage,
    prevPage,
    goToPage,
    pdfDocument,
    currentPageObject,
  } = usePdfDocument();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PdfViewer
        pdfDocument={pdfDocument}
        currentPageObject={currentPageObject}
        currentPage={currentPage}
        totalPages={totalPages}
        loading={loading}
        error={error}
        onLoadPdf={loadPdf}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onGoToPage={goToPage}
      />
    </div>
  );
};

export default App;
