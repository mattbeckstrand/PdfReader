# Refactoring Documentation Guide

This repository contains **two types** of refactoring documentation for each critical file.

---

## 📄 Document Types

### 🤖 SPEC Files (AI Agent Specifications)

**Purpose**: Technical specifications for AI agents to execute refactorings autonomously

**Format**: Goal-oriented, constraint-based, checklist-driven

**Best For**:

- Giving to Claude/GPT/other AI coding assistants
- Automated refactoring tools
- Clear success criteria and verification

**Structure**:

- **Objective**: What needs to be achieved
- **Constraints**: What must be preserved
- **Module Specifications**: Exact interfaces and requirements
- **Verification Checklist**: Functional and technical requirements
- **Success Criteria**: Pass/fail conditions
- **Error Prevention**: Common mistakes to avoid

**Files**:

- `REFACTOR_SPEC_CHATSIDEBAR.md`
- `REFACTOR_SPEC_ELECTRON_MAIN.md`
- `REFACTOR_SPEC_PDFVIEWER.md`

---

### 👤 PLAN Files (Human Developer Guides)

**Purpose**: Step-by-step guides for human developers executing refactorings manually

**Format**: Tutorial-style with motivation, testing, and git commits

**Best For**:

- Junior developers learning refactoring
- Manual execution with safety checkpoints
- Understanding WHY and HOW at each step

**Structure**:

- **Step-by-step instructions** with exact commands
- **Git commit checkpoints** after each step
- **Testing instructions** (manual verification)
- **Motivation and explanations** for each step
- **Troubleshooting** ("if something breaks...")
- **Encouragement** and hand-holding

**Files**:

- `REFACTOR_PLAN_CHATSIDEBAR.md`
- `REFACTOR_PLAN_ELECTRON_MAIN.md`
- `REFACTOR_PLAN_PDFVIEWER.md`

---

## 🆚 Key Differences

| Feature          | AI SPEC            | Human PLAN                     |
| ---------------- | ------------------ | ------------------------------ |
| **Style**        | Technical, concise | Tutorial, verbose              |
| **Commits**      | Not mentioned      | After every step               |
| **Testing**      | Checklist at end   | Manual testing after each step |
| **Motivation**   | None               | Explains WHY                   |
| **Errors**       | Prevention list    | Troubleshooting guide          |
| **Tone**         | Professional       | Encouraging                    |
| **Code samples** | Interfaces & types | Full copy-paste examples       |
| **Length**       | Shorter            | Longer                         |

---

## 🎯 Which Should You Use?

### Use SPEC Files If:

- ✅ You're an AI coding assistant
- ✅ You want to automate the refactoring
- ✅ You're an experienced developer who just needs requirements
- ✅ You prefer goal-oriented documentation
- ✅ You don't need hand-holding

### Use PLAN Files If:

- ✅ You're a human developer doing this manually
- ✅ You're less experienced with refactoring
- ✅ You want safety checkpoints with git commits
- ✅ You want to understand WHY each step matters
- ✅ You prefer step-by-step instructions

---

## 📋 Example Comparison

### AI SPEC Format:

````markdown
## Step 1: Extract useChatResize Hook

**Interface**:

```typescript
export function useChatResize(
  chatSize: ChatSize,
  setChatSize: (size: ChatSize) => void
): { handleResizeStart: (e: React.MouseEvent) => void };
```
````

**Requirements**:

- Use refs internally, don't expose them
- Clean up event listeners on unmount
- Min/max constraints (200-800px width)

````

### Human PLAN Format:
```markdown
### Step 3: Extract useChatResize Hook (1 hour)

**Goal:** Move all resize logic out of ChatSidebar into a custom hook.

**Why this step?** Separating resize logic makes ChatSidebar easier to understand.

#### 3.1: Create the Hook File

**Create:** `src/components/chat/hooks/useChatResize.ts`

[300 lines of complete code to copy-paste]

#### 3.2: Use the Hook in ChatSidebar

**In ChatSidebar.tsx, find this code (around line 70):**

```tsx
// OLD CODE - DELETE THIS
const isResizingRef = useRef(false);
// ... [20 lines of code to delete]
````

**Replace with:**

```tsx
// NEW CODE
import { useChatResize } from './hooks/useChatResize';
// ... [exact code to add]
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

```

---

## 🚀 Quick Start

1. **Read the Master Plan**: [REFACTOR_MASTER_PLAN.md](./REFACTOR_MASTER_PLAN.md)
2. **Choose your format**:
   - AI Agent? → Use **SPEC** files
   - Human Dev? → Use **PLAN** files
3. **Start with highest priority**: PdfViewer.tsx
4. **Follow the document** step by step
5. **Verify functionality** after completion

---

## 📊 Refactoring Progress Tracking

| File | Status | AI Spec | Human Plan |
|------|--------|---------|------------|
| **ChatSidebar.tsx** | 🔴 Not Started | [Spec](./REFACTOR_SPEC_CHATSIDEBAR.md) | [Plan](./REFACTOR_PLAN_CHATSIDEBAR.md) |
| **electron/main.ts** | 🔴 Not Started | [Spec](./REFACTOR_SPEC_ELECTRON_MAIN.md) | [Plan](./REFACTOR_PLAN_ELECTRON_MAIN.md) |
| **PdfViewer.tsx** | 🔴 Not Started | [Spec](./REFACTOR_SPEC_PDFVIEWER.md) | [Plan](./REFACTOR_PLAN_PDFVIEWER.md) |
| **App.tsx** | 🔴 Not Started | (In Master Plan) | (In Master Plan) |
| **Paywall.tsx** | 🔴 Not Started | (In Master Plan) | (In Master Plan) |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## 💡 Tips

### For AI Agents:
- Read the SPEC file completely before starting
- Follow constraints strictly - no behavior changes
- Run verification checklist at the end
- Check success criteria before marking complete

### For Human Developers:
- Read the entire PLAN first to understand the flow
- Don't skip testing steps - catch bugs early
- Commit after each step for easy rollback
- Take breaks if you get stuck

---

## 🆘 Getting Help

If you get stuck:

1. **Check the Master Plan** - [REFACTOR_MASTER_PLAN.md](./REFACTOR_MASTER_PLAN.md)
2. **Read the code review** - [CODE_REVIEW_UPDATED.md](./CODE_REVIEW_UPDATED.md)
3. **Look at git history** - See what changed in each commit
4. **Ask for help** - Provide specific error messages

---

**Both formats achieve the same goal: a cleaner, more maintainable codebase. Choose the format that works best for you!** ✨
```
