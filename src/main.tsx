import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import PDF.js text layer CSS for proper text selection and highlighting
import 'pdfjs-dist/legacy/web/pdf_viewer.css';
import './styles/library.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
