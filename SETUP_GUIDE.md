# 🚀 Setup Guide - AI-Native PDF Reader

This guide explains the development environment setup and how to keep your codebase clean.

## 📋 What's Been Set Up

### 1. **Cursor Rules** (`.cursorrules`)

Your AI assistant will automatically follow these rules:

- ✅ Type safety enforcement (no `any` types)
- ✅ Component and hook naming conventions
- ✅ Electron security best practices
- ✅ MVP scope reminders (prevents feature creep!)
- ✅ Code organization patterns

**The AI will remind you if you're breaking these rules!**

### 2. **TypeScript Configuration** (`tsconfig.json`)

Strictest TypeScript settings enabled:

- ✅ `strict: true` - Maximum type safety
- ✅ `noUnusedLocals` - Catches unused variables
- ✅ `noImplicitAny` - Forces explicit types
- ✅ Path aliases (`@/`, `@components/`, `@hooks/`, `@lib/`)

**Usage Example:**

```typescript
// Instead of: import { useHighlight } from '../../hooks/useHighlight'
import { useHighlight } from '@hooks/useHighlight';
```

### 3. **Shared Types** (`src/types/index.ts`)

All TypeScript interfaces and types for:

- PDF documents, pages, chunks
- Highlights and selections
- AI questions/answers
- Vector search results
- Custom error classes

**Always import from here:**

```typescript
import type { PdfChunk, AiAnswer, TextSelection } from '@/types';
```

### 4. **Constants** (`src/lib/constants.ts`)

Centralized configuration:

- AI model settings
- Chunking parameters
- Vector search config
- Error messages
- IPC channel names

**Never hardcode values - use constants:**

```typescript
import { DEFAULT_AI_MODEL, ERROR_MESSAGES } from '@lib/constants';
```

### 5. **Utilities** (`src/lib/utils.ts`)

Reusable helper functions:

- String manipulation (`truncateText`, `normalizeWhitespace`)
- Vector math (`cosineSimilarity`)
- Error handling (`withErrorHandling`, `formatErrorForUser`)
- Debounce/throttle functions
- ID generation
- localStorage helpers

### 6. **Electron Preload** (`electron/preload.ts`)

Secure IPC bridge with type-safe API:

```typescript
// In renderer process:
const doc = await window.electronAPI.pdf.open(filePath);
const answer = await window.electronAPI.ai.ask(question, context);
```

### 7. **VSCode Configuration** (`.vscode/`)

- Auto-format on save
- Organize imports automatically
- TypeScript workspace version
- Recommended extensions

### 8. **Environment Variables** (`.env.example`)

Template for API keys and configuration:

```bash
cp .env.example .env
# Then add your actual OpenAI API key
```

## 🎯 Development Workflow

### Starting the App

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

### Adding a New Feature

1. **Define types first** in `src/types/index.ts`
2. **Create constants** if needed in `src/lib/constants.ts`
3. **Build the component/hook** following naming conventions
4. **Import using path aliases** (`@/`, `@components/`, etc.)
5. **Let Cursor AI help** - it knows all the rules!

### Example: Adding a New Hook

```typescript
// src/hooks/usePdfViewer.tsx
import { useState, useCallback } from 'react';
import type { PdfDocument, ViewerState } from '@/types';
import { PDF_CONFIG } from '@lib/constants';

export function usePdfViewer() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentPage: 1,
    zoom: PDF_CONFIG.defaultZoom,
    scrollPosition: 0,
  });

  const loadPdf = useCallback(async (filePath: string) => {
    const doc = await window.electronAPI.pdf.open(filePath);
    setDocument(doc);
  }, []);

  return {
    document,
    viewerState,
    loadPdf,
  };
}
```

## 🧹 Keeping Code Clean

### Automatic Checks

- **TypeScript compiler** catches type errors
- **VSCode** auto-formats on save
- **Cursor AI** enforces rules during development

### Manual Checks

Before committing:

```bash
# Check TypeScript errors
npx tsc --noEmit

# Format all files
npx prettier --write .
```

### Code Review Checklist

- [ ] No `any` types (use `unknown` if truly needed)
- [ ] No `console.log` (use proper logging in production)
- [ ] All imports organized
- [ ] Types imported from `@/types`
- [ ] Constants used instead of magic numbers/strings
- [ ] Error handling with try-catch
- [ ] Comments explain WHY, not WHAT

## 🎨 File Organization

```
src/
├── components/         # UI components (PascalCase)
│   └── AnswerBubble.tsx
├── hooks/             # Custom hooks (camelCase with 'use' prefix)
│   ├── useHighlight.tsx
│   └── useAskAI.tsx
├── lib/               # Utilities and business logic
│   ├── constants.ts   # App-wide constants
│   ├── utils.ts       # Helper functions
│   ├── chunking.ts    # PDF chunking logic
│   └── embedding.ts   # AI embedding logic
├── types/             # TypeScript definitions
│   ├── index.ts       # Main types
│   └── electron.d.ts  # Electron API types
├── App.tsx            # Main app component
└── main.tsx           # React entry point

electron/
├── main.ts            # Electron main process
└── preload.ts         # IPC bridge (secure)
```

## 🚨 Common Mistakes to Avoid

### ❌ DON'T

```typescript
// Implicit any
function processChunk(chunk) { ... }

// Magic numbers
if (text.length > 500) { ... }

// Direct API calls in components
const response = await fetch('https://api.openai.com/...');

// Hardcoded error messages
throw new Error('Something went wrong');
```

### ✅ DO

```typescript
// Explicit types
function processChunk(chunk: PdfChunk): ProcessedChunk { ... }

// Use constants
if (text.length > CHUNK_CONFIG.maxChunkSize) { ... }

// Use hooks for API calls
const { ask, loading, error } = useAskAI();

// Use error constants
throw new AiError(ERROR_MESSAGES.AI_REQUEST_FAILED, 'API_ERROR');
```

## 💡 Tips for Working with Cursor AI

### Ask for help like this:

- "Create a hook for PDF navigation that follows our patterns"
- "Add error handling to this function using our error types"
- "Refactor this component to use our constants"

### The AI knows:

- ✅ All your types and interfaces
- ✅ Your constants and utilities
- ✅ Naming conventions
- ✅ MVP scope (will warn if you scope creep)
- ✅ Electron security patterns

### The AI will:

- ✅ Suggest complete, working code
- ✅ Include proper imports
- ✅ Use your type system
- ✅ Follow your patterns
- ✅ Remind you of MVP focus

## 🔧 Troubleshooting

### TypeScript Errors

```bash
# Check what's wrong
npx tsc --noEmit

# Common fix: restart TS server in VSCode
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Import Path Issues

Make sure `tsconfig.json` is being used:

```bash
# In VSCode: bottom-right corner should show TypeScript version
# Click it and select "Use Workspace Version"
```

### Electron IPC Not Working

1. Check `preload.ts` is loaded in `main.ts`
2. Verify `contextIsolation: true` is set
3. Make sure you're using `window.electronAPI.xxx`

## 📚 Next Steps

1. **Set up your API key**

   ```bash
   cp .env.example .env
   # Edit .env and add: VITE_OPENAI_API_KEY=sk-your-key
   ```

2. **Start building the PDF viewer**

   - Create `PdfViewer` component
   - Integrate PDF.js
   - Add text selection

3. **Implement highlight-to-ask flow**

   - Enhance `useHighlight` hook
   - Connect to AI API
   - Show inline answers

4. **Add vector search**
   - Implement chunking on PDF open
   - Create embeddings
   - Add similarity search

## 🎯 Remember: MVP Only!

**In Scope:**

- ✅ Open PDF locally
- ✅ Highlight text
- ✅ Ask AI inline
- ✅ Vector search

**Out of Scope:**

- ❌ Chat history sidebar
- ❌ Notebook view
- ❌ Cloud sync
- ❌ User accounts
- ❌ Scroll tracking

**Cursor AI will remind you if you start building features that aren't in the MVP!**

---

Happy coding! 🚀 Your development environment is now set up to help you build clean, type-safe, maintainable code.
