# PdfViewer.tsx Refactoring Plan - Junior Dev Guide

**Assigned to:** Junior Developer
**Estimated Time:** 6-8 hours
**Priority:** 🔥 MOST CRITICAL FILE
**Status:** 🔴 Not Started

---

## 📋 Overview

**Current State:** PdfViewer.tsx is **1,365 lines** - your LARGEST and MOST CRITICAL file.

**Goal:** Break into focused, manageable components with clear responsibilities.

**Success Criteria:**

- ✅ Main PdfViewer.tsx is < 200 lines (orchestrator only)
- ✅ Each extracted component is < 150 lines
- ✅ All inline styles moved to CSS modules
- ✅ PDF viewing works exactly the same
- ✅ Easy to modify toolbar, zoom, navigation separately

---

## 🎯 What You're Building

You'll split PdfViewer into this structure:

```
src/features/pdf-viewer/
  ├── PdfViewer.tsx                (180 lines - main orchestrator)
  ├── components/
  │   ├── PdfToolbar.tsx           (200 lines - entire header)
  │   ├── PdfPageControls.tsx      (100 lines - page navigation)
  │   ├── PdfSidebarToggle.tsx     (40 lines - sidebar button)
  │   ├── ShareButton.tsx          (60 lines - share dropdown logic)
  │   ├── HighlightButton.tsx      (60 lines - highlight picker logic)
  │   ├── ThemeToggle.tsx          (40 lines - theme button)
  │   ├── ChatToggle.tsx           (40 lines - chat button)
  │   └── EmptyState.tsx           (80 lines - welcome screen)
  ├── hooks/
  │   ├── usePdfViewerState.ts     (100 lines - all useState logic)
  │   ├── useZoom.ts               (120 lines - zoom state + shortcuts)
  │   ├── useSidebar.ts            (80 lines - sidebar state + persistence)
  │   ├── useKeyboardNav.ts        (120 lines - all keyboard shortcuts)
  │   └── usePageTracking.ts       (80 lines - scroll detection)
  └── styles/
      └── pdf-viewer.module.css    (200 lines - all styles)
```

**Total after refactor:** ~1,500 lines across 17 files (vs 1,365 in 1 file)
_Slightly more due to exports, but MUCH more maintainable_

---

## ⚠️ IMPORTANT: Read This First

### Before You Start

1. **Create branch:** `git checkout -b refactor/pdf-viewer`
2. **Commit:** `git add . && git commit -m "chore: checkpoint before PDF viewer refactor"`
3. **Test PDF viewing works**
4. **Keep app running** - test after each step

### Rules

- ✅ **Test after EVERY extraction** - PDF viewing is complex
- ✅ **Commit after each component** - So you can roll back
- ✅ **Don't change behavior** - Everything should work identically
- ✅ **Copy keyboard shortcuts carefully** - Easy to break
- ❌ **Don't add features** - Just refactor
- ❌ **Don't optimize yet** - Just organize

### If Something Breaks

1. Check console for errors
2. Check which feature broke (zoom? navigation? sidebar?)
3. Roll back: `git reset --hard HEAD`
4. Re-read the step and try again

---

## 📝 Step-by-Step Plan

### Step 1: Create Directory Structure (5 minutes)

**Goal:** Set up organized folder structure.

**Actions:**

```bash
# Create directories
mkdir -p src/features/pdf-viewer/components
mkdir -p src/features/pdf-viewer/hooks
mkdir -p src/features/pdf-viewer/styles

# Verify
ls -R src/features/pdf-viewer/
```

**Commit:**

```bash
git add .
git commit -m "feat: create pdf-viewer feature directory structure"
```

---

### Step 2: Extract CSS to Module (1 hour)

**Goal:** Move all inline styles to CSS module.

**Why first?** Safest change - just moving styles, no logic.

#### 2.1: Create CSS Module

**Create:** `src/features/pdf-viewer/styles/pdf-viewer.module.css`

```css
/* ===================================================================
   PDF Viewer Styles
   =================================================================== */

/* Main Container */
.viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header / Toolbar */
.header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--stroke-1);
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: var(--bg);
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.headerCenter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Buttons */
.btn {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  border: 1px solid var(--stroke-1);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--text-1);
  transition: all 0.15s ease;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  background-color: var(--surface-3);
}

.btn--active {
  border-color: var(--accent);
  background-color: var(--accent-bg);
  color: var(--accent);
}

.btn--active:hover {
  background-color: var(--accent-bg);
}

/* Page Navigation */
.pageNav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pageLabel {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 300;
  letter-spacing: 0.3px;
}

.pageInput {
  width: 50px;
  padding: 6px 8px;
  text-align: center;
  border: 1px solid var(--stroke-1);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  background-color: var(--surface-2);
  color: var(--text-1);
}

/* Content Area */
.content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background-color: var(--bg);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transition: margin-left 0.2s ease;
}

.content--withSidebar {
  /* Dynamic margin added via inline style */
}

/* Loading State */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 100px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 1px solid var(--stroke-2);
  border-top: 1px solid var(--text-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loadingText {
  color: var(--text-2);
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Error State */
.error {
  padding: 24px;
  background-color: var(--surface-1);
  border: 1px solid var(--stroke-1);
  border-radius: var(--radius-md);
  color: var(--text-2);
  max-width: 400px;
  text-align: center;
  margin-top: 100px;
}

.errorTitle {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.errorMessage {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

/* Empty State */
.emptyState {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg);
  padding: 40px;
}

.emptyStateContent {
  text-align: center;
  max-width: 600px;
}

.emptyStateTitle {
  font-size: 24px;
  font-weight: 300;
  margin-bottom: 12px;
  color: var(--text-1);
  letter-spacing: 0.5px;
}

.emptyStateDivider {
  width: 60px;
  height: 1px;
  background-color: var(--stroke-2);
  margin: 0 auto 40px;
}

.emptyStateDescription {
  font-size: 15px;
  margin-bottom: 48px;
  color: var(--text-2);
  line-height: 1.6;
  font-weight: 300;
}

.emptyStateHint {
  margin-top: 60px;
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

/* PDF Container */
.pdfContainer {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  transition: transform 0.1s ease-out;
  transform-origin: top center;
}

/* Text Selection Colors */
.textLayer ::selection {
  background: rgba(0, 0, 0, 0.15);
  color: transparent;
}

.textLayer ::-moz-selection {
  background: rgba(0, 0, 0, 0.15);
  color: transparent;
}
```

#### 2.2: Import CSS in PdfViewer

**At top of PdfViewer.tsx:**

```tsx
import styles from './styles/pdf-viewer.module.css';
```

**Don't change anything else yet!**

**Test:** App should compile.

**Commit:**

```bash
git add .
git commit -m "feat: create PDF viewer CSS module"
```

---

### Step 3: Extract usePdfViewerState Hook (45 minutes)

**Goal:** Move all useState logic to a custom hook.

#### 3.1: Create the Hook

**Create:** `src/features/pdf-viewer/hooks/usePdfViewerState.ts`

```typescript
/**
 * PDF Viewer State Management
 * Centralizes all state for the PDF viewer
 */

import { useState } from 'react';

interface PdfViewerState {
  // Page state
  pageInput: string;
  visiblePages: Set<number>;

  // Sidebar state
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Zoom state
  zoom: number;

  // Share dropdown
  shareDropdownOpen: boolean;

  // Highlight picker
  highlightPickerOpen: boolean;
  highlightModeActive: boolean;
  selectedHighlightColor: string;
}

interface UsePdfViewerStateResult {
  state: PdfViewerState;
  setPageInput: (value: string) => void;
  setVisiblePages: (value: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setSidebarOpen: (value: boolean) => void;
  setSidebarWidth: (value: number) => void;
  setZoom: (value: number) => void;
  setShareDropdownOpen: (value: boolean) => void;
  setHighlightPickerOpen: (value: boolean) => void;
  setHighlightModeActive: (value: boolean) => void;
  setSelectedHighlightColor: (value: string) => void;
}

/**
 * Custom hook to manage all PDF viewer state
 * Consolidates useState calls for better organization
 */
export function usePdfViewerState(): UsePdfViewerStateResult {
  // Page state
  const [pageInput, setPageInput] = useState('');
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.sidebarWidth');
    return saved !== null ? parseInt(saved, 10) : 200;
  });

  // Zoom state with localStorage persistence
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('pdfViewer.zoom');
    return saved !== null ? parseFloat(saved) : 1.0;
  });

  // Share dropdown state
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  // Highlight picker state
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
  const [highlightModeActive, setHighlightModeActive] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>(() => {
    const saved = localStorage.getItem('pdfViewer.highlightColor');
    return saved || 'yellow';
  });

  return {
    state: {
      pageInput,
      visiblePages,
      sidebarOpen,
      sidebarWidth,
      zoom,
      shareDropdownOpen,
      highlightPickerOpen,
      highlightModeActive,
      selectedHighlightColor,
    },
    setPageInput,
    setVisiblePages,
    setSidebarOpen,
    setSidebarWidth,
    setZoom,
    setShareDropdownOpen,
    setHighlightPickerOpen,
    setHighlightModeActive,
    setSelectedHighlightColor,
  };
}
```

#### 3.2: Use in PdfViewer

**In PdfViewer.tsx, replace all useState calls (lines 85-117):**

```tsx
// OLD CODE - DELETE (about 20 lines of useState)
const [pageInput, setPageInput] = useState('');
const [containerWidth, setContainerWidth] = useState(0);
const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
const [sidebarOpen, setSidebarOpen] = useState(() => {
  /* ... */
});
// ... many more useState calls
```

**Replace with:**

```tsx
// NEW CODE
import { usePdfViewerState } from './hooks/usePdfViewerState';

// Inside component:
const {
  state: {
    pageInput,
    visiblePages,
    sidebarOpen,
    sidebarWidth,
    zoom,
    shareDropdownOpen,
    highlightPickerOpen,
    highlightModeActive,
    selectedHighlightColor,
  },
  setPageInput,
  setVisiblePages,
  setSidebarOpen,
  setSidebarWidth,
  setZoom,
  setShareDropdownOpen,
  setHighlightPickerOpen,
  setHighlightModeActive,
  setSelectedHighlightColor,
} = usePdfViewerState();

// Keep containerWidth as local state (not in hook)
const [containerWidth, setContainerWidth] = useState(0);
```

**Test:**

- PDF should still render
- Sidebar should still work
- No console errors

**Commit:**

```bash
git add .
git commit -m "refactor: extract PDF viewer state to custom hook"
```

---

### Step 4: Extract useZoom Hook (1 hour)

**Goal:** Move zoom logic and keyboard shortcuts to custom hook.

#### 4.1: Create the Hook

**Create:** `src/features/pdf-viewer/hooks/useZoom.ts`

```typescript
/**
 * Zoom Management for PDF Viewer
 * Handles zoom state, controls, keyboard shortcuts, and trackpad gestures
 */

import { useEffect, useRef } from 'react';

interface UseZoomOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  enabled: boolean; // Only enable when PDF is loaded
}

interface UseZoomResult {
  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setZoom: (value: number | ((prev: number) => number)) => void;
}

/**
 * Custom hook for zoom management
 * Includes keyboard shortcuts (Cmd/Ctrl +/-/0) and trackpad pinch
 */
export function useZoom(
  initialZoom: number,
  onZoomChange: (zoom: number) => void,
  options: UseZoomOptions
): UseZoomResult {
  const zoomRef = useRef(initialZoom);

  // Update ref when zoom changes externally
  useEffect(() => {
    zoomRef.current = initialZoom;
  }, [initialZoom]);

  const setZoom = (value: number | ((prev: number) => number)) => {
    const newZoom = typeof value === 'function' ? value(zoomRef.current) : value;
    const clampedZoom = Math.max(0.5, Math.min(3.0, newZoom));
    zoomRef.current = clampedZoom;
    onZoomChange(clampedZoom);

    // Persist to localStorage
    localStorage.setItem('pdfViewer.zoom', clampedZoom.toString());
  };

  const handleZoomIn = () => {
    setZoom(prev => prev + 0.1);
  };

  const handleZoomOut = () => {
    setZoom(prev => prev - 0.1);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  // Keyboard shortcuts (Cmd/Ctrl +/-/0)
  useEffect(() => {
    if (!options.enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement) return;

      if (event.metaKey || event.ctrlKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          handleZoomIn();
          return;
        }
        if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          handleZoomOut();
          return;
        }
        if (event.key === '0') {
          event.preventDefault();
          handleResetZoom();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.enabled]);

  // Trackpad pinch-to-zoom
  useEffect(() => {
    if (!options.enabled || !options.containerRef.current) return;

    const handleWheel = (event: WheelEvent) => {
      // Check if this is a pinch-zoom gesture (Ctrl/Cmd + wheel)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const delta = -event.deltaY;
        const zoomSpeed = 0.01;
        const zoomDelta = delta * zoomSpeed;

        setZoom(prev => prev + zoomDelta);
      }
    };

    const container = options.containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [options.enabled, options.containerRef]);

  return {
    zoom: zoomRef.current,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    setZoom,
  };
}
```

#### 4.2: Use in PdfViewer

**In PdfViewer.tsx, find zoom-related code:**

```tsx
// OLD CODE - DELETE (about 100 lines)
const handleZoomIn = useCallback(() => {
  /* ... */
}, []);
const handleZoomOut = useCallback(() => {
  /* ... */
}, []);
const handleResetZoom = useCallback(() => {
  /* ... */
}, []);

// ... zoom keyboard shortcuts useEffect
// ... trackpad pinch useEffect
```

**Replace with:**

```tsx
// NEW CODE
import { useZoom } from './hooks/useZoom';

// Inside component:
const { handleZoomIn, handleZoomOut, handleResetZoom } = useZoom(zoom, setZoom, {
  containerRef,
  enabled: !!pdfDocument,
});
```

**Test:**

- Zoom in/out with Cmd/Ctrl +/-
- Reset zoom with Cmd/Ctrl 0
- Pinch to zoom on trackpad

**Commit:**

```bash
git add .
git commit -m "refactor: extract zoom logic to useZoom hook"
```

---

### Step 5: Extract useKeyboardNav Hook (45 minutes)

**Goal:** Move keyboard navigation to custom hook.

#### 5.1: Create the Hook

**Create:** `src/features/pdf-viewer/hooks/useKeyboardNav.ts`

```typescript
/**
 * Keyboard Navigation for PDF Viewer
 * Handles arrow keys, Page Up/Down, Home/End
 */

import { useEffect } from 'react';

interface UseKeyboardNavOptions {
  enabled: boolean;
  currentPage: number;
  totalPages: number;
  pageRefsMap: React.MutableRefObject<Map<number, HTMLDivElement>>;
}

/**
 * Custom hook for keyboard navigation
 * Supports: Arrow keys, Page Up/Down, Home/End
 */
export function useKeyboardNav(options: UseKeyboardNavOptions): void {
  const { enabled, currentPage, totalPages, pageRefsMap } = options;

  useEffect(() => {
    if (!enabled) return;

    const scrollToPage = (pageNum: number) => {
      const pageElement = pageRefsMap.current.get(pageNum);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement) return;

      // Skip if modifier keys (except for zoom shortcuts handled elsewhere)
      if (event.metaKey || event.ctrlKey) return;

      switch (event.key) {
        case 'ArrowDown':
          if (currentPage < totalPages) {
            event.preventDefault();
            scrollToPage(currentPage + 1);
          }
          break;

        case 'ArrowUp':
          if (currentPage > 1) {
            event.preventDefault();
            scrollToPage(currentPage - 1);
          }
          break;

        case 'PageDown':
          if (currentPage < totalPages) {
            event.preventDefault();
            scrollToPage(currentPage + 1);
          }
          break;

        case 'PageUp':
          if (currentPage > 1) {
            event.preventDefault();
            scrollToPage(currentPage - 1);
          }
          break;

        case 'Home':
          event.preventDefault();
          scrollToPage(1);
          break;

        case 'End':
          event.preventDefault();
          scrollToPage(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, currentPage, totalPages, pageRefsMap]);
}
```

#### 5.2: Use in PdfViewer

**Replace keyboard navigation useEffect:**

```tsx
// NEW CODE
import { useKeyboardNav } from './hooks/useKeyboardNav';

// Inside component:
useKeyboardNav({
  enabled: !!pdfDocument,
  currentPage,
  totalPages,
  pageRefsMap,
});
```

**Test:**

- Arrow keys navigate pages
- Page Up/Down works
- Home/End works

**Commit:**

```bash
git add .
git commit -m "refactor: extract keyboard navigation to custom hook"
```

---

### Step 6: Extract EmptyState Component (30 minutes)

**Goal:** Move welcome screen to separate component.

#### 6.1: Create Component

**Create:** `src/features/pdf-viewer/components/EmptyState.tsx`

```typescript
import React from 'react';
import styles from '../styles/pdf-viewer.module.css';

interface EmptyStateProps {
  onOpenFile: () => void;
}

/**
 * Empty state shown when no PDF is loaded
 * Displays welcome message and open button
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenFile }) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateContent}>
        <h1 className={styles.emptyStateTitle}>AI PDF Reader</h1>
        <div className={styles.emptyStateDivider} />

        <p className={styles.emptyStateDescription}>
          Select text to interact with document intelligence
        </p>

        <button onClick={onOpenFile} className={styles.btn}>
          Open Document
        </button>

        <p className={styles.emptyStateHint}>⌘O to open</p>
      </div>
    </div>
  );
};
```

#### 6.2: Use in PdfViewer

**Replace empty state rendering (lines 1017-1111):**

```tsx
// NEW CODE
import { EmptyState } from './components/EmptyState';

// In render:
{
  !pdfDocument && !loading && !error && <EmptyState onOpenFile={handleOpenFile} />;
}
```

**Test:**

- Empty state appears when no PDF loaded
- "Open Document" button works

**Commit:**

```bash
git add .
git commit -m "refactor: extract EmptyState component"
```

---

### Step 7: Extract PdfToolbar Component (1.5 hours)

**Goal:** Extract entire header/toolbar into separate component.

**This is a BIG extraction - the toolbar is complex!**

#### 7.1: Create Component

**Create:** `src/features/pdf-viewer/components/PdfToolbar.tsx`

```typescript
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { HighlightColorPicker, type HighlightColor } from './HighlightColorPicker';
import { IconChevronDown, IconHighlight, IconShare } from './Icons';
import { ShareDropdown } from './ShareDropdown';
import styles from '../styles/pdf-viewer.module.css';

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
  onPageSubmit: () => void;

  // Share
  pdfPath?: string;
  shareDropdownOpen: boolean;
  onShareToggle: () => void;

  // Highlight
  highlightPickerOpen: boolean;
  highlightModeActive: boolean;
  selectedHighlightColor: HighlightColor;
  onHighlightPickerToggle: () => void;
  onColorSelect: (color: HighlightColor) => void;
  onDisableHighlightMode: () => void;

  // Theme
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;

  // Chat
  onToggleChat?: () => void;

  // Document menu slot
  documentMenuSlot?: React.ReactNode;
}

/**
 * PDF Viewer Toolbar
 * Handles all top bar controls: sidebar, navigation, share, highlight, theme, chat
 */
export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  hasPdf,
  currentPage,
  totalPages,
  sidebarOpen,
  onToggleSidebar,
  pageInput,
  onPageInputChange,
  onPageSubmit,
  pdfPath,
  shareDropdownOpen,
  onShareToggle,
  highlightPickerOpen,
  highlightModeActive,
  selectedHighlightColor,
  onHighlightPickerToggle,
  onColorSelect,
  onDisableHighlightMode,
  theme,
  onThemeToggle,
  onToggleChat,
  documentMenuSlot,
}) => {
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const highlightButtonRef = useRef<HTMLButtonElement>(null);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPageSubmit();
  };

  return (
    <div className={styles.header}>
      {/* Left side */}
      <div className={styles.headerLeft}>
        {/* Sidebar Toggle */}
        {hasPdf && (
          <button
            onClick={onToggleSidebar}
            className={styles.btn}
            title={sidebarOpen ? 'Hide pages' : 'Show pages'}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        )}

        {/* Document Menu */}
        {documentMenuSlot}
      </div>

      {/* Center - Share and Highlight */}
      {hasPdf && (
        <div className={styles.headerCenter}>
          {/* Share Button */}
          <div style={{ position: 'relative' }}>
            <button
              ref={shareButtonRef}
              onClick={onShareToggle}
              className={`${styles.btn} ${shareDropdownOpen ? styles['btn--active'] : ''}`}
              title="Share PDF"
            >
              <IconShare size={16} />
              <span>Share</span>
              <IconChevronDown size={14} />
            </button>
            <ShareDropdown
              pdfPath={pdfPath}
              isOpen={shareDropdownOpen}
              onClose={() => onShareToggle()}
              buttonRef={shareButtonRef}
            />
          </div>

          {/* Highlight Button */}
          <div style={{ position: 'relative' }}>
            <button
              ref={highlightButtonRef}
              onClick={onHighlightPickerToggle}
              className={`${styles.btn} ${highlightModeActive ? styles['btn--active'] : ''}`}
              title={
                highlightModeActive
                  ? 'Highlight mode ON (press Esc to exit)'
                  : 'Highlight text (⌘H)'
              }
            >
              <IconHighlight size={16} />
            </button>
            <HighlightColorPicker
              selectedColor={selectedHighlightColor}
              onColorSelect={onColorSelect}
              isOpen={highlightPickerOpen}
              onClose={() => onHighlightPickerToggle()}
              buttonRef={highlightButtonRef}
              onDisableMode={onDisableHighlightMode}
              highlightModeActive={highlightModeActive}
            />
          </div>
        </div>
      )}

      {/* Page Navigation */}
      {hasPdf && (
        <form onSubmit={handlePageSubmit} className={styles.pageNav}>
          <span className={styles.pageLabel}>Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={e => onPageInputChange(e.target.value)}
            className={styles.pageInput}
          />
          <span className={styles.pageLabel}>/ {totalPages}</span>
        </form>
      )}

      {/* Right side */}
      <div className={styles.headerRight}>
        {/* Theme Toggle */}
        {theme && onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className={styles.btn}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={16} strokeWidth={2} />
            ) : (
              <Sun size={16} strokeWidth={2} />
            )}
          </button>
        )}

        {/* Chat Toggle */}
        <button onClick={onToggleChat} className={styles.btn} title="Toggle AI Chat">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
      </div>
    </div>
  );
};
```

#### 7.2: Use in PdfViewer

**Replace entire header section (lines 638-935):**

```tsx
// NEW CODE
import { PdfToolbar } from './components/PdfToolbar';

// In render:
<PdfToolbar
  hasPdf={!!pdfDocument}
  currentPage={currentPage}
  totalPages={totalPages}
  sidebarOpen={sidebarOpen}
  onToggleSidebar={handleToggleSidebar}
  pageInput={pageInput}
  onPageInputChange={setPageInput}
  onPageSubmit={handlePageInputSubmit}
  pdfPath={pdfPath}
  shareDropdownOpen={shareDropdownOpen}
  onShareToggle={() => setShareDropdownOpen(!shareDropdownOpen)}
  highlightPickerOpen={highlightPickerOpen}
  highlightModeActive={highlightModeActive}
  selectedHighlightColor={selectedHighlightColor}
  onHighlightPickerToggle={() => setHighlightPickerOpen(!highlightPickerOpen)}
  onColorSelect={color => {
    setSelectedHighlightColor(color);
    setHighlightModeActive(true);
  }}
  onDisableHighlightMode={() => {
    setHighlightModeActive(false);
    setHighlightPickerOpen(false);
  }}
  theme={theme}
  onThemeToggle={onThemeToggle}
  onToggleChat={onToggleChat}
  documentMenuSlot={documentMenuSlot}
/>;
```

**Test thoroughly:**

- Sidebar toggle
- Page navigation
- Share button
- Highlight button
- Theme toggle
- Chat toggle

**Commit:**

```bash
git add .
git commit -m "refactor: extract PdfToolbar component"
```

---

### Step 8: Final Cleanup (30 minutes)

#### 8.1: Move PdfViewer to Feature Directory

```bash
# Move main file
mv src/components/PdfViewer.tsx src/features/pdf-viewer/

# Update import in App.tsx
# Change: import PdfViewer from './components/PdfViewer';
# To: import PdfViewer from './features/pdf-viewer/PdfViewer';
```

#### 8.2: Update All Imports in PdfViewer

Make sure all imports use relative paths to the new structure:

```tsx
import styles from './styles/pdf-viewer.module.css';
import { PdfToolbar } from './components/PdfToolbar';
import { EmptyState } from './components/EmptyState';
import { useZoom } from './hooks/useZoom';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { usePdfViewerState } from './hooks/usePdfViewerState';
```

#### 8.3: Replace Remaining Inline Styles with CSS Classes

**Go through PdfViewer.tsx and replace style objects with className:**

**Example:**

```tsx
// Before
<div style={{ flex: 1, overflow: 'auto', padding: '20px', /* ... */ }}>

// After
<div className={styles.content}>
```

**Do this for all remaining elements.**

#### 8.4: Final Verification

**Your PdfViewer.tsx should now be around 180-200 lines:**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import { useHighlights } from '../../hooks/useHighlights';
import type { RegionSelection } from '../../types';
import { EmptyState } from './components/EmptyState';
import { PdfToolbar } from './components/PdfToolbar';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { usePdfViewerState } from './hooks/usePdfViewerState';
import { useZoom } from './hooks/useZoom';
import styles from './styles/pdf-viewer.module.css';

// ... types

const PdfViewer: React.FC<PdfViewerProps> = (
  {
    /* ... */
  }
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  const [containerWidth, setContainerWidth] = useState(0);

  // Custom hooks
  const viewerState = usePdfViewerState();
  const { handleZoomIn, handleZoomOut, handleResetZoom } = useZoom(/* ... */);
  useKeyboardNav(/* ... */);

  // Highlights
  const { highlights, addHighlight, removeHighlight } = useHighlights(documentId);

  // ... rest of logic (page tracking, effects, handlers)

  return (
    <div className={styles.viewer}>
      <PdfToolbar /* ... */ />

      <div className={styles.content}>
        {loading && <LoadingState />}
        {error && <ErrorState error={error} />}
        {!pdfDocument && !loading && !error && <EmptyState onOpenFile={handleOpenFile} />}
        {pdfDocument && <PdfPages /* ... */ />}
      </div>
    </div>
  );
};
```

**Commit:**

```bash
git add .
git commit -m "refactor: complete PdfViewer refactoring - clean architecture"
git push origin refactor/pdf-viewer
```

---

## ✅ Final Checklist

- [ ] PdfViewer.tsx is under 200 lines
- [ ] All components under 150 lines
- [ ] No inline styles (only dynamic positioning)
- [ ] PDF renders correctly
- [ ] Navigation works (arrows, page input)
- [ ] Zoom works (buttons, keyboard, trackpad)
- [ ] Sidebar toggles
- [ ] Share button works
- [ ] Highlight button works
- [ ] Theme toggle works
- [ ] Chat toggle works
- [ ] No console errors

---

## 📊 Before vs After

### Before

- 1 file: 1,365 lines
- Everything in one place
- Hard to test individual features
- Hard to modify toolbar/controls

### After

- 17 files: ~1,500 lines total
- PdfViewer.tsx: 180 lines (orchestrator)
- Each feature in focused file
- Easy to test each component
- Easy to modify specific features

### Benefits

- 87% smaller main file
- Clear separation of concerns
- Easy to add new toolbar buttons
- Easy to modify zoom/navigation independently
- CSS is maintainable
- Hooks are reusable

---

**Congratulations! You've conquered the biggest file! 🎉🚀**
