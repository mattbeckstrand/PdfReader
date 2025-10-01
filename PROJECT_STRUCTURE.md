# 📁 Complete Project Structure

```
pdf-ai-reader-setup_clean/
│
├── 📋 Configuration Files (Hidden)
│   ├── .cursorrules              ← AI assistant rules (MOST IMPORTANT!)
│   ├── .env.example              ← Environment variable template
│   ├── .gitignore                ← Git ignore patterns
│   ├── .prettierrc.json          ← Code formatting rules
│   └── .vscode/                  ← VSCode settings
│       ├── settings.json         ← Editor configuration
│       └── extensions.json       ← Recommended extensions
│
├── 📚 Documentation
│   ├── README.md                 ← Project overview & quick start
│   ├── SETUP_GUIDE.md            ← Detailed development guide
│   ├── CURSOR_SETUP_SUMMARY.md   ← What was set up & why
│   └── PROJECT_STRUCTURE.md      ← This file!
│
├── ⚡ Build Configuration
│   ├── package.json              ← Dependencies & scripts
│   ├── package-lock.json         ← Lock file
│   ├── tsconfig.json             ← TypeScript config (strict mode!)
│   ├── vite.config.ts            ← Vite bundler config
│   └── index.html                ← HTML entry point
│
├── 🖥️ Electron (Main Process)
│   └── electron/
│       ├── main.ts               ← Main process (window management)
│       └── preload.ts            ← Secure IPC bridge
│
└── ⚛️ React App (Renderer Process)
    └── src/
        ├── main.tsx              ← React entry point
        ├── App.tsx               ← Main app component
        │
        ├── 🧩 components/        ← React UI components
        │   └── AnswerBubble.tsx  ← AI answer display
        │
        ├── 🎣 hooks/             ← Custom React hooks
        │   ├── useHighlight.tsx  ← Text selection logic
        │   └── useAskAI.tsx      ← AI question/answer logic
        │
        ├── 🛠️ lib/               ← Utilities & business logic
        │   ├── constants.ts      ← App-wide constants ⭐
        │   ├── utils.ts          ← Helper functions ⭐
        │   ├── chunking.ts       ← PDF text chunking
        │   └── embedding.ts      ← AI embedding generation
        │
        └── 📝 types/             ← TypeScript definitions
            ├── index.ts          ← Main type definitions ⭐
            └── electron.d.ts     ← Electron API types

```

## 🌟 Key Files Explained

### ⭐ Files You'll Use Most

| File                   | Purpose                   | When to Use                     |
| ---------------------- | ------------------------- | ------------------------------- |
| `src/types/index.ts`   | All TypeScript types      | Creating/importing types        |
| `src/lib/constants.ts` | All configuration values  | Need a config value or constant |
| `src/lib/utils.ts`     | Reusable helper functions | Need a utility function         |
| `.cursorrules`         | AI assistant guidelines   | Understanding project patterns  |

### 🔧 Configuration Deep Dive

#### `.cursorrules` - The Brain of Your Setup

- 255 lines of development rules
- Enforces naming conventions
- Defines code organization patterns
- Sets MVP boundaries
- Guides Cursor AI suggestions

#### `tsconfig.json` - Type Safety Commander

- Strictest TypeScript settings
- Path aliases configured (`@/`, `@components/`, etc.)
- No implicit `any` allowed
- Catches unused variables
- Forces explicit return types

#### `electron/preload.ts` - Security Bridge

- Exposes safe API to renderer
- Type-safe IPC communication
- `contextIsolation: true` (secure!)
- No Node.js API exposure

### 📦 What Each Folder Does

```
components/   → Reusable UI pieces (PascalCase files)
hooks/        → Custom React hooks (camelCase, 'use' prefix)
lib/          → Pure functions, no UI (camelCase files)
types/        → TypeScript definitions only
electron/     → Main process code (Node.js APIs)
```

## 🎯 Import Patterns

### Use Path Aliases ✅

```typescript
import { useHighlight } from '@hooks/useHighlight';
import { PdfChunk, AiAnswer } from '@/types';
import { CHUNK_CONFIG, ERROR_MESSAGES } from '@lib/constants';
import { cosineSimilarity, debounce } from '@lib/utils';
```

### Not Relative Paths ❌

```typescript
import { useHighlight } from '../../../hooks/useHighlight';
import { PdfChunk } from '../../types';
```

## 📊 File Count Summary

| Category         | Files | Notes                                 |
| ---------------- | ----- | ------------------------------------- |
| Configuration    | 7     | TypeScript, Prettier, VSCode, etc.    |
| Documentation    | 4     | Guides and references                 |
| Electron         | 2     | Main + Preload                        |
| React Components | 1     | AnswerBubble (more to come)           |
| React Hooks      | 2     | useHighlight, useAskAI                |
| Utilities        | 4     | constants, utils, chunking, embedding |
| Types            | 2     | Main types + Electron types           |

**Total: 22 files** (excluding node_modules, build artifacts)

## 🚀 What's Next to Build

### Phase 1: PDF Viewer

Create these files:

```
src/components/PdfViewer.tsx
src/hooks/usePdfRenderer.tsx
src/hooks/usePdfNavigation.tsx
```

### Phase 2: Vector Search

Create these files:

```
src/lib/vectorSearch.ts
src/lib/embeddingCache.ts
src/hooks/useVectorSearch.tsx
```

### Phase 3: Enhanced UI

Create these files:

```
src/components/HighlightLayer.tsx
src/components/AskButton.tsx
src/hooks/useInlinePosition.tsx
```

## 💡 Navigation Tips

### Finding Things Quickly

**In VSCode:**

- `Cmd+P` → Quick file open
- `Cmd+Shift+F` → Search in all files
- `Cmd+Click` → Jump to definition
- `F12` → Go to type definition

**Type any of these in Quick Open:**

- `@types` → Open types/index.ts
- `@const` → Open constants.ts
- `@utils` → Open utils.ts
- `useHigh` → Open useHighlight.tsx

### Common Locations

```
Need types?          → src/types/index.ts
Need constants?      → src/lib/constants.ts
Need utilities?      → src/lib/utils.ts
Check rules?         → .cursorrules
Development guide?   → SETUP_GUIDE.md
```

## 🎨 File Naming Conventions

| Type            | Convention               | Example                         |
| --------------- | ------------------------ | ------------------------------- |
| React Component | PascalCase               | `AnswerBubble.tsx`              |
| React Hook      | camelCase, `use` prefix  | `useHighlight.tsx`              |
| Utility File    | camelCase                | `chunking.ts`                   |
| Type File       | camelCase                | `index.ts`                      |
| Constant        | SCREAMING_SNAKE_CASE     | `MAX_CHUNK_SIZE`                |
| Config File     | kebab-case or dot-prefix | `.cursorrules`, `tsconfig.json` |

## 🔍 Quick Reference

### Where to Put New Code

**Creating a React component?**
→ `src/components/YourComponent.tsx`

**Creating a custom hook?**
→ `src/hooks/useYourHook.tsx`

**Creating a utility function?**
→ Add to `src/lib/utils.ts` or create new file in `src/lib/`

**Creating new types?**
→ Add to `src/types/index.ts`

**Adding constants?**
→ Add to `src/lib/constants.ts`

**Adding Electron IPC?**
→ Update `electron/main.ts` and `electron/preload.ts`

## ✅ Health Check

Your project is healthy if:

- ✅ No TypeScript errors (`npx tsc --noEmit`)
- ✅ All files follow naming conventions
- ✅ No `any` types in code
- ✅ Constants used (no magic numbers)
- ✅ Types imported from `@/types`
- ✅ Cursor AI suggestions match your patterns

---

**This structure is designed to scale.** As you add features, follow these patterns and your codebase will stay clean and maintainable! 🎉
