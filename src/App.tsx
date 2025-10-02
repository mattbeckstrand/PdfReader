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
    setCurrentPage,
    pdfDocument,
    allPageObjects,
  } = usePdfDocument();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PdfViewer
        pdfDocument={pdfDocument}
        allPageObjects={allPageObjects}
        currentPage={currentPage}
        totalPages={totalPages}
        loading={loading}
        error={error}
        onLoadPdf={loadPdf}
        onSetCurrentPage={setCurrentPage}
      />
    </div>
  );
};

export default App;
