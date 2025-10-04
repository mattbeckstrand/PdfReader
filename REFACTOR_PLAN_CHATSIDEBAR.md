# ChatSidebar Refactoring Plan - Junior Dev Guide

**Assigned to:** Junior Developer  
**Estimated Time:** 6-8 hours  
**Priority:** Critical  
**Status:** 🔴 Not Started

---

## 📋 Overview

**Current State:** ChatSidebar.tsx is 954 lines - way too large and hard to maintain.

**Goal:** Break it into 8 smaller, focused files that are easy to understand and modify.

**Success Criteria:**
- ✅ No file > 150 lines
- ✅ All inline styles moved to CSS modules
- ✅ Chat still works exactly the same (no bugs)
- ✅ Code is easier to read and modify

---

## 🎯 What You're Building

You'll split ChatSidebar into these files:

```
src/components/chat/
  ├── ChatSidebar.tsx          (120 lines - main container)
  ├── ChatMessage.tsx           (100 lines - individual message)
  ├── ChatInput.tsx             (80 lines - input box with context)
  ├── ChatHeader.tsx            (60 lines - minimize/close buttons)
  ├── MinimizedPill.tsx         (40 lines - collapsed state)
  ├── ContextBadge.tsx          (80 lines - context indicator)
  ├── hooks/
  │   ├── useChatResize.ts      (80 lines - resize logic)
  │   └── useChatDrag.ts        (80 lines - drag logic)
  └── styles/
      └── chat.module.css       (150 lines - ALL styles)
```

**Total after refactor:** ~790 lines across 9 files (vs 954 in 1 file)

---

## ⚠️ IMPORTANT: Read This First

### Before You Start
1. **Create a new branch:** `git checkout -b refactor/chat-sidebar`
2. **Commit your current work:** `git add . && git commit -m "chore: checkpoint before chat refactor"`
3. **Test that chat works:** Open the app, send a message, verify everything works
4. **Keep the app running:** Test after each step to catch bugs immediately

### Rules
- ✅ **Test after EVERY step** - Don't move forward if something breaks
- ✅ **Commit after each step** - So you can roll back if needed
- ✅ **Don't change behavior** - The chat should work exactly the same
- ✅ **Copy-paste carefully** - Preserve all logic exactly as is
- ❌ **Don't add new features** - Just refactor, nothing new
- ❌ **Don't fix bugs** - Just move code, fix bugs later

### If Something Breaks
1. **Don't panic** - This is normal
2. **Check the console** - Look for error messages
3. **Roll back to last commit:** `git reset --hard HEAD`
4. **Try the step again** - Read more carefully this time

---

## 📝 Step-by-Step Plan

### Step 1: Create New Directory Structure (10 minutes)

**Goal:** Set up the folder structure for the refactored components.

**Actions:**
```bash
# Create directories
mkdir -p src/components/chat/hooks
mkdir -p src/components/chat/styles

# You'll create files in the next steps
```

**Commit:**
```bash
git add .
git commit -m "feat: create chat component directory structure"
```

**Acceptance Criteria:**
- ✅ Directories exist
- ✅ App still compiles and runs

---

### Step 2: Extract CSS to Module (45 minutes)

**Goal:** Move ALL inline styles from ChatSidebar.tsx to a CSS module file.

**Why first?** Because this is the safest change - you're just moving styles, not logic.

#### 2.1: Create the CSS Module File

**Create:** `src/components/chat/styles/chat.module.css`

**Copy all these styles:**

```css
/* ===================================================================
   ChatSidebar Styles - Extracted from inline styles
   =================================================================== */

/* Container */
.chatContainer {
  position: fixed;
  background: var(--surface-1);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: var(--shadow-2);
  border: 1px solid var(--stroke-1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

/* Minimized Pill */
.minimizedPill {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  padding: 12px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-1);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.minimizedPill:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
}

.minimizedBadge {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
}

/* Header Controls */
.headerControls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.headerButton {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
}

.headerButton:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Messages Container */
.messagesContainer {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 48px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Message Wrapper */
.messageWrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.messageWrapper--user {
  align-items: flex-end;
}

.messageWrapper--assistant {
  align-items: flex-start;
}

/* Message Content */
.messageContent {
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-1);
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 85%;
}

/* User Message Bubble */
.userMessage {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  padding: 12px 14px;
  white-space: pre-wrap;
  position: relative;
  color: var(--text-1);
}

.userMessage--withContext {
  padding-top: 40px;
}

/* Context Badge */
.contextBadge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
}

.contextButton {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.contextButton:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.contextDropdown {
  margin-top: 6px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 11px;
  max-height: 200px;
  max-width: 350px;
  overflow: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.contextItem {
  color: var(--text-muted);
  line-height: 1.4;
  white-space: pre-wrap;
}

.contextItem:not(:last-child) {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Input Form */
.inputForm {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-top: 12px;
  background: var(--surface-1);
}

.inputContainer {
  position: relative;
  display: flex;
  align-items: flex-end;
  background: var(--surface-2);
  border: 1px solid var(--stroke-1);
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.inputTextarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 12px 14px;
  padding-right: 52px;
  color: var(--text-1);
  font-size: 13px;
  font-family: inherit;
  resize: none;
  min-height: 48px;
  max-height: 120px;
  line-height: 1.4;
}

.inputTextarea--withContext {
  padding-top: 36px;
}

.submitButton {
  position: absolute;
  right: 8px;
  bottom: 8px;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
}

.submitButton--active {
  background: var(--text-1);
  color: var(--bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.submitButton--disabled {
  background: var(--surface-3);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Loading Indicator */
.loadingIndicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 8px;
  padding: 0;
  margin-top: -4px;
}

.dotPulse {
  animation: dot-pulse 1.4s infinite;
}

.dotPulse:nth-child(2) {
  animation-delay: 0.2s;
}

.dotPulse:nth-child(3) {
  animation-delay: 0.4s;
}

/* Animations */
@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Resize Handle */
.resizeHandle {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  z-index: 12;
  border-left: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.resizeHandle:hover {
  opacity: 1;
}

/* Drag Handle */
.dragHandle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  cursor: move;
  z-index: 9;
}
```

**Commit:**
```bash
git add .
git commit -m "feat: extract chat sidebar styles to CSS module"
```

#### 2.2: Import CSS Module in ChatSidebar.tsx

**At the top of ChatSidebar.tsx, add:**

```tsx
import styles from './styles/chat.module.css';
```

**Don't change anything else yet!** Just add the import.

**Test:** App should still compile (even though styles aren't being used yet).

---

### Step 3: Extract useChatResize Hook (1 hour)

**Goal:** Move all resize logic out of ChatSidebar into a custom hook.

#### 3.1: Create the Hook File

**Create:** `src/components/chat/hooks/useChatResize.ts`

```typescript
import { useEffect, useRef } from 'react';

interface ChatSize {
  width: number;
  height: number;
}

interface UseChatResizeResult {
  isResizing: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Hook to handle chat window resizing
 * Manages resize state and mouse event handlers
 */
export function useChatResize(
  chatSize: ChatSize,
  setChatSize: (size: ChatSize) => void
): UseChatResizeResult {
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Handle mouse move and mouse up events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const deltaX = resizeStartRef.current.x - e.clientX;
      const deltaY = resizeStartRef.current.y - e.clientY;

      const newWidth = Math.max(200, Math.min(800, resizeStartRef.current.width + deltaX));
      const newHeight = Math.max(400, Math.min(900, resizeStartRef.current.height + deltaY));

      setChatSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatSize, setChatSize]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: chatSize.width,
      height: chatSize.height,
    };
    
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  return {
    isResizing: isResizingRef.current,
    handleResizeStart,
  };
}
```

#### 3.2: Use the Hook in ChatSidebar

**In ChatSidebar.tsx, find this code (around line 70):**

```tsx
// OLD CODE - DELETE THIS
const isResizingRef = useRef(false);
const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

// ... all the resize useEffect and handleResizeStart function ...
```

**Replace with:**

```tsx
// NEW CODE
import { useChatResize } from './hooks/useChatResize';

// Inside the component:
const { handleResizeStart } = useChatResize(chatSize, setChatSize);
```

**Test:**
1. Open the app
2. Try resizing the chat window by dragging the corner
3. It should work exactly like before

**If it works:**
```bash
git add .
git commit -m "refactor: extract resize logic to useChatResize hook"
```

**If it breaks:** Roll back and try again.

---

### Step 4: Extract useChatDrag Hook (1 hour)

**Goal:** Move all drag logic out of ChatSidebar into a custom hook.

#### 4.1: Create the Hook File

**Create:** `src/components/chat/hooks/useChatDrag.ts`

```typescript
import { useEffect, useRef } from 'react';

interface ChatPosition {
  bottom: number;
  right: number;
}

interface UseChatDragResult {
  isDragging: boolean;
  handleDragStart: (e: React.MouseEvent) => void;
}

/**
 * Hook to handle chat window dragging/repositioning
 * Manages drag state and mouse event handlers
 */
export function useChatDrag(
  chatPosition: ChatPosition,
  setChatPosition: (position: ChatPosition) => void
): UseChatDragResult {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, bottom: 0, right: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = dragStartRef.current.x - e.clientX;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newRight = Math.max(10, dragStartRef.current.right + deltaX);
      const newBottom = Math.max(10, dragStartRef.current.bottom - deltaY);

      setChatPosition({ right: newRight, bottom: newBottom });
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatPosition, setChatPosition]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: chatPosition.bottom,
      right: chatPosition.right,
    };
    
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

  return {
    isDragging: isDraggingRef.current,
    handleDragStart,
  };
}
```

#### 4.2: Use the Hook in ChatSidebar

**In ChatSidebar.tsx, find drag-related code:**

```tsx
// OLD CODE - DELETE THIS
const isDraggingRef = useRef(false);
const dragStartRef = useRef({ x: 0, y: 0, bottom: 0, right: 0 });

// ... all the drag useEffect and handleDragStart function ...
```

**Replace with:**

```tsx
// NEW CODE
import { useChatDrag } from './hooks/useChatDrag';

// Inside the component:
const { handleDragStart } = useChatDrag(chatPosition, setChatPosition);
```

**Test:**
1. Try dragging the chat window
2. It should move exactly like before

**Commit:**
```bash
git add .
git commit -m "refactor: extract drag logic to useChatDrag hook"
```

---

### Step 5: Extract MinimizedPill Component (30 minutes)

**Goal:** Move the minimized pill UI into its own component.

#### 5.1: Create the Component

**Create:** `src/components/chat/MinimizedPill.tsx`

```tsx
import React from 'react';
import { IconChat } from '../Icons';
import styles from './styles/chat.module.css';

interface MinimizedPillProps {
  messageCount: number;
  onClick: () => void;
}

/**
 * Minimized chat pill that appears when chat is collapsed
 * Shows message count badge
 */
export const MinimizedPill: React.FC<MinimizedPillProps> = ({ messageCount, onClick }) => {
  return (
    <div className={styles.minimizedPill} onClick={onClick}>
      <IconChat size={18} />
      <span>AI Chat</span>
      {messageCount > 0 && (
        <span className={styles.minimizedBadge}>{messageCount}</span>
      )}
    </div>
  );
};
```

#### 5.2: Use the Component in ChatSidebar

**In ChatSidebar.tsx, find the minimized pill rendering (around line 208):**

```tsx
// OLD CODE - DELETE THIS (about 50 lines)
if (isMinimized) {
  return (
    <div
      onClick={() => setIsMinimized(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        // ... lots of inline styles
      }}
    >
      <IconChat size={18} />
      <span>AI Chat</span>
      {messages.length > 0 && (
        <span style={{ /* ... */ }}>
          {messages.length}
        </span>
      )}
    </div>
  );
}
```

**Replace with:**

```tsx
// NEW CODE (just 5 lines!)
import { MinimizedPill } from './MinimizedPill';

// In the render:
if (isMinimized) {
  return (
    <MinimizedPill 
      messageCount={messages.length} 
      onClick={() => setIsMinimized(false)} 
    />
  );
}
```

**Test:**
1. Minimize the chat
2. Pill should appear in bottom-right
3. Click it - chat should expand

**Commit:**
```bash
git add .
git commit -m "refactor: extract MinimizedPill component"
```

---

### Step 6: Extract ChatHeader Component (45 minutes)

**Goal:** Move header controls (minimize, close, resize handle) into separate component.

#### 6.1: Create the Component

**Create:** `src/components/chat/ChatHeader.tsx`

```tsx
import React from 'react';
import { IconClose } from '../Icons';
import styles from './styles/chat.module.css';

interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Chat window header with control buttons
 * Includes resize handle, minimize button, and close button
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onMinimize,
  onClose,
  onResizeStart,
}) => {
  return (
    <>
      {/* Resize handle */}
      <div
        className={styles.resizeHandle}
        onMouseDown={onResizeStart}
        title="Resize chat"
      />

      {/* Control buttons */}
      <div className={styles.headerControls}>
        {/* Minimize Button */}
        <button
          onClick={onMinimize}
          className={styles.headerButton}
          title="Minimize"
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>−</span>
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={styles.headerButton}
          title="Close"
        >
          <IconClose size={16} />
        </button>
      </div>
    </>
  );
};
```

#### 6.2: Use the Component in ChatSidebar

**Find the header controls in ChatSidebar.tsx:**

```tsx
// OLD CODE - DELETE (about 100 lines of header controls)
<div
  onMouseDown={handleResizeStart}
  style={{
    position: 'absolute',
    // ...
  }}
  title="Resize chat"
/>
<div style={{ position: 'absolute', top: '12px', right: '12px', /* ... */ }}>
  {/* Minimize Button */}
  <button onClick={() => setIsMinimized(true)} style={{ /* ... */ }}>
    <span>−</span>
  </button>
  {/* Close Button */}
  <button onClick={onToggle} style={{ /* ... */ }}>
    <IconClose size={16} />
  </button>
</div>
```

**Replace with:**

```tsx
// NEW CODE
import { ChatHeader } from './ChatHeader';

// In the render (inside the main chat container div):
<ChatHeader
  onMinimize={() => setIsMinimized(true)}
  onClose={onToggle}
  onResizeStart={handleResizeStart}
/>
```

**Test:**
1. Minimize button works
2. Close button works
3. Resize corner works

**Commit:**
```bash
git add .
git commit -m "refactor: extract ChatHeader component"
```

---

### Step 7: Extract ContextBadge Component (1 hour)

**Goal:** Extract the context indicator badge (used in messages and input).

#### 7.1: Create the Component

**Create:** `src/components/chat/ContextBadge.tsx`

```tsx
import React, { useState } from 'react';
import styles from './styles/chat.module.css';

interface ContextBadgeProps {
  contextData: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

/**
 * Context badge that shows when message has additional context
 * Can be expanded to show full context, and cleared if in input
 */
export const ContextBadge: React.FC<ContextBadgeProps> = ({
  contextData,
  isExpanded,
  onToggle,
  onClear,
  showClearButton = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (contextData.length === 0) return null;

  return (
    <div 
      className={styles.contextBadge}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onToggle}
        className={styles.contextButton}
        style={{
          paddingRight: isHovered && showClearButton ? '22px' : '6px',
        }}
      >
        {/* Document icon */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>Context</span>

        {/* Chevron icon */}
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

        {/* Clear button (only in input) */}
        {isHovered && showClearButton && onClear && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClear();
            }}
            style={{
              position: 'absolute',
              right: '2px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 100, 100, 0.2)',
              border: 'none',
              borderRadius: '3px',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#faa',
              fontSize: '10px',
              transition: 'all 0.15s ease',
            }}
            title="Remove context"
          >
            ×
          </button>
        )}
      </button>

      {/* Expanded context dropdown */}
      {isExpanded && (
        <div className={styles.contextDropdown}>
          {contextData.map((ctx, idx) => (
            <div key={idx} className={styles.contextItem}>
              {ctx}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

#### 7.2: Use the Component in ChatSidebar

**This is used in TWO places:**
1. In message bubbles (for user messages with context)
2. In the input box (for active context)

**Find and replace BOTH instances:**

```tsx
// OLD CODE in user message - DELETE THIS (about 80 lines)
{msg.context && msg.context.length > 0 && (
  <div style={{ position: 'absolute', top: '10px', left: '10px', /* ... */ }}>
    <button type="button" onClick={toggleContext} style={{ /* ... */ }}>
      {/* SVG icons */}
      <span>Context</span>
      {/* More complex JSX */}
    </button>
    {isContextExpanded && (
      <div style={{ /* ... */ }}>
        {msg.context.map((ctx, idx) => (/* ... */))}
      </div>
    )}
  </div>
)}
```

**Replace with:**

```tsx
// NEW CODE
{msg.context && msg.context.length > 0 && (
  <ContextBadge
    contextData={msg.context}
    isExpanded={expandedContexts.has(msg.id)}
    onToggle={toggleContext}
  />
)}
```

**Similarly for input context:**

```tsx
// NEW CODE in input form
{hasActiveContext && (
  <ContextBadge
    contextData={activeContextData}
    isExpanded={isActiveContextExpanded}
    onToggle={() => setIsActiveContextExpanded(!isActiveContextExpanded)}
    onClear={onClearContext}
    showClearButton
  />
)}
```

**Test:**
1. Context badge appears in messages
2. Context badge appears in input
3. Can expand/collapse context
4. Can clear input context

**Commit:**
```bash
git add .
git commit -m "refactor: extract ContextBadge component"
```

---

### Step 8: Extract ChatInput Component (1 hour)

**Goal:** Move input form into separate component.

#### 8.1: Create the Component

**Create:** `src/components/chat/ChatInput.tsx`

```tsx
import React from 'react';
import { IconArrowUp } from '../Icons';
import { ContextBadge } from './ContextBadge';
import styles from './styles/chat.module.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  hasActiveContext: boolean;
  activeContextData: string[];
  isActiveContextExpanded: boolean;
  onToggleContextExpanded: () => void;
  onClearContext?: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

/**
 * Chat input form with context badge and submit button
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  isLoading,
  hasActiveContext,
  activeContextData,
  isActiveContextExpanded,
  onToggleContextExpanded,
  onClearContext,
  inputRef,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <div className={styles.inputContainer}>
        {/* Context indicator */}
        {hasActiveContext && (
          <ContextBadge
            contextData={activeContextData}
            isExpanded={isActiveContextExpanded}
            onToggle={onToggleContextExpanded}
            onClear={onClearContext}
            showClearButton
          />
        )}

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about the selected text..."
          disabled={isLoading}
          className={`${styles.inputTextarea} ${
            hasActiveContext ? styles['inputTextarea--withContext'] : ''
          }`}
          rows={1}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className={`${styles.submitButton} ${
            value.trim() && !isLoading
              ? styles['submitButton--active']
              : styles['submitButton--disabled']
          }`}
          title={isLoading ? 'Sending...' : 'Send message'}
          aria-label="Send message"
        >
          {isLoading ? '...' : <IconArrowUp size={14} />}
        </button>
      </div>
    </form>
  );
};
```

#### 8.2: Use the Component in ChatSidebar

**Find the input form code (near the bottom):**

```tsx
// OLD CODE - DELETE (about 150 lines)
<form
  onSubmit={handleSubmit}
  style={{ position: 'absolute', bottom: 0, /* ... */ }}
>
  <div style={{ /* ... */ }}>
    {hasActiveContext && (/* context badge */)}
    <textarea /* ... */ />
    <button /* ... */ />
  </div>
</form>
```

**Replace with:**

```tsx
// NEW CODE
import { ChatInput } from './ChatInput';

// In the render:
<ChatInput
  value={currentQuestion}
  onChange={onQuestionChange}
  onSubmit={onSend}
  onKeyDown={handleKeyDown}
  isLoading={isLoading}
  hasActiveContext={hasActiveContext}
  activeContextData={activeContextData}
  isActiveContextExpanded={isActiveContextExpanded}
  onToggleContextExpanded={() => setIsActiveContextExpanded(!isActiveContextExpanded)}
  onClearContext={onClearContext}
  inputRef={inputRef}
/>
```

**Test:**
1. Type in input
2. Submit with Enter key
3. Submit with button
4. Context badge works

**Commit:**
```bash
git add .
git commit -m "refactor: extract ChatInput component"
```

---

### Step 9: Extract ChatMessage Component (1.5 hours)

**Goal:** Move individual message rendering into separate component.

**This is the biggest extraction!** The message rendering has a lot of logic.

#### 9.1: Create the Component

**Create:** `src/components/chat/ChatMessage.tsx`

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { ContextBadge } from './ContextBadge';
import styles from './styles/chat.module.css';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pageNumber?: number;
  context?: string[];
}

interface ChatMessageProps {
  message: ChatMessage;
  isContextExpanded: boolean;
  onToggleContext: () => void;
}

/**
 * Individual chat message component
 * Handles both user and assistant messages with context
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isContextExpanded,
  onToggleContext,
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`${styles.messageWrapper} ${
        isUser ? styles['messageWrapper--user'] : styles['messageWrapper--assistant']
      }`}
    >
      <div className={styles.messageContent}>
        {isUser ? (
          <div
            className={`${styles.userMessage} ${
              message.context && message.context.length > 0
                ? styles['userMessage--withContext']
                : ''
            }`}
          >
            {/* Context badge for user messages */}
            {message.context && message.context.length > 0 && (
              <ContextBadge
                contextData={message.context}
                isExpanded={isContextExpanded}
                onToggle={onToggleContext}
              />
            )}
            {message.content}
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              // Style code blocks
              code: ({ node, inline, className, children, ...props }: any) => {
                return inline ? (
                  <code
                    style={{
                      background: '#1a1a1a',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <pre
                    style={{
                      background: '#1a1a1a',
                      padding: '8px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      margin: '4px 0',
                    }}
                  >
                    <code {...props}>{children}</code>
                  </pre>
                );
              },
              // Style links
              a: ({ children, ...props }: any) => (
                <a style={{ color: 'var(--accent)', textDecoration: 'none' }} {...props}>
                  {children}
                </a>
              ),
              // Style paragraphs
              p: ({ children, ...props }: any) => (
                <p style={{ margin: '8px 0 8px 0' }} {...props}>
                  {children}
                </p>
              ),
              // Style headings
              h1: ({ children, ...props }: any) => (
                <h1
                  style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 6px 0' }}
                  {...props}
                >
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }: any) => (
                <h2
                  style={{ fontSize: '15px', fontWeight: 600, margin: '10px 0 6px 0' }}
                  {...props}
                >
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }: any) => (
                <h3
                  style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px 0' }}
                  {...props}
                >
                  {children}
                </h3>
              ),
              // Style lists
              ul: ({ children, ...props }: any) => (
                <ul
                  style={{
                    marginLeft: '12px',
                    marginTop: '4px',
                    marginBottom: '4px',
                    paddingLeft: '8px',
                  }}
                  {...props}
                >
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }: any) => (
                <ol
                  style={{
                    marginLeft: '12px',
                    marginTop: '4px',
                    marginBottom: '4px',
                    paddingLeft: '8px',
                  }}
                  {...props}
                >
                  {children}
                </ol>
              ),
              li: ({ children, ...props }: any) => (
                <li style={{ marginBottom: '2px' }} {...props}>
                  {children}
                </li>
              ),
              // Style blockquotes
              blockquote: ({ children, ...props }: any) => (
                <blockquote
                  style={{
                    borderLeft: '2px solid #444',
                    paddingLeft: '8px',
                    margin: '4px 0',
                    color: 'var(--text-muted)',
                  }}
                  {...props}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};
```

#### 9.2: Use the Component in ChatSidebar

**Find the messages mapping:**

```tsx
// OLD CODE - DELETE (about 200 lines!)
{messages.map(msg => {
  const isContextExpanded = expandedContexts.has(msg.id);
  const toggleContext = () => { /* ... */ };
  
  return (
    <div key={msg.id} style={{ /* ... */ }}>
      {/* 150 lines of message rendering */}
      {msg.role === 'user' ? (
        <div style={{ /* ... */ }}>
          {/* user message with context */}
        </div>
      ) : (
        <ReactMarkdown /* ... */>
          {/* 100 lines of markdown config */}
        </ReactMarkdown>
      )}
    </div>
  );
})}
```

**Replace with:**

```tsx
// NEW CODE (so clean!)
import { ChatMessage } from './ChatMessage';

// In the render:
{messages.map(msg => {
  const toggleContext = () => {
    setExpandedContexts(prev => {
      const next = new Set(prev);
      if (next.has(msg.id)) {
        next.delete(msg.id);
      } else {
        next.add(msg.id);
      }
      return next;
    });
  };

  return (
    <ChatMessage
      key={msg.id}
      message={msg}
      isContextExpanded={expandedContexts.has(msg.id)}
      onToggleContext={toggleContext}
    />
  );
})}
```

**Test:**
1. Messages render correctly
2. User messages show with gradient
3. Assistant messages show with markdown
4. Context badges work
5. Code blocks format correctly

**Commit:**
```bash
git add .
git commit -m "refactor: extract ChatMessage component"
```

---

### Step 10: Final Cleanup and CSS Migration (1 hour)

**Goal:** Replace ALL remaining inline styles with CSS module classes.

#### 10.1: Update ChatSidebar to Use CSS Classes

**In ChatSidebar.tsx, replace inline styles:**

**Before:**
```tsx
<div
  style={{
    position: 'fixed',
    bottom: `${chatPosition.bottom}px`,
    right: `${chatPosition.right}px`,
    width: `${chatSize.width}px`,
    height: `${chatSize.height}px`,
    zIndex: 1000,
    background: 'var(--surface-1)',
    // ... many more lines
  }}
>
```

**After:**
```tsx
<div
  className={styles.chatContainer}
  style={{
    // Only dynamic styles that can't be in CSS
    bottom: `${chatPosition.bottom}px`,
    right: `${chatPosition.right}px`,
    width: `${chatSize.width}px`,
    height: `${chatSize.height}px`,
  }}
>
```

**Do this for all remaining elements with inline styles.**

#### 10.2: Clean Up Imports

Remove any unused imports from ChatSidebar.tsx:
- Remove unused React imports
- Remove markdown imports (now in ChatMessage)
- Remove icon imports that are in child components

#### 10.3: Final File Check

**Your ChatSidebar.tsx should now be around 120-150 lines and look like this:**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { MinimizedPill } from './MinimizedPill';
import { useChatDrag } from './hooks/useChatDrag';
import { useChatResize } from './hooks/useChatResize';
import styles from './styles/chat.module.css';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pageNumber?: number;
  context?: string[];
}

interface ChatSidebarProps {
  messages: ChatMessage[];
  currentQuestion: string;
  onQuestionChange: (question: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveContext?: boolean;
  activeContextData?: string[];
  onClearContext?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  currentQuestion,
  onQuestionChange,
  onSend,
  isLoading,
  isOpen,
  onToggle,
  hasActiveContext = false,
  activeContextData = [],
  onClearContext,
}) => {
  // State
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(new Set());
  const [isActiveContextExpanded, setIsActiveContextExpanded] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 225, height: 600 });
  const [chatPosition, setChatPosition] = useState({ bottom: 24, right: 24 });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userHasScrolledAwayRef = useRef<boolean>(false);

  // Custom hooks
  const { handleResizeStart } = useChatResize(chatSize, setChatSize);
  const { handleDragStart } = useChatDrag(chatPosition, setChatPosition);

  // Effects (scroll detection, auto-scroll, focus)
  // ... (keep existing effects)

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuestion.trim() && !isLoading) {
      onSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Early returns
  if (!isOpen) return null;
  if (isMinimized) {
    return <MinimizedPill messageCount={messages.length} onClick={() => setIsMinimized(false)} />;
  }

  // Main render
  return (
    <>
      <div
        className={styles.chatContainer}
        style={{
          bottom: `${chatPosition.bottom}px`,
          right: `${chatPosition.right}px`,
          width: `${chatSize.width}px`,
          height: `${chatSize.height}px`,
        }}
      >
        {/* Drag handle */}
        <div className={styles.dragHandle} onMouseDown={handleDragStart} title="Drag to move chat" />

        {/* Header */}
        <ChatHeader
          onMinimize={() => setIsMinimized(true)}
          onClose={onToggle}
          onResizeStart={handleResizeStart}
        />

        {/* Messages */}
        <div ref={messagesContainerRef} className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div style={{ flex: 1 }} />
          ) : (
            messages.map(msg => {
              const toggleContext = () => {
                setExpandedContexts(prev => {
                  const next = new Set(prev);
                  if (next.has(msg.id)) {
                    next.delete(msg.id);
                  } else {
                    next.add(msg.id);
                  }
                  return next;
                });
              };

              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isContextExpanded={expandedContexts.has(msg.id)}
                  onToggleContext={toggleContext}
                />
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <span className={styles.dotPulse}>●</span>
              <span className={styles.dotPulse}>●</span>
              <span className={styles.dotPulse}>●</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          value={currentQuestion}
          onChange={onQuestionChange}
          onSubmit={onSend}
          onKeyDown={handleKeyDown}
          isLoading={isLoading}
          hasActiveContext={hasActiveContext}
          activeContextData={activeContextData}
          isActiveContextExpanded={isActiveContextExpanded}
          onToggleContextExpanded={() => setIsActiveContextExpanded(!isActiveContextExpanded)}
          onClearContext={onClearContext}
          inputRef={inputRef}
        />
      </div>
    </>
  );
};
```

**Test everything one more time:**
1. Open chat
2. Send messages
3. Minimize/maximize
4. Drag window
5. Resize window
6. Context badges work
7. Markdown renders

**Final commit:**
```bash
git add .
git commit -m "refactor: complete ChatSidebar refactoring - 954 lines → 9 focused files"
```

---

### Step 11: Move Files to New Directory (15 minutes)

**Goal:** Organize the new components into the chat/ directory.

**Current structure:**
```
src/components/
  ├── ChatSidebar.tsx
  ├── ChatMessage.tsx (new)
  ├── ChatInput.tsx (new)
  ├── ChatHeader.tsx (new)
  ├── MinimizedPill.tsx (new)
  ├── ContextBadge.tsx (new)
  └── ... other components
```

**New structure:**
```
src/components/chat/
  ├── ChatSidebar.tsx
  ├── ChatMessage.tsx
  ├── ChatInput.tsx
  ├── ChatHeader.tsx
  ├── MinimizedPill.tsx
  ├── ContextBadge.tsx
  ├── hooks/
  │   ├── useChatResize.ts
  │   └── useChatDrag.ts
  └── styles/
      └── chat.module.css
```

**Move the files:**
```bash
# Move main ChatSidebar
mv src/components/ChatSidebar.tsx src/components/chat/

# Your new files are already in chat/ directory
# Just verify they're all there
ls src/components/chat/
```

**Update import in App.tsx:**
```tsx
// OLD
import { ChatSidebar } from './components/ChatSidebar';

// NEW
import { ChatSidebar } from './components/chat/ChatSidebar';
```

**Test the app:**
- Make sure it still compiles
- Chat should work exactly the same

**Commit:**
```bash
git add .
git commit -m "refactor: organize chat components into chat/ directory"
```

---

## ✅ Final Verification Checklist

Before marking this task complete, verify:

- [ ] All 9 files created and in correct locations
- [ ] ChatSidebar.tsx is under 150 lines
- [ ] No inline styles in ChatSidebar (only dynamic positioning)
- [ ] All styles in chat.module.css
- [ ] App compiles without errors
- [ ] Chat window opens/closes
- [ ] Messages send and appear
- [ ] Minimize/maximize works
- [ ] Drag and resize work
- [ ] Context badges expand/collapse
- [ ] Markdown renders in assistant messages
- [ ] No console errors
- [ ] Git history shows clear progression of commits

---

## 📊 Before vs After

### Before
- **1 file:** ChatSidebar.tsx (954 lines)
- Inline styles everywhere
- Hard to modify
- Hard to test
- Hard to understand

### After
- **9 files:** Total ~790 lines
- ChatSidebar.tsx: 120 lines (container only)
- ChatMessage.tsx: 100 lines (message rendering)
- ChatInput.tsx: 80 lines (input form)
- ChatHeader.tsx: 60 lines (header controls)
- MinimizedPill.tsx: 40 lines (collapsed state)
- ContextBadge.tsx: 80 lines (context indicator)
- useChatResize.ts: 80 lines (resize logic)
- useChatDrag.ts: 80 lines (drag logic)
- chat.module.css: 150 lines (all styles)

### Benefits
- ✅ 85% smaller main file
- ✅ Each component has single responsibility
- ✅ Easy to modify individual features
- ✅ Easy to test each component
- ✅ CSS is reusable and maintainable
- ✅ Clear separation of concerns

---

## 🎓 What You Learned

By completing this refactor, you learned:

1. **Component extraction** - How to break large components into smaller ones
2. **Custom hooks** - How to extract logic into reusable hooks
3. **CSS modules** - How to replace inline styles with maintainable CSS
4. **Git workflow** - How to commit incrementally for safety
5. **Testing as you go** - How to verify after each change
6. **Code organization** - How to structure feature directories

---

## 🚀 Next Steps

After completing this refactor:

1. **Create a PR:** `git push origin refactor/chat-sidebar`
2. **Get it reviewed** - Show your team the improvements
3. **Merge to main** - Once approved
4. **Apply same patterns to other large files:**
   - PdfViewer.tsx (1,365 lines) - next priority
   - electron/main.ts (989 lines)
   - Paywall.tsx (511 lines)

---

## ❓ Need Help?

If you get stuck:

1. **Check git history** - See what changed in each commit
2. **Roll back** - `git reset --hard HEAD` if something breaks
3. **Ask for help** - Reach out with specific error messages
4. **Take a break** - Come back with fresh eyes

**Remember:** You're not changing functionality, just organizing code. If the chat works before, it should work exactly the same after!

---

**Good luck! You've got this! 🚀**
