# electron/main.ts Refactoring Plan - Junior Dev Guide

**Assigned to:** Junior Developer
**Estimated Time:** 4-6 hours
**Priority:** CRITICAL (Blocks everything else)
**Status:** 🔴 Not Started

---

## 📋 Overview

**Current State:** electron/main.ts is 989 lines - all IPC handlers in one monolithic file.

**Goal:** Split into organized modules with clear responsibilities.

**Success Criteria:**

- ✅ main.ts is < 150 lines (just app lifecycle)
- ✅ Each handler module is focused and testable
- ✅ All IPC handlers still work exactly the same
- ✅ Easy to add new handlers in the future

---

## 🎯 What You're Building

You'll split main.ts into this structure:

```
electron/
  ├── main.ts                      (100 lines - app lifecycle only)
  ├── ipc/
  │   ├── index.ts                 (50 lines - registers all handlers)
  │   ├── file-handlers.ts         (120 lines - file operations)
  │   ├── ai-handlers.ts           (180 lines - AI/Gemini calls)
  │   ├── license-handlers.ts      (150 lines - license management)
  │   ├── payment-handlers.ts      (120 lines - Stripe checkout)
  │   ├── oauth-handlers.ts        (150 lines - OAuth flow)
  │   └── shell-handlers.ts        (100 lines - system operations)
  ├── services/
  │   ├── WindowManager.ts         (80 lines - window creation)
  │   ├── StripeModalService.ts    (120 lines - Stripe modal)
  │   └── OAuthModalService.ts     (150 lines - OAuth modal)
  └── utils/
      ├── device-id.ts             (50 lines - device ID generation)
      └── logger.ts                (80 lines - logging utilities)
```

**Total after refactor:** ~1,400 lines across 14 files (vs 989 in 1 file)
_Note: Slightly more lines because of proper exports/imports, but MUCH more maintainable_

---

## ⚠️ IMPORTANT: Read This First

### Before You Start

1. **Create a new branch:** `git checkout -b refactor/electron-main`
2. **Commit current work:** `git add . && git commit -m "chore: checkpoint before electron refactor"`
3. **Test the app:** Make sure everything works (open PDF, chat, payments, etc.)
4. **Keep dev server running:** Test after each step

### Rules

- ✅ **Test after EVERY step** - Electron changes break easily
- ✅ **Commit after each module** - So you can roll back
- ✅ **Don't change behavior** - IPC handlers should work identically
- ✅ **Copy-paste carefully** - Keep ALL console.log statements
- ❌ **Don't add new features** - Just refactor
- ❌ **Don't change IPC channel names** - Frontend depends on them

### If Something Breaks

1. Check the terminal (main process logs)
2. Check DevTools console (renderer process)
3. Roll back: `git reset --hard HEAD`
4. Try again more carefully

---

## 📝 Step-by-Step Plan

### Step 1: Create Directory Structure (5 minutes)

**Goal:** Set up folders for organized code.

**Actions:**

```bash
# Create directories
mkdir -p electron/ipc
mkdir -p electron/services
mkdir -p electron/utils

# Verify
ls electron/
```

**Commit:**

```bash
git add .
git commit -m "feat: create electron module directory structure"
```

---

### Step 2: Extract Device ID Utility (15 minutes)

**Goal:** Move device ID logic to a utility file (easiest extraction).

#### 2.1: Create the Utility File

**Create:** `electron/utils/device-id.ts`

```typescript
/**
 * Device ID Management
 * Generates and persists a unique device identifier
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

/**
 * Get or generate unique device ID
 * Stored in userData directory for persistence
 */
export function getDeviceId(): string {
  const storageId = path.join(app.getPath('userData'), 'device-id.txt');

  try {
    // Check if device ID already exists
    if (fs.existsSync(storageId)) {
      return fs.readFileSync(storageId, 'utf8').trim();
    }

    // Generate new device ID
    const newId = randomBytes(16).toString('hex');
    fs.writeFileSync(storageId, newId, 'utf8');

    console.log('📱 Generated new device ID:', newId.substring(0, 8) + '...');
    return newId;
  } catch (error) {
    console.error('❌ Failed to get device ID:', error);
    // Fallback to temporary ID
    return randomBytes(16).toString('hex');
  }
}
```

#### 2.2: Use the Utility in main.ts

**In main.ts, find the getDeviceId function (around line 418):**

```typescript
// OLD CODE - DELETE THIS (about 15 lines)
function getDeviceId(): string {
  const storageId = path.join(app.getPath('userData'), 'device-id.txt');
  try {
    const fs = require('fs');
    if (fs.existsSync(storageId)) {
      return fs.readFileSync(storageId, 'utf8').trim();
    }
    const newId = randomBytes(16).toString('hex');
    fs.writeFileSync(storageId, newId, 'utf8');
    return newId;
  } catch (error) {
    console.error('❌ Failed to get device ID:', error);
    return randomBytes(16).toString('hex');
  }
}
```

**Replace with import at top of file:**

```typescript
import { getDeviceId } from './utils/device-id';
```

**Test:**

- Run the app
- Should work exactly the same

**Commit:**

```bash
git add .
git commit -m "refactor: extract device ID utility"
```

---

### Step 3: Extract File Handlers (45 minutes)

**Goal:** Move file-related IPC handlers to dedicated module.

#### 3.1: Create File Handlers Module

**Create:** `electron/ipc/file-handlers.ts`

```typescript
/**
 * File Operation IPC Handlers
 * Handles file reading and file dialog operations
 */

import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile } from 'fs/promises';
import * as path from 'path';

/**
 * Register all file-related IPC handlers
 */
export function registerFileHandlers(): void {
  console.log('📂 Registering file handlers...');

  ipcMain.handle('file:read', handleFileRead);
  ipcMain.handle('dialog:openFile', handleOpenFileDialog);

  console.log('✅ File handlers registered');
}

/**
 * Read a file by path and return its contents as a Buffer
 * Used for reloading PDFs after refresh
 */
async function handleFileRead(_event: any, filePath: string): Promise<any> {
  try {
    console.log('📂 Reading file:', filePath);
    const buffer = await readFile(filePath);
    console.log('✅ File read successfully:', {
      path: filePath,
      size: buffer.length,
    });

    // Return the buffer as Uint8Array (works across IPC)
    return {
      success: true,
      data: new Uint8Array(buffer),
      name: path.basename(filePath),
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Failed to read file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}

/**
 * Open native file dialog to select a PDF
 * Returns file path and file data
 */
async function handleOpenFileDialog(event: any): Promise<any> {
  try {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return { success: false, error: 'No window found' };
    }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    if (!filePath) {
      return { success: false, error: 'No file path selected' };
    }

    console.log('📂 Selected file from dialog:', filePath);

    // Read the file
    const buffer = await readFile(filePath);
    console.log('✅ File read successfully:', {
      path: filePath,
      size: buffer.length,
    });

    return {
      success: true,
      data: new Uint8Array(buffer),
      name: path.basename(filePath),
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Failed to open file dialog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open file',
    };
  }
}
```

#### 3.2: Remove from main.ts and Register

**In main.ts:**

1. **Delete** the file:read and dialog:openFile handlers (lines 60-132)
2. **Add** import at top: `import { registerFileHandlers } from './ipc/file-handlers';`
3. **Call** in `app.whenReady()`:

```typescript
app.whenReady().then(() => {
  createWindow();
  registerFileHandlers(); // Add this line
});
```

**Test:**

- Open the app
- Click "Open Document"
- File dialog should open
- PDF should load

**Commit:**

```bash
git add .
git commit -m "refactor: extract file handlers to separate module"
```

---

### Step 4: Extract AI Handlers (1 hour)

**Goal:** Move AI/Gemini handlers to dedicated module.

#### 4.1: Create AI Handlers Module

**Create:** `electron/ipc/ai-handlers.ts`

```typescript
/**
 * AI Operation IPC Handlers
 * Handles AI queries using Google Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ipcMain } from 'electron';

/**
 * Register all AI-related IPC handlers
 */
export function registerAIHandlers(): void {
  console.log('🤖 Registering AI handlers...');

  ipcMain.handle('ai:ask', handleAIAsk);

  console.log('✅ AI handlers registered');
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  pageNumber?: number;
}

/**
 * Handle AI question with Gemini
 * Supports streaming responses and multimodal (text + images)
 */
async function handleAIAsk(
  event: any,
  args: {
    question: string;
    context: string[];
    pageNumber?: number;
    imageBase64?: string;
    conversationHistory?: ConversationMessage[];
  }
): Promise<any> {
  console.log('🤖 [AI] Received ask request:', {
    question: args?.question?.substring(0, 50) + '...',
    contextLength: args?.context?.length || 0,
    pageNumber: args?.pageNumber,
    hasImage: !!args?.imageBase64,
    imageSize: args?.imageBase64 ? `${Math.round(args.imageBase64.length / 1024)}KB` : 'N/A',
    historyLength: args?.conversationHistory?.length || 0,
  });

  const { question, context, pageNumber, imageBase64, conversationHistory } = args || {
    question: '',
    context: [],
  };

  const apiKey = process.env['VITE_GEMINI_API_KEY'] || process.env['GEMINI_API_KEY'];
  const modelName = process.env['VITE_GEMINI_MODEL'] || 'gemini-1.5-flash';

  console.log('🔑 [AI] API Key available:', !!apiKey);
  console.log('🤖 [AI] Model:', modelName);

  const requestId = `${Date.now()}`;

  if (!apiKey) {
    console.error('❌ [AI] No API key found!');
    event.sender.send('ai:stream-chunk', {
      requestId,
      chunk: 'AI not configured: missing GEMINI_API_KEY.',
      done: true,
      pageNumber,
    });
    return { requestId };
  }

  try {
    console.log('🤖 [AI] Initializing Gemini client...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const mergedContext = (context || []).filter(Boolean).join('\n\n---\n\n');

    // Format conversation history
    const formatHistory = (history?: ConversationMessage[]): string => {
      if (!history || history.length === 0) return '';

      const formatted = history
        .map(msg => {
          const pagePart = msg.pageNumber ? ` (Page ${msg.pageNumber})` : '';
          const role = msg.role === 'user' ? 'Student' : 'Assistant';
          const content =
            msg.role === 'assistant' && msg.content.length > 150
              ? msg.content.substring(0, 150) + '...'
              : msg.content;
          return `${role}${pagePart}: ${content}`;
        })
        .join('\n\n');

      return '\n\n💬 PREVIOUS CONVERSATION:\n---\n' + formatted + '\n---\n';
    };

    const historySection = formatHistory(conversationHistory);

    // Build multimodal content array
    const contentParts: any[] = [];

    // Add image first if available
    if (imageBase64) {
      contentParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      });
      console.log('📸 [AI] Including screenshot in request');
    }

    // Build vision-aware prompt
    const prompt = imageBase64
      ? [
          'You are helping a student understand content from a PDF textbook.',
          historySection,
          '',
          '📸 IMAGE: See the screenshot above showing the selected content from the PDF.',
          '',
          '📝 EXTRACTED TEXT (may be incomplete for equations/diagrams):',
          '---',
          mergedContext || '(no text extracted)',
          '---',
          '',
          `❓ CURRENT STUDENT QUESTION: ${question}`,
          '',
          '📋 INSTRUCTIONS:',
          '- Consider the previous conversation context when answering',
          '- ALWAYS analyze the IMAGE first - what do you see visually?',
          '- Use the extracted text as supplementary context',
          '- For equations: describe what you see in the image AND reference any LaTeX',
          '- For diagrams/graphs: describe the visual elements thoroughly',
          '- For mixed content: explain how visual and textual elements relate',
          '- Explain intuition first, then formal details',
          '- Use LaTeX formatting for mathematical expressions in your answer',
          '- Keep answers clear, thorough, and student-friendly',
        ].join('\n')
      : [
          'You are helping a student understand content from a PDF textbook.',
          'Given the focused selection and nearby context, answer clearly and thoroughly.',
          historySection,
          '',
          'Context from PDF:',
          '---',
          mergedContext || '(no additional context)',
          '---',
          '',
          `Current Question: ${question}`,
          '',
          'Guidelines:',
          '- Consider the previous conversation when answering',
          '- Explain intuition first, then formal details.',
          '- If math is present, include LaTeX for formulas.',
          '- Reference definitions if relevant.',
          '- Keep the answer concise but complete.',
        ].join('\n');

    contentParts.push({ text: prompt });

    console.log('🤖 [AI] Streaming from Gemini...', imageBase64 ? '(with image)' : '(text only)');

    // Use streaming API
    const result = await model.generateContentStream(contentParts);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;

      // Send each chunk to renderer
      event.sender.send('ai:stream-chunk', {
        requestId,
        chunk: chunkText,
        done: false,
        pageNumber,
      });
    }

    console.log('✅ [AI] Streaming complete:', fullText.substring(0, 100) + '...');

    // Send final "done" message
    event.sender.send('ai:stream-chunk', {
      requestId,
      chunk: '',
      done: true,
      pageNumber,
    });

    return { requestId };
  } catch (error: any) {
    console.error('❌ [AI] Error:', error);
    const msg = error?.message || 'Failed to get AI response';
    event.sender.send('ai:stream-chunk', {
      requestId,
      chunk: `Error: ${msg}`,
      done: true,
      pageNumber,
    });
    return { requestId };
  }
}
```

#### 4.2: Extract Region Extraction Handler

**Add to the same file:**

```typescript
/**
 * Extract text/math from PDF region using Python script
 */
import { spawn } from 'child_process';
import * as path from 'path';

// Add this to registerAIHandlers():
export function registerAIHandlers(): void {
  console.log('🤖 Registering AI handlers...');

  ipcMain.handle('ai:ask', handleAIAsk);
  ipcMain.handle('extract:region', handleExtractRegion); // Add this

  console.log('✅ AI handlers registered');
}

async function handleExtractRegion(
  _event: any,
  args: {
    pdfPath: string;
    pageNumber: number;
    bbox: { x: number; y: number; width: number; height: number };
    pythonPath?: string;
  }
): Promise<any> {
  const { pdfPath, pageNumber, bbox, pythonPath } = args;
  const py = pythonPath || 'python3';

  // Get the correct path to the script
  const scriptPath = path.join(__dirname, '../scripts/extract_region.py');

  return await new Promise(resolve => {
    try {
      const proc = spawn(py, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      });

      const payload = JSON.stringify({
        pdf_path: pdfPath,
        page_number: pageNumber,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', d => (stdout += d.toString()));
      proc.stderr.on('data', d => {
        const errMsg = d.toString();
        stderr += errMsg;
        console.log('🐍 Python stderr:', errMsg.trim());
      });

      proc.on('close', _code => {
        try {
          const parsed = JSON.parse(stdout.trim() || '{}');
          console.log('🐍 Python result:', parsed);

          if (parsed && parsed.ok) {
            resolve({
              success: true,
              text: parsed.text || '',
              latex: parsed.latex || '',
              source: parsed.source || 'unknown',
            });
          } else {
            console.error('❌ Python extraction failed:', parsed.error || stderr);
            resolve({ success: false, error: parsed.error || stderr || 'Extraction failed' });
          }
        } catch (e: any) {
          console.error(
            '❌ Failed to parse Python output:',
            e,
            'stdout:',
            stdout,
            'stderr:',
            stderr
          );
          resolve({ success: false, error: e?.message || stderr || 'Invalid extractor output' });
        }
      });

      proc.stdin.write(payload);
      proc.stdin.end();
    } catch (error: any) {
      console.error('❌ Failed to spawn Python process:', error);
      resolve({ success: false, error: error?.message || 'Extractor invocation error' });
    }
  });
}
```

#### 4.3: Register in main.ts

**In main.ts:**

1. **Delete** ai:ask and extract:region handlers (lines 230-410)
2. **Add** import: `import { registerAIHandlers } from './ipc/ai-handlers';`
3. **Call** in app.whenReady():

```typescript
app.whenReady().then(() => {
  createWindow();
  registerFileHandlers();
  registerAIHandlers(); // Add this
});
```

**Test:**

- Select text in PDF
- Ask AI a question
- Response should stream back

**Commit:**

```bash
git add .
git commit -m "refactor: extract AI handlers to separate module"
```

---

### Step 5: Extract License Handlers (45 minutes)

**Goal:** Move license management to dedicated module.

#### 5.1: Create License Handlers Module

**Create:** `electron/ipc/license-handlers.ts`

```typescript
/**
 * License Management IPC Handlers
 * Handles license verification, activation, and storage
 */

import { app, ipcMain } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { getDeviceId } from '../utils/device-id';

// License storage path
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');

// Backend API URL
const BACKEND_API_URL = process.env['BACKEND_API_URL'] || 'http://localhost:3001';

/**
 * Register all license-related IPC handlers
 */
export function registerLicenseHandlers(): void {
  console.log('🔑 Registering license handlers...');

  ipcMain.handle('license:verify', handleVerifyLicense);
  ipcMain.handle('license:get-by-email', handleGetLicenseByEmail);
  ipcMain.handle('license:activate', handleActivateLicense);
  ipcMain.handle('license:get-stored', handleGetStoredLicense);
  ipcMain.handle('license:store', handleStoreLicense);
  ipcMain.handle('license:clear', handleClearLicense);

  console.log('✅ License handlers registered');
}

/**
 * Verify license key with backend
 */
async function handleVerifyLicense(_event: any, licenseKey: string): Promise<any> {
  try {
    console.log('🔑 Verifying license...');
    const response = await fetch(`${BACKEND_API_URL}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });

    const data = await response.json();
    console.log('✅ License verification result:', data.valid);
    return data;
  } catch (error: any) {
    console.error('❌ License verification failed:', error);
    return {
      valid: false,
      error: error?.message || 'Failed to verify license',
    };
  }
}

/**
 * Get license by email (for auto-activation after payment)
 */
async function handleGetLicenseByEmail(_event: any, email: string): Promise<any> {
  try {
    console.log('🔍 Fetching license for email:', email);
    const response = await fetch(
      `${BACKEND_API_URL}/api/license/by-email/${encodeURIComponent(email)}`
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Found license:', data.licenseKey);
    } else {
      console.log('❌ No license found');
    }

    return data;
  } catch (error: any) {
    console.error('❌ Failed to fetch license:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch license',
    };
  }
}

/**
 * Activate license for this device
 */
async function handleActivateLicense(
  _event: any,
  args: { licenseKey: string; email: string }
): Promise<any> {
  try {
    const { licenseKey, email } = args;
    const deviceId = getDeviceId();

    console.log('🔑 Activating license...', { email, deviceId: deviceId.substring(0, 8) });

    const response = await fetch(`${BACKEND_API_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, email, deviceId }),
    });

    const data = await response.json();

    if (data.success) {
      // Store license locally
      await writeFile(LICENSE_FILE, JSON.stringify({ licenseKey, email }), 'utf8');
      console.log('✅ License activated and stored locally');
    }

    return data;
  } catch (error: any) {
    console.error('❌ License activation failed:', error);
    return {
      success: false,
      error: error?.message || 'Failed to activate license',
    };
  }
}

/**
 * Get stored license from local storage
 */
async function handleGetStoredLicense(): Promise<any> {
  try {
    const data = await readFile(LICENSE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid
    return null;
  }
}

/**
 * Store license locally
 */
async function handleStoreLicense(
  _event: any,
  args: { licenseKey: string; email: string }
): Promise<void> {
  try {
    await writeFile(LICENSE_FILE, JSON.stringify(args), 'utf8');
    console.log('✅ License stored locally');
  } catch (error) {
    console.error('❌ Failed to store license:', error);
    throw error;
  }
}

/**
 * Clear stored license
 */
async function handleClearLicense(): Promise<void> {
  try {
    const fs = require('fs');
    if (fs.existsSync(LICENSE_FILE)) {
      fs.unlinkSync(LICENSE_FILE);
      console.log('✅ License cleared');
    }
  } catch (error) {
    console.error('❌ Failed to clear license:', error);
  }
}
```

#### 5.2: Register in main.ts

**In main.ts:**

1. **Delete** all license handlers (lines 437-559)
2. **Add** import: `import { registerLicenseHandlers } from './ipc/license-handlers';`
3. **Call** in app.whenReady():

```typescript
app.whenReady().then(() => {
  createWindow();
  registerFileHandlers();
  registerAIHandlers();
  registerLicenseHandlers(); // Add this
});
```

**Test:**

- License activation should work
- Check if license is stored

**Commit:**

```bash
git add .
git commit -m "refactor: extract license handlers to separate module"
```

---

### Step 6: Extract Remaining Handlers (1 hour)

I'll provide the structure for the remaining handlers. Follow the same pattern:

#### Payment Handlers

**Create:** `electron/ipc/payment-handlers.ts`

- `handleCreateCheckout`
- Import `StripeModalService` (create in next step)

#### OAuth Handlers

**Create:** `electron/ipc/oauth-handlers.ts`

- `handleOpenOAuthModal`
- Import `OAuthModalService` (create in next step)

#### Shell Handlers

**Create:** `electron/ipc/shell-handlers.ts`

- `handleOpenExternal`
- `handleShowItemInFolder`
- `handleSendViaMessages`
- `handleShareItem`

**Each follows the same pattern as above. I can provide full code if needed.**

---

### Step 7: Create IPC Registry (30 minutes)

**Create:** `electron/ipc/index.ts`

```typescript
/**
 * IPC Handlers Registry
 * Central place to register all IPC handlers
 */

import { registerAIHandlers } from './ai-handlers';
import { registerFileHandlers } from './file-handlers';
import { registerLicenseHandlers } from './license-handlers';
import { registerOAuthHandlers } from './oauth-handlers';
import { registerPaymentHandlers } from './payment-handlers';
import { registerShellHandlers } from './shell-handlers';

/**
 * Register all IPC handlers
 * Call this once when app is ready
 */
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

### Step 8: Clean Up main.ts (30 minutes)

**Your new main.ts should look like this (~100 lines):**

```typescript
// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerAllHandlers } from './ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log loaded environment variables
console.log('🔐 Environment loaded:', {
  hasGeminiKey: !!process.env['VITE_GEMINI_API_KEY'] || !!process.env['GEMINI_API_KEY'],
  hasMathPixId: !!process.env['MATHPIX_APP_ID'],
  hasMathPixKey: !!process.env['MATHPIX_APP_KEY'],
  hasBackendUrl: !!process.env['BACKEND_API_URL'],
});

/**
 * Create main application window
 */
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env['VITE_DEV_SERVER_URL'];

  if (devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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

**That's it! Clean, focused, maintainable.**

---

## ✅ Final Verification

- [ ] App compiles without errors
- [ ] All IPC handlers still work
- [ ] File operations work
- [ ] AI queries work
- [ ] License management works
- [ ] Payments work
- [ ] OAuth works
- [ ] Shell operations work
- [ ] main.ts is under 150 lines
- [ ] No duplicate code

**Commit:**

```bash
git add .
git commit -m "refactor: complete electron/main.ts refactoring - clean architecture"
git push origin refactor/electron-main
```

---

## 📊 Before vs After

### Before

- 1 file: 989 lines
- All handlers mixed together
- Hard to test
- Hard to modify

### After

- 14 files: ~1,400 lines total
- main.ts: 100 lines (app lifecycle only)
- Each handler in focused module
- Easy to test each module
- Easy to add new handlers

---

**You did it! Now the codebase is ready for Phase 2! 🚀**
