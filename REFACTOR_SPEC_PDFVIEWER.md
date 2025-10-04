# PdfViewer.tsx Refactoring Specification (AI Agent)

**Type:** Component Extraction & State Management Refactoring
**File:** `src/components/PdfViewer.tsx` (1,365 lines)
**Target:** 17 focused modules (<200 lines each)
**Priority:** 🔥 MOST CRITICAL FILE

---

## Objective

Refactor PdfViewer.tsx by extracting toolbar, controls, hooks, and styles while preserving exact PDF viewing functionality including zoom, navigation, highlights, and sidebar management.

---

## Constraints

1. **Zero Behavior Change**: PDF viewing must work identically
2. **Type Safety**: Maintain strict TypeScript, no any types
3. **Props Interface**: `PdfViewerProps` must remain unchanged
4. **PDF.js Compatibility**: Preserve all PDF.js legacy build usage
5. **Highlight System**: Preserve entire highlight overlay system
6. **Performance**: Maintain virtual scrolling and intersection observers
7. **Keyboard Shortcuts**: Preserve all keyboard shortcuts exactly

---

## Target Architecture

```
src/features/pdf-viewer/
  ├── PdfViewer.tsx                (~180 lines - orchestrator)
  ├── components/
  │   ├── PdfToolbar.tsx           (~200 lines - entire header)
  │   ├── EmptyState.tsx           (~80 lines - welcome screen)
  │   ├── LoadingState.tsx         (~40 lines - loading spinner)
  │   └── ErrorState.tsx           (~40 lines - error display)
  ├── hooks/
  │   ├── usePdfViewerState.ts     (~100 lines - state management)
  │   ├── useZoom.ts               (~120 lines - zoom + shortcuts)
  │   ├── useSidebar.ts            (~80 lines - sidebar state)
  │   ├── useKeyboardNav.ts        (~120 lines - navigation shortcuts)
  │   ├── usePageTracking.ts       (~80 lines - scroll detection)
  │   └── useHighlightMode.ts      (~80 lines - highlight state)
  └── styles/
      └── pdf-viewer.module.css    (~200 lines - all styles)
```

---

## Step 1: Extract CSS Module

**Path**: `src/features/pdf-viewer/styles/pdf-viewer.module.css`

**Requirements**:

- Extract ALL inline styles except dynamic positioning/sizing
- Use BEM-style naming conventions
- Preserve all animations and transitions
- Use CSS custom properties (var(--text-1), etc.)
- Keep text selection styles for .textLayer

**Key Classes**:

- `.viewer` - main container (width: 100%, height: 100vh, flex column)
- `.header` - toolbar (padding, border-bottom, flex row)
- `.headerLeft`, `.headerCenter`, `.headerRight` - toolbar sections
- `.btn` - base button style with hover states
- `.btn--active` - active button variant
- `.pageNav` - page navigation controls
- `.pageInput` - page number input field
- `.content` - scrollable PDF area
- `.loading`, `.spinner`, `.loadingText` - loading state
- `.error`, `.errorTitle`, `.errorMessage` - error state
- `.emptyState`, `.emptyStateContent`, `.emptyStateTitle`, etc. - welcome screen
- `.pdfContainer` - PDF pages container with zoom transform

**Animations to Preserve**:

```css
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.textLayer ::selection {
  background: rgba(0, 0, 0, 0.15);
  color: transparent;
}
```

---

## Step 2: Extract usePdfViewerState Hook

**Path**: `src/features/pdf-viewer/hooks/usePdfViewerState.ts`

**Purpose**: Consolidate all useState calls into single state management hook

**Interface**:

```typescript
interface PdfViewerState {
  pageInput: string;
  visiblePages: Set<number>;
  sidebarOpen: boolean;
  sidebarWidth: number;
  zoom: number;
  shareDropdownOpen: boolean;
  highlightPickerOpen: boolean;
  highlightModeActive: boolean;
  selectedHighlightColor: HighlightColor;
}

export function usePdfViewerState(): {
  state: PdfViewerState;
  setPageInput: (value: string) => void;
  setVisiblePages: (value: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setSidebarOpen: (value: boolean) => void;
  setSidebarWidth: (value: number) => void;
  setZoom: (value: number) => void;
  setShareDropdownOpen: (value: boolean) => void;
  setHighlightPickerOpen: (value: boolean) => void;
  setHighlightModeActive: (value: boolean) => void;
  setSelectedHighlightColor: (value: HighlightColor) => void;
};
```

**Requirements**:

- Initialize state with localStorage for persistent values
- Keys: `pdfViewer.sidebarOpen`, `pdfViewer.sidebarWidth`, `pdfViewer.zoom`, `pdfViewer.highlightColor`
- Defaults: sidebarOpen=true, sidebarWidth=200, zoom=1.0, highlightColor='yellow'
- Return state object and setter functions
- Use useState for each piece of state

**Extract From**: Lines ~85-118 in PdfViewer.tsx

---

## Step 3: Extract useZoom Hook

**Path**: `src/features/pdf-viewer/hooks/useZoom.ts`

**Purpose**: Handle zoom state, keyboard shortcuts, and trackpad gestures

**Interface**:

```typescript
interface UseZoomOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  enabled: boolean;
}

export function useZoom(
  initialZoom: number,
  onZoomChange: (zoom: number) => void,
  options: UseZoomOptions
): {
  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setZoom: (value: number | ((prev: number) => number)) => void;
};
```

**Requirements**:

- Clamp zoom between 0.5 (50%) and 3.0 (300%)
- Increment/decrement by 0.1
- Keyboard shortcuts (Cmd/Ctrl + +/-/0)
- Trackpad pinch-to-zoom (wheel event with ctrl/meta)
- Skip shortcuts when input is focused
- Persist zoom to localStorage on change
- Use ref internally to track zoom for event handlers
- Clean up event listeners on unmount

**Logic to Extract**:

- Lines ~308-318 (handleZoomIn, handleZoomOut, handleResetZoom)
- Lines ~487-580 (keyboard shortcuts useEffect - extract zoom portion only)
- Lines ~587-613 (trackpad pinch-to-zoom useEffect)

---

## Step 4: Extract useSidebar Hook

**Path**: `src/features/pdf-viewer/hooks/useSidebar.ts`

**Purpose**: Manage sidebar state and persistence

**Interface**:

```typescript
export function useSidebar(): {
  sidebarOpen: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
};
```

**Requirements**:

- Load initial state from localStorage
- Persist changes to localStorage
- Keys: `pdfViewer.sidebarOpen`, `pdfViewer.sidebarWidth`
- Defaults: open=true, width=200
- Provide toggle function

**Logic to Extract**:

- Lines ~90-99 (initial state from localStorage)
- Lines ~160-170 (persistence useEffects)
- Lines ~280-282 (toggle function)

---

## Step 5: Extract useKeyboardNav Hook

**Path**: `src/features/pdf-viewer/hooks/useKeyboardNav.ts`

**Purpose**: Handle keyboard navigation shortcuts

**Interface**:

```typescript
interface UseKeyboardNavOptions {
  enabled: boolean;
  currentPage: number;
  totalPages: number;
  pageRefsMap: React.MutableRefObject<Map<number, HTMLDivElement>>;
}

export function useKeyboardNav(options: UseKeyboardNavOptions): void;
```

**Requirements**:

- Only enable when PDF is loaded
- Skip if input field is focused
- Handle: ArrowDown, ArrowUp, PageDown, PageUp, Home, End
- Scroll to page using smooth behavior
- Prevent default on handled keys
- Don't interfere with zoom shortcuts (handled by useZoom)

**Logic to Extract**:

- Lines ~487-580 (keyboard shortcuts useEffect - extract navigation portion)

---

## Step 6: Extract usePageTracking Hook

**Path**: `src/features/pdf-viewer/hooks/usePageTracking.ts`

**Purpose**: Detect current page based on scroll position

**Interface**:

```typescript
interface UsePageTrackingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  visiblePages: Set<number>;
  currentPage: number;
  pageRefsMap: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onPageChange: (page: number) => void;
}

export function usePageTracking(options: UsePageTrackingOptions): void;
```

**Requirements**:

- Debounce scroll events (150ms)
- Find page closest to top of viewport
- Prefer pages at or above viewport top (with 100px threshold)
- Only update when page actually changes
- Clean up timeout on unmount

**Logic to Extract**:

- Lines ~432-482 (scroll detection useEffect)

---

## Step 7: Extract useHighlightMode Hook

**Path**: `src/features/pdf-viewer/hooks/useHighlightMode.ts`

**Purpose**: Manage highlight mode and keyboard shortcuts

**Interface**:

```typescript
export function useHighlightMode(
  enabled: boolean,
  onToggle: (active: boolean) => void
): {
  handleHighlightShortcut: () => void;
};
```

**Requirements**:

- Escape key exits highlight mode
- Cmd/Ctrl+H triggers highlight of selected text
- Get selection from window.getSelection()
- Calculate page-relative rectangles
- Filter out tiny artifacts (< 2px wide, < 4px tall)
- Account for zoom level in calculations
- Clear selection after highlighting

**Logic to Extract**:

- Lines ~189-199 (Escape key handler)
- Lines ~204-275 (handleHighlightText function)
- Lines ~487-580 (Cmd/Ctrl+H portion of keyboard shortcuts)

---

## Step 8: Extract EmptyState Component

**Path**: `src/features/pdf-viewer/components/EmptyState.tsx`

**Interface**:

```typescript
interface EmptyStateProps {
  onOpenFile: () => void;
}

export const EmptyState: React.FC<EmptyStateProps>;
```

**Requirements**:

- Title: "AI PDF Reader"
- Description: "Select text to interact with document intelligence"
- Button: "Open Document"
- Hint: "⌘O to open"
- Use styles from CSS module

**Logic to Extract**: Lines ~1017-1111

---

## Step 9: Extract LoadingState Component

**Path**: `src/features/pdf-viewer/components/LoadingState.tsx`

**Interface**:

```typescript
export const LoadingState: React.FC;
```

**Requirements**:

- Spinning loader
- Text: "Loading document..."
- Use spinner animation from CSS module

**Logic to Extract**: Lines ~955-985

---

## Step 10: Extract ErrorState Component

**Path**: `src/features/pdf-viewer/components/ErrorState.tsx`

**Interface**:

```typescript
interface ErrorStateProps {
  error: string;
}

export const ErrorState: React.FC<ErrorStateProps>;
```

**Requirements**:

- Title: "Error loading document"
- Display error message
- Use styles from CSS module

**Logic to Extract**: Lines ~989-1014

---

## Step 11: Extract PdfToolbar Component

**Path**: `src/features/pdf-viewer/components/PdfToolbar.tsx`

**Interface**:

```typescript
interface PdfToolbarProps {
  // PDF state
  hasPdf: boolean;
  currentPage: number;
  totalPages: number;

  // Sidebar
  sidebarOpen: boolean;
  onToggleSidebar: () => void;

  // Page navigation
  pageInput: string;
  onPageInputChange: (value: string) => void;
  onPageSubmit: (e: React.FormEvent) => void;

  // Share
  pdfPath?: string;
  shareDropdownOpen: boolean;
  onShareToggle: () => void;
  shareButtonRef: React.RefObject<HTMLButtonElement>;

  // Highlight
  highlightPickerOpen: boolean;
  highlightModeActive: boolean;
  selectedHighlightColor: HighlightColor;
  onHighlightPickerToggle: () => void;
  onColorSelect: (color: HighlightColor) => void;
  onDisableHighlightMode: () => void;
  highlightButtonRef: React.RefObject<HTMLButtonElement>;

  // Theme
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;

  // Chat
  onToggleChat?: () => void;

  // Document menu
  documentMenuSlot?: React.ReactNode;
}

export const PdfToolbar: React.FC<PdfToolbarProps>;
```

**Structure**:

- Left section: Sidebar toggle, document menu slot
- Center section: Share button, highlight button (only when PDF loaded)
- Page navigation: Form with input and total (only when PDF loaded)
- Right section: Theme toggle, chat toggle

**Components to Import**:

- `PanelLeftClose`, `PanelLeftOpen` from 'lucide-react'
- `Moon`, `Sun` from 'lucide-react'
- `HighlightColorPicker` from './HighlightColorPicker'
- `ShareDropdown` from './ShareDropdown'
- `IconShare`, `IconHighlight`, `IconChevronDown` from './Icons'

**Requirements**:

- Use refs for dropdown button positioning
- Handle form submit for page navigation
- Conditional rendering based on hasPdf
- Use CSS module classes
- Preserve all button titles/tooltips

**Logic to Extract**: Lines ~638-935

---

## Step 12: Refactor PdfViewer.tsx

**Target Structure**:

```typescript
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHighlights } from '../hooks/useHighlights';
import type { RegionSelection } from '../types';
import { HighlightColorPicker, type HighlightColor } from './HighlightColorPicker';
import { PageThumbnailSidebar } from './PageThumbnailSidebar';
import PdfPage from './PdfPage';
import { ShareDropdown } from './ShareDropdown';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';
import { PdfToolbar } from './components/PdfToolbar';
import { useHighlightMode } from './hooks/useHighlightMode';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { usePageTracking } from './hooks/usePageTracking';
import { usePdfViewerState } from './hooks/usePdfViewerState';
import { useSidebar } from './hooks/useSidebar';
import { useZoom } from './hooks/useZoom';
import styles from './styles/pdf-viewer.module.css';

interface PdfViewerProps {
  // Keep exact interface - DO NOT CHANGE
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  allPageObjects,
  currentPage,
  totalPages,
  loading,
  error,
  onLoadPdf,
  onSetCurrentPage,
  onCanvasReady,
  onRegionSelected,
  onToggleChat,
  documentMenuSlot,
  documentId,
  theme,
  onThemeToggle,
}) => {
  const MAX_PAGE_WIDTH = 900;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const highlightButtonRef = useRef<HTMLButtonElement>(null);

  // Local state
  const [containerWidth, setContainerWidth] = useState(0);

  // Custom hooks
  const viewerState = usePdfViewerState();
  const { sidebarOpen, sidebarWidth, toggleSidebar, setSidebarWidth } = useSidebar();
  const { zoom, handleZoomIn, handleZoomOut, handleResetZoom } = useZoom(
    viewerState.state.zoom,
    viewerState.setZoom,
    { containerRef, enabled: !!pdfDocument }
  );

  useKeyboardNav({
    enabled: !!pdfDocument,
    currentPage,
    totalPages,
    pageRefsMap,
  });

  usePageTracking({
    containerRef,
    visiblePages: viewerState.state.visiblePages,
    currentPage,
    pageRefsMap,
    onPageChange: onSetCurrentPage,
  });

  const { handleHighlightShortcut } = useHighlightMode(
    !!pdfDocument,
    viewerState.setHighlightModeActive
  );

  // Highlights
  const { highlights, addHighlight, getHighlightsForPage, removeHighlight } = useHighlights(
    documentId || null
  );

  // PDF path for sharing
  const pdfPath = localStorage.getItem('lastPdfPath') || undefined;

  // Effects (container width measurement, page sync, highlight escape key)
  // ... keep existing effects

  // Handlers (file open, page input, etc.)
  // ... keep existing handlers

  // Render
  return (
    <div className={styles.viewer}>
      {/* Sidebar */}
      {pdfDocument && (
        <PageThumbnailSidebar
          pdfDocument={pdfDocument}
          allPageObjects={allPageObjects}
          currentPage={currentPage}
          onPageSelect={handlePageSelect}
          isOpen={sidebarOpen}
          onClose={() => toggleSidebar()}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
        />
      )}

      {/* Toolbar */}
      <PdfToolbar
        hasPdf={!!pdfDocument}
        currentPage={currentPage}
        totalPages={totalPages}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        pageInput={viewerState.state.pageInput}
        onPageInputChange={viewerState.setPageInput}
        onPageSubmit={handlePageInputSubmit}
        pdfPath={pdfPath}
        shareDropdownOpen={viewerState.state.shareDropdownOpen}
        onShareToggle={() => viewerState.setShareDropdownOpen(!viewerState.state.shareDropdownOpen)}
        shareButtonRef={shareButtonRef}
        highlightPickerOpen={viewerState.state.highlightPickerOpen}
        highlightModeActive={viewerState.state.highlightModeActive}
        selectedHighlightColor={viewerState.state.selectedHighlightColor}
        onHighlightPickerToggle={() =>
          viewerState.setHighlightPickerOpen(!viewerState.state.highlightPickerOpen)
        }
        onColorSelect={color => {
          viewerState.setSelectedHighlightColor(color);
          viewerState.setHighlightModeActive(true);
        }}
        onDisableHighlightMode={() => {
          viewerState.setHighlightModeActive(false);
          viewerState.setHighlightPickerOpen(false);
        }}
        highlightButtonRef={highlightButtonRef}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onToggleChat={onToggleChat}
        documentMenuSlot={documentMenuSlot}
      />

      {/* Content */}
      <div
        ref={containerRef}
        className={styles.content}
        style={{
          marginLeft: pdfDocument && sidebarOpen ? `${sidebarWidth}px` : '0',
        }}
      >
        {loading && <LoadingState />}
        {error && !loading && <ErrorState error={error} />}
        {!pdfDocument && !loading && !error && <EmptyState onOpenFile={handleOpenFile} />}

        {pdfDocument && allPageObjects.length > 0 && !loading && (
          <div
            className={styles.pdfContainer}
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            {allPageObjects.map((pageObject, index) => (
              <PdfPage
                key={`page-${index + 1}`}
                page={pageObject}
                pageNumber={index + 1}
                containerWidth={containerWidth}
                onPageRef={handlePageRef}
                onVisibilityChange={handlePageVisibilityChange}
                onCanvasReady={onCanvasReady}
                onRegionSelected={onRegionSelected}
                highlights={highlights}
                onRemoveHighlight={removeHighlight}
                highlightModeActive={viewerState.state.highlightModeActive}
                highlightColor={viewerState.state.selectedHighlightColor}
                onTextHighlight={addHighlight}
                zoom={zoom}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
```

**Target Size**: ~180 lines

---

## Verification Checklist

### Functional Requirements

- [ ] PDF loads and renders correctly
- [ ] All pages display in continuous scroll
- [ ] Page navigation works (arrows, input, Page Up/Down, Home/End)
- [ ] Zoom works (buttons, keyboard Cmd/Ctrl +/-/0, trackpad pinch)
- [ ] Sidebar toggles on/off
- [ ] Sidebar resizes
- [ ] Sidebar state persists across sessions
- [ ] Zoom level persists across sessions
- [ ] Highlight mode activates and deactivates
- [ ] Highlights render correctly
- [ ] Text selection works
- [ ] Region selection for AI works
- [ ] Share dropdown opens
- [ ] Theme toggle works
- [ ] Chat toggle works
- [ ] Document menu works
- [ ] Empty state shows when no PDF
- [ ] Loading state shows during load
- [ ] Error state shows on error

### Keyboard Shortcuts

- [ ] Cmd/Ctrl + = (zoom in)
- [ ] Cmd/Ctrl + - (zoom out)
- [ ] Cmd/Ctrl + 0 (reset zoom)
- [ ] Cmd/Ctrl + H (highlight selection)
- [ ] Escape (exit highlight mode)
- [ ] Arrow Up/Down (navigate pages)
- [ ] Page Up/Down (navigate pages)
- [ ] Home (first page)
- [ ] End (last page)

### Code Quality

- [ ] No TypeScript errors
- [ ] All imports resolve
- [ ] PdfViewer.tsx < 200 lines
- [ ] All extracted files < 200 lines
- [ ] No inline styles except dynamic values
- [ ] CSS module contains all styles
- [ ] All hooks follow React rules

### Type Safety

- [ ] PdfViewerProps unchanged
- [ ] All hooks have explicit return types
- [ ] No any types introduced
- [ ] PDF.js types properly imported

---

## Success Criteria

**Must achieve ALL:**

1. ✅ Code compiles without errors
2. ✅ PdfViewer.tsx < 200 lines
3. ✅ All 17 files created correctly
4. ✅ PDF viewing works identically
5. ✅ All keyboard shortcuts work
6. ✅ All UI interactions preserved
7. ✅ State persistence works
8. ✅ Type safety maintained

---

## Error Prevention

**Critical Requirements**:

1. Keep PdfViewerProps interface unchanged
2. Preserve all PDF.js interactions exactly
3. Maintain highlight overlay z-index layering
4. Keep intersection observer for virtual scrolling
5. Preserve text layer for text selection
6. Keep all keyboard shortcut behaviors
7. Maintain zoom transform origin (top center)
8. Preserve scroll detection debouncing
9. Keep page ref management for navigation
10. Maintain container width measurement for responsive pages

**Common Mistakes**:

- Breaking keyboard shortcuts by interfering with other handlers
- Changing zoom calculation affecting highlights
- Removing preventDefault causing page scrolling
- Breaking highlight rectangles by not accounting for zoom
- Interfering with text selection in text layer
- Breaking page navigation smooth scroll
- Removing intersection observer breaking virtual scrolling

---

**This is a refactoring task. Preserve all functionality exactly while reorganizing code structure.**
