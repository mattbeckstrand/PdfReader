# Master Refactoring Plan - Complete Roadmap

**Project:** PDF AI Reader Codebase Cleanup
**Status:** 🔴 Not Started
**Total Estimated Time:** 20-25 hours
**Deadline:** Complete before adding Phase 2 features

---

## 🎯 Executive Summary

Your codebase has **5 critical files** totaling **5,966 lines** that need immediate refactoring. If you don't fix these now, Phase 2 development will be 5-10x slower.

**The Plan:** Refactor the 5 worst files over 2-3 focused days, making your codebase 3x more maintainable.

---

## 📊 Problem Files (Priority Order)

| Priority | File                 | Lines | Impact   | Time | AI Spec Document                                                   | Human Plan Document                                                |
| -------- | -------------------- | ----- | -------- | ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **1** 🔥 | **PdfViewer.tsx**    | 1,365 | CRITICAL | 6-8h | [REFACTOR_SPEC_PDFVIEWER.md](./REFACTOR_SPEC_PDFVIEWER.md)         | [REFACTOR_PLAN_PDFVIEWER.md](./REFACTOR_PLAN_PDFVIEWER.md)         |
| **2** 🔥 | **electron/main.ts** | 989   | CRITICAL | 4-6h | [REFACTOR_SPEC_ELECTRON_MAIN.md](./REFACTOR_SPEC_ELECTRON_MAIN.md) | [REFACTOR_PLAN_ELECTRON_MAIN.md](./REFACTOR_PLAN_ELECTRON_MAIN.md) |
| **3** 🚨 | **ChatSidebar.tsx**  | 954   | HIGH     | 6-8h | [REFACTOR_SPEC_CHATSIDEBAR.md](./REFACTOR_SPEC_CHATSIDEBAR.md)     | [REFACTOR_PLAN_CHATSIDEBAR.md](./REFACTOR_PLAN_CHATSIDEBAR.md)     |
| **4** ⚠️ | **App.tsx**          | 818   | MEDIUM   | 3-4h | See section below                                                  | See section below                                                  |
| **5** ⚠️ | **Paywall.tsx**      | 511   | MEDIUM   | 3-4h | See section below                                                  | See section below                                                  |

**Total:** 5 files, 5,637 lines → Refactor to **~35 organized files**

---

## 🗓️ Recommended Schedule

### Option A: "Refactor Sprint" (Recommended)

**Stop feature development for 3 days, focus only on refactoring.**

#### Day 1 (8 hours) - Foundation

- **Morning (4h):** Refactor `electron/main.ts`
  - Split into IPC modules
  - Extract services
  - Test thoroughly
- **Afternoon (4h):** Refactor `ChatSidebar.tsx`
  - Extract components
  - Create CSS module
  - Extract hooks

#### Day 2 (8 hours) - Biggest Impact

- **Full day:** Refactor `PdfViewer.tsx`
  - Extract toolbar
  - Extract hooks (zoom, keyboard, state)
  - Create CSS module
  - Test all features

#### Day 3 (6 hours) - Finish Strong

- **Morning (3h):** Refactor `App.tsx`
  - Extract custom hooks
  - Clean up
- **Afternoon (3h):** Refactor `Paywall.tsx` + Create shared `Button` component
  - Extract payment logic
  - Create reusable components

**Outcome:** Codebase is 3x more maintainable, ready for Phase 2

---

### Option B: "Incremental" (If you can't stop feature work)

**Refactor 1 file per day over 5 days**

- **Day 1:** electron/main.ts (4-6h)
- **Day 2:** ChatSidebar.tsx (6-8h)
- **Day 3:** PdfViewer.tsx (6-8h) - Split into 2 days if needed
- **Day 4:** App.tsx (3-4h)
- **Day 5:** Paywall.tsx + Button component (3-4h)

**Warning:** Harder to stay focused, easier to abandon halfway through

---

## 📝 Detailed Refactoring Instructions

### 1. PdfViewer.tsx (1,365 lines) → 17 files

**Priority:** 🔥 MOST CRITICAL
**Time:** 6-8 hours
**Plan:** [REFACTOR_PLAN_PDFVIEWER.md](./REFACTOR_PLAN_PDFVIEWER.md)

**What you'll create:**

```
src/features/pdf-viewer/
  ├── PdfViewer.tsx (180 lines)
  ├── components/
  │   ├── PdfToolbar.tsx
  │   ├── EmptyState.tsx
  │   └── ... (8 components)
  ├── hooks/
  │   ├── usePdfViewerState.ts
  │   ├── useZoom.ts
  │   ├── useKeyboardNav.ts
  │   └── usePageTracking.ts
  └── styles/
      └── pdf-viewer.module.css
```

**Impact:** 87% smaller main file, features are independently modifiable

---

### 2. electron/main.ts (989 lines) → 14 files

**Priority:** 🔥 CRITICAL BLOCKER
**Time:** 4-6 hours
**Plan:** [REFACTOR_PLAN_ELECTRON_MAIN.md](./REFACTOR_PLAN_ELECTRON_MAIN.md)

**What you'll create:**

```
electron/
  ├── main.ts (100 lines)
  ├── ipc/
  │   ├── index.ts
  │   ├── file-handlers.ts
  │   ├── ai-handlers.ts
  │   ├── license-handlers.ts
  │   ├── payment-handlers.ts
  │   ├── oauth-handlers.ts
  │   └── shell-handlers.ts
  ├── services/
  │   ├── WindowManager.ts
  │   ├── StripeModalService.ts
  │   └── OAuthModalService.ts
  └── utils/
      └── device-id.ts
```

**Impact:** 90% smaller main file, each IPC handler is testable

---

### 3. ChatSidebar.tsx (954 lines) → 9 files

**Priority:** 🚨 HIGH
**Time:** 6-8 hours
**Plan:** [REFACTOR_PLAN_CHATSIDEBAR.md](./REFACTOR_PLAN_CHATSIDEBAR.md)

**What you'll create:**

```
src/components/chat/
  ├── ChatSidebar.tsx (120 lines)
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

**Impact:** 87% smaller main file, drag/resize logic isolated

---

### 4. App.tsx (818 lines) → Extract Hooks

**Priority:** ⚠️ MEDIUM
**Time:** 3-4 hours
**No detailed plan yet - High-level strategy:**

**Extract these custom hooks:**

```typescript
// hooks/useSubscription.ts (80 lines)
export function useSubscription(user, session) {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(null);
  // ... subscription check logic
  return { hasActiveSubscription, checkSubscription, loading };
}

// hooks/useChatState.ts (100 lines)
export function useChatState() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  // ... all chat logic + streaming
  return { messages, question, asking, handleAsk, setQuestion };
}

// hooks/useDocumentState.ts (80 lines)
export function useDocumentState() {
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [lastSelection, setLastSelection] = useState(null);
  const [extractResult, setExtractResult] = useState({ loading: false });
  // ... document management logic
  return { currentDocumentId, lastSelection, extractResult /* ... */ };
}
```

**After refactoring:**

```tsx
// App.tsx (300-400 lines)
function App() {
  const { user, session, loading: authLoading, signUp, signIn, signOut } = useAuth();
  const { hasActiveSubscription, checkSubscription } = useSubscription(user, session);
  const { messages, question, asking, handleAsk, setQuestion } = useChatState();
  const { currentDocument, loadDocument, handleRegionSelected } = useDocumentState();

  // Much cleaner!
}
```

**Steps:**

1. Extract useSubscription hook
2. Extract useChatState hook
3. Extract useDocumentState hook
4. Clean up App.tsx

**Commit after each extraction.**

---

### 5. Paywall.tsx (511 lines) + Create Button Component

**Priority:** ⚠️ MEDIUM
**Time:** 3-4 hours
**High-level strategy:**

#### Part A: Extract Payment Logic Hook (1 hour)

```typescript
// hooks/usePayment.ts
export function usePayment(userEmail: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePurchase = async (priceId: string) => {
    // All purchase + polling logic here
  };

  return { loading, error, success, handlePurchase };
}
```

#### Part B: Extract Components (1 hour)

```
src/features/paywall/
  ├── Paywall.tsx (150 lines)
  ├── components/
  │   ├── PricingCard.tsx (100 lines)
  │   ├── FeatureList.tsx (40 lines)
  │   └── PaymentForm.tsx (80 lines)
  ├── hooks/
  │   └── usePayment.ts (100 lines)
  └── styles/
      └── paywall.module.css (all styles)
```

#### Part C: Create Shared Button Component (1 hour)

**This is critical - eliminates 50+ duplicate buttons!**

```typescript
// src/shared/components/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ variant = 'secondary', size = 'md', ...props }: ButtonProps) {
  return <button className={`btn btn--${variant} btn--${size}`} {...props} />;
}
```

```css
/* shared/styles/button.module.css */
.btn {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  cursor: pointer;
}

.btn--secondary {
  background: var(--surface-2);
  color: var(--text-1);
  border: 1px solid var(--stroke-1);
}

.btn--secondary:hover {
  background: var(--surface-3);
}

/* ... more variants */
```

**Then replace 50+ inline button definitions across the codebase with:**

```tsx
<Button variant="secondary" onClick={handleClick}>
  Click me
</Button>
```

**Impact:** Eliminates ~1,500 lines of duplicate code across the codebase!

---

## 🔧 Bonus: Quick Wins (Optional - 2 hours)

After the main refactorings, these quick improvements add value:

### 1. Create Shared Input Component (30 min)

Replace TextField with more variants, eliminate auth form duplication

### 2. Extract SignUp/SignIn Common Logic (1 hour)

Both files have OAuth logic - extract to `useOAuth` hook

### 3. Create Loading/Error Components (30 min)

Reusable loading spinner and error display components

---

## ✅ Success Metrics

After completing all refactorings, you should have:

### Quantitative

- ✅ No file > 400 lines
- ✅ 50+ fewer inline style duplications
- ✅ Main components < 200 lines
- ✅ Hooks < 150 lines each
- ✅ ~35% reduction in total code (eliminating duplication)

### Qualitative

- ✅ Easy to find where to add new features
- ✅ Easy to test individual components
- ✅ Easy to modify toolbar without touching PDF rendering
- ✅ Easy to modify chat without touching resize logic
- ✅ Clear separation of concerns
- ✅ Consistent button styling across app

---

## 💰 ROI Analysis

### Time Investment

- **Refactoring:** 20-25 hours
- **Testing:** 3-4 hours
- **Total:** 25-30 hours (~3-4 work days)

### Time Savings (Conservative Estimate)

- **Phase 2 Feature Development:** 40% faster (saved ~50 hours)
- **Debugging:** 60% faster (saved ~30 hours)
- **Onboarding New Devs:** 80% faster (saved ~20 hours)
- **Total Saved:** ~100 hours over next 3-6 months

### ROI: **4-5x return on investment**

---

## 🚀 Getting Started

### Step 1: Choose Your Schedule

- **Option A (Recommended):** 3-day refactor sprint
- **Option B:** 1 file per day over 5 days

### Step 2: Start with Highest Priority

Open the relevant plan document and follow step-by-step:

1. **[REFACTOR_PLAN_PDFVIEWER.md](./REFACTOR_PLAN_PDFVIEWER.md)** (Most critical)
2. **[REFACTOR_PLAN_ELECTRON_MAIN.md](./REFACTOR_PLAN_ELECTRON_MAIN.md)** (Biggest blocker)
3. **[REFACTOR_PLAN_CHATSIDEBAR.md](./REFACTOR_PLAN_CHATSIDEBAR.md)** (High impact)

### Step 3: Test Thoroughly After Each File

Don't move to the next file until the current one works perfectly.

### Step 4: Create PRs

- One PR per file/feature
- Get reviewed
- Merge before starting next

---

## 📚 Resources

### Refactoring Documents

**AI Agent Specifications** (for AI to execute):

1. [PdfViewer Spec](./REFACTOR_SPEC_PDFVIEWER.md) - Most critical file
2. [Electron Main Spec](./REFACTOR_SPEC_ELECTRON_MAIN.md) - Module extraction
3. [ChatSidebar Spec](./REFACTOR_SPEC_CHATSIDEBAR.md) - Component extraction

**Human Developer Plans** (step-by-step with git commits):

1. [PdfViewer Plan](./REFACTOR_PLAN_PDFVIEWER.md) - Detailed human guide
2. [Electron Main Plan](./REFACTOR_PLAN_ELECTRON_MAIN.md) - Detailed human guide
3. [ChatSidebar Plan](./REFACTOR_PLAN_CHATSIDEBAR.md) - Detailed human guide

**Analysis Documents**:

1. [Updated Code Review](./CODE_REVIEW_UPDATED.md) - Full problem analysis
2. [Original Code Review](./CODE_REVIEW_COMPREHENSIVE.md) - Initial findings

### Git Workflow

```bash
# For each refactor:
git checkout -b refactor/component-name
# ... do the refactor ...
git add .
git commit -m "refactor: descriptive message"
git push origin refactor/component-name
# Create PR, get reviewed, merge
```

---

## 🎯 Final Thoughts

**This refactoring is NOT optional** if you want Phase 2 to succeed.

**Current State:**

- 5 massive files (1,000+ lines each)
- 50+ duplicated button definitions
- Difficult to modify
- Difficult to test
- Difficult to understand

**After Refactoring:**

- 35+ focused files (< 200 lines each)
- Reusable Button component
- Easy to modify
- Easy to test
- Easy to understand

**The code will do the same thing, but it will be:**

- 70% faster to add features
- 90% fewer merge conflicts
- 100% easier to onboard new developers
- Ready for Phase 2 scaling

---

## 📞 Need Help?

If you get stuck on any refactoring:

1. **Check the specific plan document** - They have detailed steps
2. **Look at git commits** - See what changed in each step
3. **Roll back if needed** - `git reset --hard HEAD`
4. **Ask for help** - With specific error messages
5. **Take breaks** - Fresh eyes solve problems faster

---

**Let's clean up this codebase and make it amazing! 🚀**

**Start Date:** \***\*\_\_\*\***
**Target Completion:** \***\*\_\_\*\***
**Actual Completion:** \***\*\_\_\*\***

---

_Remember: You're not changing what the code does, just how it's organized. Test thoroughly, commit frequently, and you'll do great!_ ✨
