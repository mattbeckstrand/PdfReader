# Quick Start: Multimodal PDF Context

## What Changed?

Your PDF reader now uploads the **entire PDF to Gemini** when you load it, giving the AI:

- ✅ Full document text
- ✅ All images, diagrams, equations
- ✅ Document structure and layout
- ✅ Cross-page understanding

Perfect for **math PDFs with equations and figures**!

---

## How to Use

### 1. Start the App

```bash
npm run electron:dev
```

### 2. Load a PDF

- Click "Open PDF"
- Choose your PDF
- **Wait for upload**: You'll see "Uploading PDF to AI..."
- **Look for green badge**: "✓ AI has full document context"

### 3. Ask Questions

- Highlight any text
- Click "Explain This" or "Ask AI"
- AI now has **full context** including images!

---

## Example Questions (That Now Work!)

### For Math PDFs

- "What does this equation mean?"
- "How do I solve this problem step by step?"
- "Explain the diagram on this page"
- "What's the relationship between this and the theorem on page 3?"

### For Technical Docs

- "Describe this flowchart"
- "What does this figure show?"
- "How does this code snippet work?"

### Cross-Page Questions

- "Compare this to the example on page 5"
- "How does this relate to earlier sections?"
- "Summarize the key points from pages 10-15"

---

## File Structure

### New Files

- `src/hooks/usePdfContext.tsx` - Handles file upload and multimodal queries

### Modified Files

- `src/hooks/usePdfDocument.tsx` - Stores original File object
- `src/App.tsx` - Auto-uploads PDF, integrates new context
- `src/lib/constants.ts` - File API configuration

---

## Troubleshooting

### "Please wait for PDF to be processed"

- The upload is still in progress
- Wait for the green badge to appear

### "Failed to initialize PDF context"

- Check your API key in `.env`
- Make sure file is < 50MB
- Check internet connection

### AI can't see images

- Make sure you're using `gemini-2.0-flash-exp` or `gemini-2.0-pro-exp`
- Check console logs for upload success

---

## What's Different?

| Before                                        | After                                              |
| --------------------------------------------- | -------------------------------------------------- |
| Only sees highlighted text + nearby sentences | **Sees entire PDF**                                |
| No image understanding                        | **Full vision**: sees diagrams, equations, figures |
| Can't reference other pages                   | **Cross-page reasoning**                           |
| Text-only                                     | **Multimodal**: text + images                      |

---

## Next Steps

1. **Test it out**: Load a math PDF and ask about equations
2. **Try cross-page questions**: Reference multiple pages
3. **Ask about figures**: "What does this diagram show?"
4. **Compare sections**: "How is this different from page 5?"

---

**Full documentation**: See `MULTIMODAL_IMPLEMENTATION.md`
