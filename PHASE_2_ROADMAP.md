# Phase 2: Organization Features - Implementation Roadmap

## 🎯 Overview

Phase 2 adds powerful organization features to make your library truly useful with many documents.

---

## ✨ Features to Implement

### 1. Collections/Folders ⭐ HIGH PRIORITY

**What it does:**

- Group related documents together
- Create collections like "Machine Learning", "Novels", "Research Papers"
- View documents by collection
- One document can be in multiple collections

**UI Components:**

```
LibraryView.tsx
├── Sidebar (new!)
│   ├── All Documents
│   ├── Favorites
│   └── Collections
│       ├── + Create Collection
│       ├── 📚 Machine Learning (7 docs)
│       ├── 📖 Novels (12 docs)
│       └── 🔬 Research (5 docs)
└── Main Grid (filters by selected collection)
```

**Implementation Steps:**

1. Create `CollectionSidebar` component
2. Add "Create Collection" modal
3. Add "Add to Collection" button on document cards
4. Filter documents by selected collection
5. Show document count per collection

---

### 2. Tags System 🏷️

**What it does:**

- Add multiple tags per document
- Filter by tags
- Auto-suggest existing tags
- Visual tag chips on documents

**UI:**

```
Document Card
├── Thumbnail
├── Title
├── Tags: [machine-learning] [python] [tutorial]
└── Progress Bar
```

**Features:**

- Click tag to filter by that tag
- Multi-tag filter (AND/OR logic)
- Tag autocomplete when adding
- Tag management (rename, delete, merge)

**Implementation:**

1. Add tag input to document cards
2. Create tag filter dropdown
3. Tag chip component
4. Tag autocomplete logic
5. Tag management UI

---

### 3. Favorites ⭐

**What it does:**

- Mark important documents as favorites
- Quick filter to see only favorites
- Star icon on cards
- Favorites section in sidebar

**UI:**

```
Document Card (top-right corner)
└── ⭐ (click to toggle)

Sidebar
├── ⭐ Favorites (5)
└── Collections...
```

**Already Partially Implemented:**

- Type: `isFavorite: boolean` ✅
- Hook: `toggleFavorite()` ✅
- Need: UI integration

**Implementation:**

1. Add star button to document cards
2. Add favorites filter in sidebar
3. Add favorites section to library view
4. Visual indicator (filled vs outline star)

---

### 4. Color Coding 🎨

**What it does:**

- Assign colors to documents
- Visual organization at a glance
- Color collections
- Color-based filtering

**UI:**

```
Document Card
└── Colored left border

Collection Item
└── Colored dot before name
```

**Color Palette:**

- Red (#ef4444): Urgent/Important
- Blue (#3b82f6): In Progress
- Green (#10b981): Completed
- Yellow (#f59e0b): Reference
- Purple (#8b5cf6): Research
- Gray (#6b7280): Archive

**Implementation:**

1. Color picker component
2. Add color indicator to cards
3. Color filter in sidebar
4. Apply to collections too

---

### 5. Document Actions Menu 🔧

**What it does:**

- Right-click or three-dot menu on cards
- Common actions: Open, Favorite, Add to Collection, Delete, Rename

**UI:**

```
Document Card (hover)
└── ⋮ (three dots)
    ├── Open
    ├── ⭐ Add to Favorites
    ├── 📁 Add to Collection
    ├── ✏️ Rename
    ├── 🎨 Set Color
    ├── 🏷️ Edit Tags
    └── 🗑️ Delete
```

**Implementation:**

1. Dropdown menu component
2. Context menu on right-click
3. Wire up actions to useLibrary hooks
4. Confirmation dialogs for destructive actions

---

## 🎨 Updated UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Library    📖 Reader                    🔍 Search...         │
├──────────┬──────────────────────────────────────────────────────┤
│          │  Recently Opened                                     │
│  📁 ALL  │  ┌──────┐ ┌──────┐ ┌──────┐                         │
│  24 docs │  │ ML   │ │ DL   │ │ NLP  │  →                      │
│          │  └──────┘ └──────┘ └──────┘                         │
│  ⭐ FAV  │                                                       │
│  5 docs  │  Collections                                         │
│          │  ┌─────────────────────────────────────────┐        │
│ COLLECT. │  │ 🔵 Machine Learning (7)                 │        │
│          │  ├─────────────────────────────────────────┤        │
│ 🔵 ML    │  │ 🟢 Novels (12)                          │        │
│ 7 docs   │  ├─────────────────────────────────────────┤        │
│          │  │ 🔴 Research Papers (5)                  │        │
│ 🟢 Novel │  └─────────────────────────────────────────┘        │
│ 12 docs  │                                                       │
│          │  All Documents                          Grid | List  │
│ 🔴 Resea │  ┌──────────┬──────────┬──────────┐                │
│ 5 docs   │  │ [Card 1] │ [Card 2] │ [Card 3] │                │
│          │  │  Title   │  Title   │  Title   │                │
│ + NEW    │  │  Tags    │  Tags    │  Tags    │                │
│          │  │  ████ 47%│  ████ 12%│  ████ 89%│                │
│          │  └──────────┴──────────┴──────────┘                │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Order

### Week 1: Favorites & Collections UI

1. ✅ Add star button to cards
2. ✅ Implement toggleFavorite in UI
3. ✅ Create CollectionSidebar component
4. ✅ Add "Create Collection" flow
5. ✅ Filter by collection

### Week 2: Tags & Actions

1. ✅ Tag input component
2. ✅ Tag chips on cards
3. ✅ Tag filtering
4. ✅ Document actions menu
5. ✅ Rename/delete documents

### Week 3: Polish & Color Coding

1. ✅ Color picker
2. ✅ Color indicators
3. ✅ Animations & transitions
4. ✅ Keyboard shortcuts
5. ✅ Testing & bug fixes

---

## 📝 Component Files to Create

```
src/components/
├── library/
│   ├── CollectionSidebar.tsx      (NEW)
│   ├── CreateCollectionModal.tsx  (NEW)
│   ├── DocumentCard.tsx           (REFACTOR from LibraryView)
│   ├── DocumentActionsMenu.tsx    (NEW)
│   ├── TagInput.tsx               (NEW)
│   ├── TagChip.tsx                (NEW)
│   └── ColorPicker.tsx            (NEW)
```

---

## 🎯 Success Criteria

Phase 2 is complete when:

- [ ] Can create, rename, delete collections
- [ ] Can add/remove documents to/from collections
- [ ] Can filter library by collection
- [ ] Can add/remove tags on documents
- [ ] Can filter by tags (single & multi-tag)
- [ ] Can favorite/unfavorite documents
- [ ] Can filter to show only favorites
- [ ] Can assign colors to documents
- [ ] Can rename documents
- [ ] Can delete documents (with confirmation)
- [ ] All changes persist in localStorage
- [ ] Sidebar shows document counts
- [ ] Empty states for all views

---

## 🚀 Quick Start

Want to implement a feature? Start here:

### Adding Favorites (Easiest)

1. Open `LibraryView.tsx`
2. Import `Star` from lucide-react
3. Add star button to document card render
4. Call `toggleFavorite(doc.id)` on click
5. Add favorites filter in toolbar

### Adding Collections (Medium)

1. Create `CollectionSidebar.tsx`
2. Use `collections` from `useLibrary`
3. Add `createCollection()` function
4. Wire up to LibraryView
5. Add collection filter state

### Adding Tags (Complex)

1. Create `TagInput.tsx` component
2. Add tag management to `useLibrary`
3. Create tag chips for display
4. Add autocomplete logic
5. Wire up tag filtering

---

## 💡 Design Tips

### Sidebar Width

- Fixed: 240px
- Collapsible on small screens
- Smooth slide animation

### Collection Colors

- Use subtle background colors
- Dot indicators before names
- Same color on document cards

### Tags

- Max 3 visible tags on cards
- "+2 more" indicator if more exist
- Hover to see all tags
- Click tag to filter

### Animations

- Fade in/out: 200ms
- Slide: 300ms ease
- Scale on hover: 1.02
- Keep it subtle!

---

## 🎨 Color System

```typescript
const COLLECTION_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#f59e0b',
  green: '#10b981',
  teal: '#14b8a6',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
};
```

---

Ready to build? Start with **favorites** (easiest) or jump straight to **collections** (most impactful)!
