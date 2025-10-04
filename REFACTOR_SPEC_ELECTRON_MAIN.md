# electron/main.ts Refactoring Specification (AI Agent)

**Type:** IPC Handler Modularization
**File:** `electron/main.ts` (989 lines)
**Target:** 14 organized modules (~100-150 lines each)
**Priority:** Critical Blocker

---

## Objective

Split monolithic main.ts into organized IPC handler modules, services, and utilities while preserving all functionality and maintaining type safety.

---

## Constraints

1. **Zero Behavior Change**: All IPC handlers must work identically
2. **Type Safety**: Strict TypeScript, proper event typing
3. **Environment Variables**: Preserve all dotenv config
4. **Logging**: Keep all console.log statements
5. **Error Handling**: Preserve all try-catch blocks
6. **No Dependency Changes**: Use only existing packages

---

## Target Architecture

```
electron/
  ├── main.ts                      (~100 lines - app lifecycle only)
  ├── ipc/
  │   ├── index.ts                 (~50 lines - registry)
  │   ├── file-handlers.ts         (~120 lines)
  │   ├── ai-handlers.ts           (~180 lines)
  │   ├── license-handlers.ts      (~150 lines)
  │   ├── payment-handlers.ts      (~120 lines)
  │   ├── oauth-handlers.ts        (~150 lines)
  │   └── shell-handlers.ts        (~100 lines)
  ├── services/
  │   ├── WindowManager.ts         (~80 lines)
  │   ├── StripeModalService.ts    (~120 lines)
  │   └── OAuthModalService.ts     (~150 lines)
  └── utils/
      ├── device-id.ts             (~50 lines)
      └── constants.ts             (~30 lines)
```

---

## Module 1: device-id.ts Utility

**Path**: `electron/utils/device-id.ts`

**Purpose**: Generate and persist unique device identifier

**Interface**:

```typescript
export function getDeviceId(): string;
```

**Implementation Requirements**:

- Use `app.getPath('userData')` for storage location
- Store in `device-id.txt`
- Generate 16-byte hex string using `randomBytes`
- Check if exists before generating
- Return existing ID if found
- Fallback to temporary ID on error
- Log device ID generation (first 8 chars only for privacy)

**Imports**:

```typescript
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
```

**Extract From**: Lines ~418-432 in main.ts

---

## Module 2: constants.ts Utility

**Path**: `electron/utils/constants.ts`

**Purpose**: Centralize configuration constants

**Exports**:

```typescript
export const BACKEND_API_URL: string;
export const LICENSE_FILE: string;
```

**Implementation**:

```typescript
import { app } from 'electron';
import * as path from 'path';

export const BACKEND_API_URL = process.env['BACKEND_API_URL'] || 'http://localhost:3001';
export const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');
```

---

## Module 3: file-handlers.ts

**Path**: `electron/ipc/file-handlers.ts`

**Purpose**: Handle file reading and file dialog operations

**Registration Function**:

```typescript
export function registerFileHandlers(): void;
```

**IPC Handlers**:

1. `file:read` - Read file by path, return Uint8Array
2. `dialog:openFile` - Show open dialog, read selected PDF

**Handler Signatures**:

```typescript
async function handleFileRead(
  _event: any,
  filePath: string
): Promise<{
  success: boolean;
  data?: Uint8Array;
  name?: string;
  path?: string;
  error?: string;
}>;

async function handleOpenFileDialog(event: any): Promise<{
  success: boolean;
  data?: Uint8Array;
  name?: string;
  path?: string;
  canceled?: boolean;
  error?: string;
}>;
```

**Requirements**:

- Use `readFile` from 'fs/promises'
- Use `dialog.showOpenDialog` with PDF filter: `[{ name: 'PDF Files', extensions: ['pdf'] }]`
- Get window from `BrowserWindow.fromWebContents(event.sender)`
- Return Uint8Array for cross-IPC compatibility
- Include path.basename for filename
- Preserve all console.log statements
- Preserve exact error messages

**Extract From**: Lines ~60-132 in main.ts

---

## Module 4: ai-handlers.ts

**Path**: `electron/ipc/ai-handlers.ts`

**Purpose**: Handle AI queries and region extraction

**Registration Function**:

```typescript
export function registerAIHandlers(): void;
```

**IPC Handlers**:

1. `ai:ask` - Send question to Gemini with streaming response
2. `extract:region` - Extract text/LaTeX from PDF region via Python

**Interfaces**:

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  pageNumber?: number;
}

interface AIAskArgs {
  question: string;
  context: string[];
  pageNumber?: number;
  imageBase64?: string;
  conversationHistory?: ConversationMessage[];
}
```

**ai:ask Requirements**:

- Use `GoogleGenerativeAI` from '@google/generative-ai'
- Get API key from env: `process.env['VITE_GEMINI_API_KEY'] || process.env['GEMINI_API_KEY']`
- Model: `process.env['VITE_GEMINI_MODEL'] || 'gemini-1.5-flash'`
- Stream responses via `event.sender.send('ai:stream-chunk', { requestId, chunk, done, pageNumber })`
- Support multimodal (text + image) requests
- Format conversation history (truncate old responses to 150 chars)
- Build vision-aware prompts when image provided
- Return `{ requestId }` immediately
- Preserve all prompt formatting exactly

**extract:region Requirements**:

- Spawn Python process: `spawn('python3', [scriptPath])`
- Script path: `path.join(__dirname, '../scripts/extract_region.py')`
- Pass environment variables to child process
- Send JSON payload via stdin: `{ pdf_path, page_number, x, y, width, height }`
- Parse stdout as JSON response
- Handle stderr logging
- Return: `{ success, text?, latex?, source?, error? }`

**Extract From**: Lines ~230-410 in main.ts

---

## Module 5: license-handlers.ts

**Path**: `electron/ipc/license-handlers.ts`

**Purpose**: Manage license verification, activation, and storage

**Registration Function**:

```typescript
export function registerLicenseHandlers(): void;
```

**IPC Handlers**:

1. `license:verify` - Verify license key with backend
2. `license:get-by-email` - Fetch license by email
3. `license:activate` - Activate license for device
4. `license:get-stored` - Get locally stored license
5. `license:store` - Store license locally
6. `license:clear` - Delete stored license

**Requirements**:

- Import constants: `BACKEND_API_URL`, `LICENSE_FILE`
- Import utility: `getDeviceId`
- Use fetch for API calls
- Store license as JSON: `{ licenseKey, email }`
- All API endpoints: `${BACKEND_API_URL}/api/license/*`
- Preserve exact error handling and logging
- Use fs.existsSync for file checks (sync is OK here)

**API Endpoints**:

- POST `/api/license/verify` - body: `{ licenseKey }`
- GET `/api/license/by-email/:email`
- POST `/api/license/activate` - body: `{ licenseKey, email, deviceId }`

**Extract From**: Lines ~437-559 in main.ts

---

## Module 6: payment-handlers.ts

**Path**: `electron/ipc/payment-handlers.ts`

**Purpose**: Handle Stripe checkout creation

**Registration Function**:

```typescript
export function registerPaymentHandlers(): void;
```

**IPC Handlers**:

1. `license:create-checkout` - Create Stripe checkout session and open modal

**Handler Interface**:

```typescript
async function handleCreateCheckout(
  event: any,
  args: { priceId: string; email: string }
): Promise<{
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}>;
```

**Requirements**:

- Import `openStripeCheckoutModal` from services
- POST to `${BACKEND_API_URL}/api/checkout`
- Body: `{ priceId, email, successUrl: 'pdfaireader://payment-success', cancelUrl: 'pdfaireader://payment-cancel' }`
- Get parent window: `BrowserWindow.fromWebContents(event.sender)`
- Open modal if checkout URL returned
- Preserve error handling

**Extract From**: Lines ~564-600 in main.ts

---

## Module 7: oauth-handlers.ts

**Path**: `electron/ipc/oauth-handlers.ts`

**Purpose**: Handle OAuth modal for Apple/Google sign-in

**Registration Function**:

```typescript
export function registerOAuthHandlers(): void;
```

**IPC Handlers**:

1. `system:open-oauth-modal` - Open OAuth flow in modal window

**Handler Interface**:

```typescript
async function handleOpenOAuthModal(event: any, authUrl: string): Promise<void>;
```

**Requirements**:

- Import `openOAuthModal` from services
- Get parent window: `BrowserWindow.fromWebContents(event.sender)`
- Pass authUrl to modal service
- No return value needed (modal handles callbacks)

**Extract From**: Lines ~668-770 in main.ts

---

## Module 8: shell-handlers.ts

**Path**: `electron/ipc/shell-handlers.ts`

**Purpose**: Handle system operations (open URLs, share files, etc.)

**Registration Function**:

```typescript
export function registerShellHandlers(): void;
```

**IPC Handlers**:

1. `system:open-external` - Open URL in default browser
2. `shell:show-item-in-folder` - Show file in Finder/Explorer
3. `shell:send-via-messages` - Send file via Messages app (macOS only)
4. `shell:share-item` - Open native share sheet (macOS)

**Requirements**:

- Use `shell` from 'electron'
- Use `exec` from 'child_process' for AppleScript
- Platform check: `process.platform === 'darwin'`
- Preserve all AppleScript exactly
- Escape paths properly for AppleScript
- Return `{ success, fallback?, error? }`
- Preserve exact error messages and fallback behavior

**Extract From**: Lines ~657-924 in main.ts

---

## Module 9: StripeModalService.ts

**Path**: `electron/services/StripeModalService.ts`

**Purpose**: Create and manage Stripe checkout modal

**Export**:

```typescript
export function openStripeCheckoutModal(checkoutUrl: string, parent: BrowserWindow | null): void;
```

**Requirements**:

- Create modal BrowserWindow (500x700, modal: true)
- Load checkoutUrl
- Listen for navigation to `pdfaireader://` URLs
- Detect success/cancel from URL
- Send `checkout-complete` event to parent
- Handle external links in default browser
- Close modal on payment completion
- Preserve all timing and event handling

**Extract From**: Lines ~605-652 in main.ts

---

## Module 10: OAuthModalService.ts

**Path**: `electron/services/OAuthModalService.ts`

**Purpose**: Create and manage OAuth modal

**Export**:

```typescript
export function openOAuthModal(authUrl: string, parent: BrowserWindow | null): void;
```

**Requirements**:

- Create modal BrowserWindow (500x700, modal: true)
- Load authUrl
- Listen for Supabase callback URL: `*.supabase.co/auth/v1/callback`
- Extract tokens from URL hash/query
- Send `oauth-callback` event to parent with URL
- Close modal after callback
- 30-second failsafe timeout
- Prevent navigation to localhost
- Track callback handled state
- Handle external links in default browser
- Preserve all timing and state management

**Extract From**: Lines ~668-770 in main.ts

---

## Module 11: WindowManager.ts

**Path**: `electron/services/WindowManager.ts`

**Purpose**: Centralize window creation

**Export**:

```typescript
export function createWindow(): void;
```

**Requirements**:

- Create BrowserWindow with exact config from main.ts
- Dimensions: 1200x800
- Preload: `path.join(__dirname, 'preload.js')`
- contextIsolation: true
- nodeIntegration: false
- Load dev server URL if `process.env['VITE_DEV_SERVER_URL']` exists
- Open DevTools in dev mode
- Load built index.html in production

**Extract From**: Lines ~31-50 in main.ts

---

## Module 12: ipc/index.ts

**Path**: `electron/ipc/index.ts`

**Purpose**: Central IPC handler registry

**Export**:

```typescript
export function registerAllHandlers(): void;
```

**Implementation**:

```typescript
import { registerAIHandlers } from './ai-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerLicenseHandlers } from './license-handlers';
import { registerOAuthHandlers } from './oauth-handlers';
import { registerPaymentHandlers } from './payment-handlers';
import { registerShellHandlers } from './shell-handlers';

export function registerAllHandlers(): void {
  console.log('📡 Registering all IPC handlers...');

  registerFileHandlers();
  registerAIHandlers();
  registerLicenseHandlers();
  registerPaymentHandlers();
  registerOAuthHandlers();
  registerShellHandlers();

  console.log('✅ All IPC handlers registered successfully');
}
```

---

## Module 13: Refactored main.ts

**Path**: `electron/main.ts`

**Purpose**: App lifecycle management only

**Target Structure**:

```typescript
// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { app } from 'electron';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerAllHandlers } from './ipc';
import { createWindow } from './services/WindowManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log loaded environment variables
console.log('🔐 Environment loaded:', {
  hasGeminiKey: !!process.env['VITE_GEMINI_API_KEY'] || !!process.env['GEMINI_API_KEY'],
  hasMathPixId: !!process.env['MATHPIX_APP_ID'],
  hasMathPixKey: !!process.env['MATHPIX_APP_KEY'],
  hasBackendUrl: !!process.env['BACKEND_API_URL'],
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  registerAllHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**Target Size**: ~50 lines

---

## Verification Checklist

### Functional Requirements

- [ ] App launches successfully
- [ ] DevTools open in development
- [ ] File dialog opens and loads PDFs
- [ ] PDF reading works (file:read handler)
- [ ] AI chat works with streaming
- [ ] Region extraction works (Python script)
- [ ] License verification works
- [ ] License activation works
- [ ] Stripe checkout modal opens
- [ ] OAuth modal opens and returns tokens
- [ ] External links open in browser
- [ ] Show in folder works
- [ ] Share functions work (macOS)
- [ ] Messages integration works (macOS)

### Code Quality

- [ ] No TypeScript errors
- [ ] All imports resolve correctly
- [ ] main.ts < 100 lines
- [ ] All handler modules < 180 lines
- [ ] No duplicate code
- [ ] All console.log preserved
- [ ] All error handling preserved

### Type Safety

- [ ] Event parameters properly typed
- [ ] Return types explicitly defined
- [ ] No implicit any
- [ ] IPC handler types match renderer expectations

---

## Import Guidelines

### Handler Modules

```typescript
import { ipcMain, BrowserWindow, dialog } from 'electron';
import { BACKEND_API_URL, LICENSE_FILE } from '../utils/constants';
import { getDeviceId } from '../utils/device-id';
```

### Service Modules

```typescript
import { BrowserWindow, shell } from 'electron';
```

### Main.ts

```typescript
import { registerAllHandlers } from './ipc';
import { createWindow } from './services/WindowManager';
```

---

## Success Criteria

**Must achieve ALL:**

1. ✅ App compiles and runs without errors
2. ✅ main.ts < 100 lines
3. ✅ All IPC handlers work identically
4. ✅ All 14 modules created in correct locations
5. ✅ Type safety maintained throughout
6. ✅ All environment variables still work
7. ✅ All logging preserved
8. ✅ No behavior changes

---

## Error Prevention

**Critical Requirements**:

1. Preserve exact IPC channel names - renderer depends on them
2. Preserve exact response formats - renderer expects specific fields
3. Keep all environment variable checks
4. Keep all console.log statements for debugging
5. Preserve all AppleScript exactly (whitespace matters)
6. Preserve streaming logic for AI responses
7. Keep modal close timing and failsafes
8. Maintain Python script path resolution
9. Keep all error message text identical

**Common Mistakes**:

- Changing IPC channel names
- Modifying response object shapes
- Removing console.log statements
- Optimizing logic prematurely
- Changing error messages
- Breaking modal window lifecycle

---

**This is module extraction, not rewriting. Copy logic exactly as-is into organized modules.**
