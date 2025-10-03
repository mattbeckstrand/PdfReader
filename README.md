# 🧠 AI-Native PDF Reader (MVP)

An intelligent PDF reader where AI lives **inside** the document, not in a sidebar.

## 🎯 Vision

Make reading complex documents radically easier by embedding a context-aware AI directly into the reading experience. Highlight text → Ask AI → Get inline answers.

## ✨ Features (MVP)

- **Native PDF Viewer**: Open PDFs locally, privacy-first
- **Highlight-to-Ask**: Highlight text, get an AI-powered answer inline
- **Context-Aware Responses**: Uses vector embeddings for grounded answers
- **In-Document Experience**: Answers appear directly in the PDF, not in a sidebar

## 🛠️ Tech Stack

- **Electron** - Cross-platform desktop app (macOS + Windows)
- **React + TypeScript** - Modern UI with type safety
- **Vite** - Fast development and build
- **PDF.js** - PDF rendering and text extraction
- **OpenAI** - GPT-4o for answers + embeddings for context

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone and install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your OpenAI API key:

   ```
   VITE_OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Run in development mode**

   ```bash
   # Terminal 1: Start Vite dev server
   npm run dev

   # Terminal 2: Start Electron app
   npm run electron:dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run electron:build
   ```

### Smart extraction (text → OCR fallback)

Set MathPix credentials (optional):

```
export MATHPIX_APP_ID=your_app_id
export MATHPIX_APP_KEY=your_app_key
```

Install Python deps (PyMuPDF, requests). Optional offline LaTeX OCR via pix2tex/latexocr:

```
pip3 install pymupdf requests
# optional offline OCR; see their docs for models
pip3 install pix2tex[gui]
```

Renderer usage:

```ts
await window.electronAPI.extract.region(pdfPath, pageNumber, { x, y, width, height });
```

## 📁 Project Structure

```
pdf-ai-reader/
├── electron/           # Electron main & preload scripts
│   ├── main.ts        # Main process (window management, IPC)
│   └── preload.ts     # Preload script (secure bridge to renderer)
├── src/
│   ├── components/    # React UI components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities (chunking, embeddings, etc.)
│   ├── types/         # Shared TypeScript types
│   ├── App.tsx        # Main app component
│   └── main.tsx       # React entry point
├── .cursorrules       # AI assistant rules (for Cursor IDE)
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

## 🧩 Key Concepts

### How It Works

1. **User opens a PDF** → The app extracts and chunks the text
2. **Text is embedded** → Using OpenAI's embedding API for semantic search
3. **User highlights text** → A floating "Ask AI" button appears
4. **User asks a question** → Vector search finds relevant context
5. **AI responds inline** → Answer appears directly under the highlight

### Architecture Patterns

- **Separation of Concerns**: Electron logic separate from React UI
- **Type Safety First**: Strict TypeScript with explicit types
- **Custom Hooks**: Reusable logic (e.g., `useHighlight`, `useAskAI`)
- **Context-Aware**: AI always knows what the user is looking at

## 🎨 Design Philosophy

- ✨ **Embedded, not bolted-on** - AI lives in the document
- 🤫 **Silent until needed** - No interruptions
- 🧠 **Context-native** - AI knows what you're reading
- 📍 **Source-grounded** - Answers cite specific pages
- 💡 **Zero friction** - No need to explain context

## 📚 Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [React TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)

## 🚧 Roadmap

**MVP (Current)**

- [x] Basic PDF viewer
- [x] Text highlighting
- [x] AI question/answer
- [ ] Vector embeddings & search
- [ ] Inline answer bubbles
- [ ] Citation to page numbers

**Future**

- Passive AI awareness (scroll tracking)
- Command palette (Cmd+K)
- Study mode with summaries
- Notebook view for saved Q&As
- Multi-PDF support

## 🤝 Contributing

This is an MVP - keep it simple! See `.cursorrules` for code guidelines.

## 📄 License

MIT

---

**Made with ❤️ for better reading experiences**
