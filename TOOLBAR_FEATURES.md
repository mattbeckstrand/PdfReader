# Toolbar Features Implementation

## Overview

Added two new feature buttons to the center of the PDF viewer toolbar:

1. **Share PDF** - Multiple ways to share the document
2. **Highlight Text** - Color-coded text highlighting with persistence

---

## 1. Share PDF Feature

### Location

Center of the top toolbar (between left controls and page navigation)

### Features

- **Share via Email** - Opens default email client with file details
- **Copy File Path** - Copies the PDF file path to clipboard
- **Copy to Clipboard** - Copies the PDF file data for drag-drop/paste
- **Show in Finder** - Opens the file location in Finder (macOS) or Explorer (Windows)

### Implementation Details

- Component: `src/components/ShareDropdown.tsx`
- Electron IPC handler: `shell:show-item-in-folder` in `electron/main.ts`
- Uses Electron's `shell.showItemInFolder()` API
- Dropdown closes on outside click
- Visual feedback for copied states

---

## 2. Text Highlighting Feature

### Location

Center of the top toolbar (next to Share button)

### Features

- **6 Color Options**:
  - Yellow (default)
  - Green
  - Blue
  - Pink
  - Orange
  - Purple
- **Keyboard Shortcut**: `⌘H` (Mac) / `Ctrl+H` (Windows/Linux)
- **Persistent Storage**: Highlights saved per document in localStorage
- **Color Picker Dropdown**: Select highlight color before highlighting

### How to Use

1. **Select text** in the PDF
2. Highlight the text using one of these methods:
   - Press `⌘H` (or `Ctrl+H`) to highlight with current color
   - Click the "Highlight" button to highlight with current color
   - **Shift+Click** the "Highlight" button to change color first
3. **Right-click** on any highlight to remove it
4. Highlights persist across app sessions

### Implementation Details

- Color Picker Component: `src/components/HighlightColorPicker.tsx`
- Highlight Overlay Component: `src/components/HighlightOverlay.tsx`
- Highlights Hook: `src/hooks/useHighlights.tsx`
- Storage: Per-document highlights in localStorage with key `highlights-{documentId}`
- Keyboard handler integrated into `PdfViewer.tsx`
- Visual rendering integrated into `PdfPage.tsx`

### Data Structure

```typescript
interface Highlight {
  id: string;
  pageNumber: number;
  color: HighlightColor;
  text: string;
  rects: DOMRect[]; // Bounding rectangles for the highlighted text
  timestamp: number;
}
```

---

## Icons Added

### New Icons in `src/components/Icons.tsx`

- `IconShare` - Share/send icon
- `IconHighlight` - Highlighter icon
- `IconChevronDown` - Dropdown chevron for menus

---

## File Changes Summary

### New Files

- `src/components/ShareDropdown.tsx` - Share menu component
- `src/components/HighlightColorPicker.tsx` - Color picker component
- `src/components/HighlightOverlay.tsx` - Highlight rendering overlay
- `src/hooks/useHighlights.tsx` - Highlight state management hook

### Modified Files

- `src/components/Icons.tsx` - Added 3 new icons
- `src/components/PdfViewer.tsx` - Integrated share and highlight features
- `src/components/PdfPage.tsx` - Added highlight overlay rendering
- `src/App.tsx` - Passed `documentId` prop to PdfViewer
- `src/types/electron.d.ts` - Added `shell` API types
- `electron/preload.ts` - Added `shell` API exposure
- `electron/main.ts` - Added `shell:show-item-in-folder` IPC handler

---

## Usage Notes

### Share Feature

- Requires a document to be open
- PDF path must be stored in localStorage (`lastPdfPath`)
- "Show in Finder" button uses Electron's shell API

### Highlight Feature

- Requires a document to be open
- Highlights are stored per document ID
- Selected color persists across sessions
- Keyboard shortcut works from anywhere in the app (when not in input fields)

---

## Future Enhancements (Not Implemented)

### Share Feature

- [ ] AirDrop integration (macOS)
- [ ] System share sheet (native)
- [ ] Direct messaging app integrations
- [ ] Cloud upload options

### Highlight Feature

- [x] Render highlight overlays on PDF canvas
- [x] Right-click to remove highlights
- [ ] Click-and-drag to highlight (currently text selection only)
- [ ] Highlight notes/annotations
- [ ] Export highlights as markdown
- [ ] Search within highlights
- [ ] Highlight categories/tags

---

## Testing Checklist

### Build & Code Quality

- [x] Build succeeds without errors
- [x] No TypeScript linter errors

### Share Feature

- [x] Share dropdown opens/closes correctly
- [ ] Share via email opens email client
- [ ] Copy path copies to clipboard
- [ ] Show in Finder opens file location

### Highlight Feature

- [x] Highlight color picker opens/closes correctly
- [x] Keyboard shortcut (⌘H) registered
- [x] Click highlight button with selected text highlights it
- [x] Shift+Click opens color picker
- [x] Highlights render visually on PDF pages
- [x] Right-click removes highlights
- [ ] Highlights persist after app restart (needs testing)
- [ ] Highlights work on different pages (needs testing)
- [ ] Color selection changes highlight color (needs testing)
