# 🎯 Simplified MVP - What Changed

## ✅ What We Removed (Over-Engineered Stuff)

### Deleted Files

- ❌ `src/lib/embedding.ts` - No embeddings needed!

### Simplified Files

#### 1. **`src/lib/chunking.ts`** → **`contextExtraction.ts`** (renamed conceptually)

**Before:** Pre-chunked entire PDF, created overlapping chunks for embeddings
**Now:** Simple function to get sentences around a highlight

```typescript
// Old: Complex chunking
chunkPdfText(text, page); // Created chunks with overlap for embeddings

// New: Simple context extraction
getContextAroundSelection(pageText, selectedText, {
  sentencesBefore: 2,
  sentencesAfter: 2,
});
```

#### 2. **`src/types/index.ts`**

**Removed:**

- ❌ `PdfChunk` with embedding arrays
- ❌ `VectorSearchResult`
- ❌ `EmbeddingCache`
- ❌ `Citation` with relevance scores
- ❌ Complex embedding-related types

**Kept:**

- ✅ `PdfDocument`, `PdfPage` (need for rendering)
- ✅ `AiQuestion`, `AiAnswer` (simplified - no vectors)
- ✅ `TextSelection`, `Highlight`
- ✅ Error classes

#### 3. **`src/lib/constants.ts`**

**Removed:**

- ❌ `DEFAULT_EMBEDDING_MODEL`
- ❌ `CHUNK_CONFIG` (complex chunking settings)
- ❌ `VECTOR_SEARCH_CONFIG` (topK, similarity thresholds)
- ❌ Embedding-related IPC channels

**Added:**

- ✅ `CONTEXT_CONFIG` (simple: sentences before/after)
- ✅ Simpler error messages

#### 4. **`src/lib/utils.ts`**

**Removed:**

- ❌ `cosineSimilarity()` - No vector math needed!

**Added:**

- ✅ `estimateTokenCount()` - Track API usage
- ✅ `truncateContext()` - Keep context under limits

#### 5. **`src/hooks/useAskAI.tsx`**

**Enhanced:**

- ✅ Better error handling
- ✅ Uses constants instead of hardcoded values
- ✅ Simplified API: `ask(question, context, pageNumber)`
- ✅ No more arrays of chunks - just a single context string!

---

## 🎯 The New Simplified Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User opens PDF                               │
│    → Renders with PDF.js                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. User highlights text                         │
│    → useHighlight() captures selection ✅        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Get context around highlight                 │
│    → getContextAroundSelection()                │
│    → Grabs 2 sentences before + after           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. User clicks "Ask AI"                         │
│    → useAskAI().ask(question, context)  ✅       │
│    → Sends to OpenAI with context               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. Show answer inline                           │
│    → AnswerBubble displays response ✅           │
└─────────────────────────────────────────────────┘
```

**No embeddings. No vector search. No pre-processing. Just simple context extraction!**

---

## 📊 Before vs After

| Aspect              | Before (Over-Engineered)                                 | After (Simplified)                    |
| ------------------- | -------------------------------------------------------- | ------------------------------------- |
| **PDF Opens**       | Extract all text → Chunk → Embed → Store vectors         | Just render PDF                       |
| **User Highlights** | Find in vector DB → Get similar chunks → Combine context | Get sentences around highlight        |
| **AI Call**         | Send question + top K similar chunks                     | Send question + surrounding sentences |
| **Complexity**      | High - async embedding, vector math                      | Low - string operations only          |
| **Dependencies**    | OpenAI embeddings API                                    | Just chat completions                 |
| **Startup Time**    | Slow (wait for embeddings)                               | Fast (instant)                        |
| **Cost**            | Embeddings + chat                                        | Just chat                             |

---

## 🛠️ What You Still Need to Build

### Priority 1: PDF Viewer

```typescript
// src/components/PdfViewer.tsx
// - Render PDF with PDF.js
// - Enable text selection layer
// - Extract text from current page
```

### Priority 2: Hook It All Together

```typescript
// In your main component:

// 1. Render PDF
<PdfViewer onPageChange={setCurrentPage} />;

// 2. User highlights text
const { highlightedText } = useHighlight();

// 3. Get context when user asks
const pageText = getCurrentPageText(); // from PDF
const context = getContextAroundSelection(pageText, highlightedText);

// 4. Ask AI (already works!)
const { ask, answer } = useAskAI();
ask('Explain this', context, currentPage);

// 5. Show answer (already works!)
{
  answer && <AnswerBubble answer={answer} />;
}
```

---

## 💡 Key Simplifications

### 1. **No Pre-Processing**

- Old: Load PDF → Extract all text → Chunk → Embed → Store
- New: Load PDF → Render → Done

### 2. **Context on Demand**

- Old: Vector search finds relevant chunks from entire document
- New: Just grab sentences around the highlight

### 3. **Single API Call**

- Old: Embeddings API (on load) + Chat API (on ask)
- New: Just Chat API (on ask)

### 4. **Simpler State**

- Old: Track chunks, embeddings, vector cache
- New: Track current page text

---

## 🎯 What This Means

### ✅ Pros

- **Faster startup** - No waiting for embeddings
- **Simpler code** - No vector math, no complex caching
- **Lower cost** - No embedding API calls
- **Easier to understand** - Linear flow
- **Good enough for MVP** - Cursor-style interaction works great!

### ⚠️ Limitations (That's OK for MVP!)

- Can't ask about content from other pages (only current page context)
- No "find similar sections" across document
- Context is limited to nearby text

### 🚀 Future Improvements (If Needed)

If users want to ask about the whole document:

1. Add simple full-text search (no embeddings needed)
2. Or: Let users manually include other pages
3. Or: Add embeddings later only if needed

---

## 📁 Current File Status

### ✅ Ready to Use

- `src/hooks/useHighlight.tsx` ✅
- `src/hooks/useAskAI.tsx` ✅ (just improved)
- `src/components/AnswerBubble.tsx` ✅
- `src/lib/chunking.ts` ✅ (now context extraction)
- `src/lib/constants.ts` ✅ (simplified)
- `src/lib/utils.ts` ✅ (simplified)
- `src/types/index.ts` ✅ (simplified)

### 🚧 Need to Build

- `src/components/PdfViewer.tsx` (next!)
- `src/hooks/usePdfDocument.tsx` (load & extract text)

### ❌ Can Ignore

- `electron/preload.ts` (over-engineered for now - can use direct fetch)
- Complex IPC stuff (not needed yet)

---

## 🎉 Summary

Your codebase is now **much simpler** and focused on the actual MVP:

**"Highlight text → Get nearby context → Ask AI → Show answer inline"**

No embeddings, no vector search, no complex pre-processing. Just like Cursor - simple and effective!

**Next step: Build the PDF viewer!** 🚀
