# ChatSidebar Refactoring Specification (AI Agent)

**Type:** Component Extraction & Modularization
**File:** `src/components/ChatSidebar.tsx` (954 lines)
**Target:** 9 focused files (<150 lines each)
**Priority:** Critical

---

## Objective

Refactor ChatSidebar.tsx by extracting components, hooks, and styles while preserving exact functionality and type safety.

---

## Constraints

1. **Zero Behavior Change**: All functionality must work identically after refactoring
2. **Type Safety**: Maintain strict TypeScript with no `any` types
3. **Backwards Compatibility**: Props interface `ChatSidebarProps` must remain unchanged
4. **No Dependencies Added**: Use only existing dependencies
5. **Preserve All Logic**: Copy all logic exactly, including console.logs, error handling, animations

---

## Target Architecture

```
src/components/chat/
  ├── ChatSidebar.tsx          (~120 lines - main container)
  ├── ChatMessage.tsx           (~100 lines - individual message)
  ├── ChatInput.tsx             (~80 lines - input form)
  ├── ChatHeader.tsx            (~60 lines - header controls)
  ├── MinimizedPill.tsx         (~40 lines - collapsed state)
  ├── ContextBadge.tsx          (~80 lines - context indicator)
  ├── hooks/
  │   ├── useChatResize.ts      (~80 lines - resize logic)
  │   └── useChatDrag.ts        (~80 lines - drag logic)
  └── styles/
      └── chat.module.css       (~150 lines - all styles)
```

---

## Step 1: Extract Styles to CSS Module

**Task**: Move all inline styles to `src/components/chat/styles/chat.module.css`

**Requirements**:

- Create CSS module with BEM-style naming
- Use CSS custom properties (var(--text-1), etc.)
- Preserve all hover effects, animations, transitions
- Keep dynamic styles (position, width, height) as inline
- Import: `import styles from './styles/chat.module.css'`

**Example Mapping**:

```tsx
// Before (inline)
<div style={{
  position: 'fixed',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '50px',
  padding: '12px 20px',
  /* ... */
}}>

// After (CSS module)
<div className={styles.minimizedPill}>
```

**Key Classes Needed**:

- `.chatContainer` - main floating container
- `.minimizedPill` - collapsed state
- `.headerControls`, `.headerButton` - header buttons
- `.messagesContainer` - scrollable area
- `.messageWrapper`, `.messageWrapper--user`, `.messageWrapper--assistant`
- `.userMessage`, `.userMessage--withContext`
- `.contextBadge`, `.contextButton`, `.contextDropdown`
- `.inputForm`, `.inputContainer`, `.inputTextarea`, `.submitButton`
- `.loadingIndicator`, `.dotPulse`
- `.resizeHandle`, `.dragHandle`

**Animations to Preserve**:

- `@keyframes dot-pulse` - loading dots
- `@keyframes slideUp` - chat appear animation

---

## Step 2: Extract useChatResize Hook

**Task**: Extract resize logic to `src/components/chat/hooks/useChatResize.ts`

**Interface**:

```typescript
interface ChatSize {
  width: number;
  height: number;
}

export function useChatResize(
  chatSize: ChatSize,
  setChatSize: (size: ChatSize) => void
): {
  handleResizeStart: (e: React.MouseEvent) => void;
};
```

**Logic to Extract**:

- Lines ~71-126 from ChatSidebar.tsx
- `isResizingRef` and `resizeStartRef` refs
- Mouse move/up event listeners in useEffect
- `handleResizeStart` function
- Min/max constraints (200-800px width, 400-900px height)
- Cursor style management

**Requirements**:

- Use refs internally, don't expose them
- Clean up event listeners on unmount
- Preserve exact resize behavior (deltaX/deltaY calculations)

---

## Step 3: Extract useChatDrag Hook

**Task**: Extract drag logic to `src/components/chat/hooks/useChatDrag.ts`

**Interface**:

```typescript
interface ChatPosition {
  bottom: number;
  right: number;
}

export function useChatDrag(
  chatPosition: ChatPosition,
  setChatPosition: (position: ChatPosition) => void
): {
  handleDragStart: (e: React.MouseEvent) => void;
};
```

**Logic to Extract**:

- Lines ~128-139 from ChatSidebar.tsx
- `isDraggingRef` and `dragStartRef` refs
- Mouse move/up event listeners (within same useEffect as resize)
- `handleDragStart` function
- Min boundaries (10px from edges)
- Cursor style management

---

## Step 4: Extract MinimizedPill Component

**Task**: Create `src/components/chat/MinimizedPill.tsx`

**Interface**:

```typescript
interface MinimizedPillProps {
  messageCount: number;
  onClick: () => void;
}

export const MinimizedPill: React.FC<MinimizedPillProps>;
```

**Logic to Extract**:

- Lines ~208-257 from ChatSidebar.tsx
- Render minimized pill with icon, text, badge
- Use `styles.minimizedPill` from CSS module
- Preserve hover effects (transform, box-shadow)
- Import `IconChat` from `../Icons`

---

## Step 5: Extract ChatHeader Component

**Task**: Create `src/components/chat/ChatHeader.tsx`

**Interface**:

```typescript
interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps>;
```

**Elements**:

- Resize handle (top-left corner)
- Minimize button (− character)
- Close button (IconClose)
- Use CSS module classes

---

## Step 6: Extract ContextBadge Component

**Task**: Create `src/components/chat/ContextBadge.tsx`

**Interface**:

```typescript
interface ContextBadgeProps {
  contextData: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const ContextBadge: React.FC<ContextBadgeProps>;
```

**Features**:

- Document icon + "Context" label + chevron
- Expandable dropdown showing context items
- Optional clear button (X) on hover
- Used in both messages AND input form
- Manage hover state internally

**Logic to Extract**:

- Lines ~456-548 (in user messages)
- Lines ~736-871 (in input form)
- Consolidate into one reusable component

---

## Step 7: Extract ChatInput Component

**Task**: Create `src/components/chat/ChatInput.tsx`

**Interface**:

```typescript
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

export const ChatInput: React.FC<ChatInputProps>;
```

**Elements**:

- Form wrapper with onSubmit handler
- ContextBadge (conditional)
- Textarea with dynamic padding
- Submit button (arrow icon) with active/disabled states
- Use CSS module classes

**Logic to Extract**:

- Lines ~712-928 from ChatSidebar.tsx

---

## Step 8: Extract ChatMessage Component

**Task**: Create `src/components/chat/ChatMessage.tsx`

**Interface**:

```typescript
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

export const ChatMessage: React.FC<ChatMessageProps>;
```

**Requirements**:

- Render user messages as gradient bubbles
- Render assistant messages with ReactMarkdown
- Include ContextBadge for user messages with context
- Preserve ALL markdown component customizations (code blocks, lists, headings, etc.)
- Import markdown dependencies: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`

**Logic to Extract**:

- Lines ~405-682 from ChatSidebar.tsx
- All ReactMarkdown component overrides

---

## Step 9: Refactor ChatSidebar.tsx

**Task**: Update main ChatSidebar to use extracted components/hooks

**Result Structure**:

```typescript
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { MinimizedPill } from './MinimizedPill';
import { useChatDrag } from './hooks/useChatDrag';
import { useChatResize } from './hooks/useChatResize';
import styles from './styles/chat.module.css';

export const ChatSidebar: React.FC<ChatSidebarProps> = (
  {
    /* ... */
  }
) => {
  // State (keep existing)
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(new Set());
  // ... etc

  // Custom hooks
  const { handleResizeStart } = useChatResize(chatSize, setChatSize);
  const { handleDragStart } = useChatDrag(chatPosition, setChatPosition);

  // Effects (keep existing - scroll detection, auto-scroll, focus)

  // Early returns
  if (!isOpen) return null;
  if (isMinimized) return <MinimizedPill /* ... */ />;

  // Main render
  return (
    <div
      className={styles.chatContainer}
      style={
        {
          /* dynamic positioning */
        }
      }
    >
      <div className={styles.dragHandle} onMouseDown={handleDragStart} />
      <ChatHeader /* ... */ />
      <div className={styles.messagesContainer}>
        {messages.map(msg => (
          <ChatMessage key={msg.id} /* ... */ />
        ))}
      </div>
      <ChatInput /* ... */ />
    </div>
  );
};
```

**Target**: ~120 lines total

---

## Verification Checklist

After refactoring, verify:

### Functional Requirements

- [ ] Chat opens/closes correctly
- [ ] Messages send and display
- [ ] User messages show gradient bubble
- [ ] Assistant messages render markdown (code blocks, math, lists, headings)
- [ ] Context badges expand/collapse
- [ ] Input context badge has clear button on hover
- [ ] Minimize/maximize works
- [ ] Drag to reposition works
- [ ] Resize from corner works
- [ ] Auto-scroll behavior preserved
- [ ] Manual scroll detection works
- [ ] Loading indicator animates
- [ ] Enter key sends message
- [ ] Shift+Enter adds newline

### Code Quality

- [ ] No TypeScript errors
- [ ] All imports resolve correctly
- [ ] No `any` types introduced
- [ ] ChatSidebar.tsx < 150 lines
- [ ] All extracted files < 150 lines
- [ ] CSS module contains all styles
- [ ] No inline styles except dynamic values (position, dimensions)

### Type Safety

- [ ] ChatMessage interface exported from ChatMessage.tsx
- [ ] All component props properly typed
- [ ] Hook return types explicitly defined
- [ ] No implicit any

---

## Implementation Notes

### Import Locations After Refactor

```typescript
// In App.tsx or parent component
import { ChatSidebar } from './components/chat/ChatSidebar';
import type { ChatMessage } from './components/chat/ChatMessage';
```

### File Size Targets

- ChatSidebar.tsx: 120 lines
- ChatMessage.tsx: 100 lines
- ChatInput.tsx: 80 lines
- ChatHeader.tsx: 60 lines
- MinimizedPill.tsx: 40 lines
- ContextBadge.tsx: 80 lines
- useChatResize.ts: 80 lines
- useChatDrag.ts: 80 lines
- chat.module.css: 150 lines

**Total: ~790 lines across 9 files (vs 954 in 1 file)**

---

## Success Criteria

**Must achieve ALL of the following:**

1. ✅ Code compiles without errors or warnings
2. ✅ ChatSidebar.tsx is < 150 lines
3. ✅ All 9 files created in correct locations
4. ✅ Zero behavior changes (functionality identical)
5. ✅ Type safety maintained (no `any`, all exports typed)
6. ✅ All styles in CSS module
7. ✅ Imports use correct relative paths

---

## Error Prevention

**Common Mistakes to Avoid**:

1. Don't change prop interfaces - keep `ChatSidebarProps` identical
2. Don't remove console.log statements - preserve all logging
3. Don't optimize logic - copy exactly as-is
4. Don't skip markdown component overrides - they're critical
5. Don't forget `'katex/dist/katex.min.css'` import
6. Preserve all animation keyframes in CSS
7. Keep all event listener cleanup in useEffect returns

---

**This is a refactoring task, not a rewrite. Preserve all existing behavior exactly.**
