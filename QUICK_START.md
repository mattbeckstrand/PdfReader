# ⚡ Quick Start - AI PDF Reader

## 🎯 You're All Set! Here's What to Do Next

### Step 1: Set Up Your API Key (Required)
```bash
cp .env.example .env
# Then edit .env and add your OpenAI API key:
# VITE_OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 2: Start Development
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron app
npm run electron:dev
```

### Step 3: Start Building
Ask Cursor AI to help you build features:
- "Create a PDF viewer component using PDF.js"
- "Add text selection highlighting"
- "Implement vector search for context"

## 📚 Important Files to Know

| File | What It Is |
|------|------------|
| `.cursorrules` | Rules for Cursor AI (auto-enforces patterns) |
| `SETUP_GUIDE.md` | Complete development guide |
| `CURSOR_SETUP_SUMMARY.md` | What was set up and why |
| `PROJECT_STRUCTURE.md` | File organization reference |
| `src/types/index.ts` | All TypeScript types |
| `src/lib/constants.ts` | All configuration values |

## 💡 Pro Tips

### Use Path Aliases
```typescript
import { useHighlight } from '@hooks/useHighlight';
import type { PdfChunk } from '@/types';
import { CHUNK_CONFIG } from '@lib/constants';
```

### Let Cursor AI Help
Just ask naturally:
- "Create a hook for PDF navigation"
- "Add error handling to this function"
- "Refactor this to use our types"

Cursor knows all your patterns, types, and constants!

### Check for Errors
```bash
npx tsc --noEmit  # Check TypeScript
```

## 🎯 What You Got

✅ Strictest TypeScript configuration
✅ Complete type system for PDF + AI
✅ Secure Electron IPC setup
✅ Utility functions and constants
✅ VSCode auto-formatting
✅ Cursor AI trained on your patterns
✅ Zero linting errors
✅ Clean file organization

## 🚀 Build Order (MVP)

1. **PDF Viewer** - Render PDFs with PDF.js
2. **Text Selection** - Highlight text in PDF
3. **AI Integration** - Ask questions on highlights
4. **Vector Search** - Find relevant context
5. **Inline Answers** - Show responses in document

## 📖 Need More Info?

- Quick patterns → `SETUP_GUIDE.md`
- File locations → `PROJECT_STRUCTURE.md`
- What was setup → `CURSOR_SETUP_SUMMARY.md`
- General info → `README.md`

---

**Ready to build! Let Cursor AI guide you.** 🚀
