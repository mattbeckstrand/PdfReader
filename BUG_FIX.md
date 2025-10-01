# 🐛 Bug Fix: PDF Worker Destroyed During Page Navigation

## The Problem

Error: `TypeError: Cannot read properties of null (reading 'sendWithPromise')`

**What was happening:**

1. User loads PDF and views page 1 ✅
2. User clicks "Next" to go to page 2 ✅
3. The cleanup `useEffect` runs because `currentPageObject` changed ❌
4. The cleanup **destroys the entire PDF document** ❌
5. User tries to view page 3, but the document is gone ❌
6. Error: Cannot read properties of null

## The Root Cause

### Issue #1: Cleanup Running on Every Page Change

```typescript
// ❌ BAD: This ran every time page changed!
useEffect(() => {
  return () => {
    if (currentPageObject) {
      currentPageObject.cleanup();
    }
    if (pdfDocument) {
      pdfDocument.destroy(); // ← DESTROYING WHILE STILL IN USE!
    }
  };
}, [currentPageObject, pdfDocument]); // ← These dependencies caused re-runs
```

Every time `currentPageObject` or `pdfDocument` changed, React would:

1. Run the cleanup function (destroying the PDF)
2. Run the effect again
3. But now the PDF is destroyed, so next page load fails

### Issue #2: Premature Page Cleanup

```typescript
// ❌ BAD: Cleaning up page before render completes
const loadPage = async pageNum => {
  if (currentPageObject) {
    currentPageObject.cleanup(); // ← Interfering with rendering
  }
  const page = await pdfDocument.getPage(pageNum);
  // ... render page
};
```

### Issue #3: Stale Closures in loadPage

```typescript
// ❌ BAD: Function recreated on every page change
const loadPage = useCallback(
  async pageNum => {
    /* ... */
  },
  [pdfDocument, currentPageObject, extractPageText] // ← currentPageObject causes recreations
);
```

## The Fix

### Fix #1: Cleanup Only on Unmount

```typescript
// ✅ GOOD: Only runs when component unmounts
const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
const currentPageRef = useRef<PDFPageProxy | null>(null);

useEffect(() => {
  return () => {
    // Only runs when component unmounts
    if (currentPageRef.current) {
      currentPageRef.current.cleanup();
    }
    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy();
    }
  };
}, []); // ← Empty deps = only on unmount
```

**Why refs?** Because we need the **latest** values when the cleanup runs, not the initial values.

### Fix #2: Remove Premature Cleanup

```typescript
// ✅ GOOD: No cleanup during page load
const loadPage = async pageNum => {
  const page = await pdfDocument.getPage(pageNum);
  setCurrentPageObject(page);
  currentPageRef.current = page; // Track for unmount cleanup
  // ... render page
};
```

### Fix #3: Stable loadPage Function

```typescript
// ✅ GOOD: Only recreates when pdfDocument or extractPageText changes
const loadPage = useCallback(
  async pageNum => {
    /* ... */
  },
  [pdfDocument, extractPageText] // ← Removed currentPageObject
);
```

## Testing

After this fix:

1. ✅ Load PDF - should work
2. ✅ View page 1 - should render
3. ✅ View page 2 - should render
4. ✅ View page 3 - should render
5. ✅ Navigate back and forth - should work
6. ✅ No "sendWithPromise" errors

## Key Lessons

1. **Be careful with cleanup effects** - They run more often than you think
2. **Use refs for cleanup** - Capture latest values, not initial values
3. **Empty deps for unmount-only** - `[]` means "only on unmount"
4. **Don't cleanup too early** - Let operations complete before cleanup
5. **Minimize useCallback deps** - Avoid dependencies that change frequently

## Files Changed

- `src/hooks/usePdfDocument.tsx`:
  - Added `pdfDocumentRef` and `currentPageRef`
  - Changed cleanup effect to have empty dependencies
  - Removed premature page cleanup in `loadPage`
  - Updated refs whenever state updates
  - Removed `currentPageObject` from `loadPage` dependencies

---

**Now test it again!** The PDF should load and navigate properly. 🎉
