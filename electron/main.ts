// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log loaded environment variables (for debugging)
console.log('🔐 Environment loaded:', {
  hasGeminiKey: !!process.env['VITE_GEMINI_API_KEY'] || !!process.env['GEMINI_API_KEY'],
  hasMathPixId: !!process.env['MATHPIX_APP_ID'],
  hasMathPixKey: !!process.env['MATHPIX_APP_KEY'],
  hasBackendUrl: !!process.env['BACKEND_API_URL'],
});

// Backend API URL
const BACKEND_API_URL = process.env['BACKEND_API_URL'] || 'http://localhost:3001';

// License storage path
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');

function createWindow() {
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
    win.webContents.openDevTools(); // Open dev tools in development
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ============================================================================
// IPC Handlers
// ============================================================================

/**
 * Read a file by path and return its contents as a Buffer
 * Used for reloading PDFs after refresh
 */
ipcMain.handle('file:read', async (_event, filePath: string) => {
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
});

/**
 * Open native file dialog to select a PDF
 * Returns file path and file data
 */
ipcMain.handle('dialog:openFile', async event => {
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
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================================
// Smart Extraction: text first, OCR fallback (invokes Python script)
// ============================================================================

ipcMain.handle(
  'extract:region',
  async (
    _event,
    args: {
      pdfPath: string;
      pageNumber: number;
      bbox: { x: number; y: number; width: number; height: number };
      pythonPath?: string;
    }
  ) => {
    const { pdfPath, pageNumber, bbox, pythonPath } = args;
    const py = pythonPath || 'python3';
    const scriptPath = path.join(__dirname, '../scripts/extract_region.py');

    return await new Promise(resolve => {
      try {
        // Explicitly pass environment variables to Python script
        const proc = spawn(py, [scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env, // Pass all environment variables including MATHPIX keys
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
          // Log stderr in real-time for debugging
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
);

// ============================================================================
// AI: Ask (Gemini)
// ============================================================================

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  pageNumber?: number;
}

ipcMain.handle(
  'ai:ask',
  async (
    event,
    args: {
      question: string;
      context: string[];
      pageNumber?: number;
      imageBase64?: string;
      conversationHistory?: ConversationMessage[];
    }
  ) => {
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
    // Use Flash model (higher free tier limits, faster) - fallback to 1.5 Flash if 2.0 not available
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
            // Truncate old responses to 150 chars to save tokens
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

      // Add image first if available (helps AI see visual context)
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
);

// ============================================================================
// License Management
// ============================================================================

/**
 * Generate unique device ID
 */
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

/**
 * Verify license key with backend
 */
ipcMain.handle('license:verify', async (_event, licenseKey: string) => {
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
});

/**
 * Get license by email (for auto-activation after payment)
 */
ipcMain.handle('license:get-by-email', async (_event, email: string) => {
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
});

/**
 * Activate license for this device
 */
ipcMain.handle('license:activate', async (_event, args: { licenseKey: string; email: string }) => {
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
});

/**
 * Get stored license from local storage
 */
ipcMain.handle('license:get-stored', async () => {
  try {
    const data = await readFile(LICENSE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid
    return null;
  }
});

/**
 * Store license locally
 */
ipcMain.handle('license:store', async (_event, args: { licenseKey: string; email: string }) => {
  try {
    await writeFile(LICENSE_FILE, JSON.stringify(args), 'utf8');
    console.log('✅ License stored locally');
  } catch (error) {
    console.error('❌ Failed to store license:', error);
    throw error;
  }
});

/**
 * Clear stored license
 */
ipcMain.handle('license:clear', async () => {
  try {
    const fs = require('fs');
    if (fs.existsSync(LICENSE_FILE)) {
      fs.unlinkSync(LICENSE_FILE);
      console.log('✅ License cleared');
    }
  } catch (error) {
    console.error('❌ Failed to clear license:', error);
  }
});

/**
 * Create Stripe checkout session
 */
ipcMain.handle(
  'license:create-checkout',
  async (event, args: { priceId: string; email: string }) => {
    try {
      const { priceId, email } = args;

      console.log('💳 Creating checkout session...', { priceId, email });

      const response = await fetch(`${BACKEND_API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          email,
          successUrl: 'pdfaireader://payment-success',
          cancelUrl: 'pdfaireader://payment-cancel',
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Open checkout in modal window instead of browser
        const parentWindow = BrowserWindow.fromWebContents(event.sender);
        openStripeCheckoutModal(data.checkoutUrl, parentWindow);
      }

      return data;
    } catch (error: any) {
      console.error('❌ Checkout creation failed:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create checkout',
      };
    }
  }
);

/**
 * Open Stripe checkout in a modal window
 */
function openStripeCheckoutModal(checkoutUrl: string, parent: BrowserWindow | null) {
  const modalWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: parent || undefined,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Complete Your Purchase',
    backgroundColor: '#ffffff',
  });

  modalWindow.loadURL(checkoutUrl);

  modalWindow.once('ready-to-show', () => {
    modalWindow.show();
  });

  // Close modal when user completes or cancels payment
  modalWindow.webContents.on('will-navigate', (event, url) => {
    console.log('🔄 Navigation detected:', url);

    if (url.includes('pdfaireader://')) {
      event.preventDefault(); // Prevent loading the custom URL

      const isSuccess = url.includes('payment-success');
      console.log(isSuccess ? '✅ Payment completed!' : '❌ Payment cancelled');

      modalWindow.close();

      // Notify renderer that payment flow is complete
      if (parent) {
        parent.webContents.send('checkout-complete', {
          success: isSuccess,
        });
      }
    }
  });

  // Handle external links (like privacy policy) in default browser
  modalWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Handle system:open-external
 */
ipcMain.handle('system:open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error('❌ Failed to open URL:', error);
  }
});

/**
 * Open OAuth flow in modal (for Apple/Google Sign In)
 * Clean implementation that properly handles the Supabase OAuth callback
 */
ipcMain.handle('system:open-oauth-modal', async (event, authUrl: string) => {
  try {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!parentWindow) {
      console.error('❌ No parent window found for OAuth modal');
      return;
    }

    const oauthWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: 'Sign In',
      backgroundColor: '#ffffff',
    });

    let isClosing = false;

    // Helper to safely close the modal
    const closeModal = () => {
      if (isClosing || oauthWindow.isDestroyed()) return;
      isClosing = true;
      console.log('🔒 Closing OAuth modal');
      oauthWindow.close();
    };

    // Helper to check if URL has OAuth tokens
    const hasOAuthTokens = (url: string): boolean => {
      return url.includes('access_token=') || url.includes('error=');
    };

    // Helper to handle callback URL
    const handleCallbackUrl = (url: string) => {
      console.log('✅ OAuth callback detected with tokens');

      // Send the full URL (including hash) to parent
      if (!parentWindow.isDestroyed()) {
        parentWindow.webContents.send('oauth-callback', { url });
      }

      // Close modal immediately
      closeModal();
    };

    // Listen for redirects - this catches it BEFORE navigation completes
    oauthWindow.webContents.on('will-redirect', (_event, url) => {
      console.log('🔄 OAuth redirect:', url);

      // Check if redirecting to localhost with tokens (success) or supabase callback
      if ((url.includes('localhost') || url.includes('127.0.0.1')) && hasOAuthTokens(url)) {
        handleCallbackUrl(url);
      } else if (url.includes('supabase.co/auth/v1/callback') && hasOAuthTokens(url)) {
        handleCallbackUrl(url);
      }
    });

    // Listen for navigation completion
    oauthWindow.webContents.on('did-navigate', (_event, url) => {
      console.log('🔄 OAuth full navigation:', url);

      // Check if navigated to localhost with tokens
      if ((url.includes('localhost') || url.includes('127.0.0.1')) && hasOAuthTokens(url)) {
        handleCallbackUrl(url);
      } else if (url.includes('supabase.co/auth/v1/callback') && hasOAuthTokens(url)) {
        handleCallbackUrl(url);
      }
    });

    // Listen for hash changes (in-page navigation)
    oauthWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      console.log('🔄 OAuth in-page navigation (hash change):', url);

      // Check if hash contains tokens
      if (hasOAuthTokens(url)) {
        handleCallbackUrl(url);
      }
    });

    // Load the OAuth URL
    oauthWindow.loadURL(authUrl);

    // Show when ready
    oauthWindow.once('ready-to-show', () => {
      oauthWindow.show();
    });

    // Handle external links
    oauthWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Failsafe: Close after 60 seconds if still open
    setTimeout(() => {
      if (!isClosing && !oauthWindow.isDestroyed()) {
        console.log('⏰ Failsafe timeout - closing OAuth modal');
        closeModal();
      }
    }, 60000);
  } catch (error) {
    console.error('❌ Failed to open OAuth modal:', error);
  }
});
/**
 * Show file in system file manager (Finder on macOS, Explorer on Windows)
 */
ipcMain.handle('shell:show-item-in-folder', async (_event, fullPath: string) => {
  try {
    console.log('📂 Showing item in folder:', fullPath);
    shell.showItemInFolder(fullPath);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to show item in folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to show item in folder',
    };
  }
});

/**
 * Send file via Messages app on macOS
 */
ipcMain.handle('shell:send-via-messages', async (_event, fullPath: string) => {
  try {
    console.log('💬 Sending via Messages:', fullPath);

    if (process.platform === 'darwin') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // AppleScript to open Messages with file attached
      const script = `
        tell application "Messages"
          activate
          -- This will open Messages app where user can select a contact
          -- and the file will be ready to attach
        end tell

        tell application "System Events"
          tell process "Messages"
            -- Wait for Messages to open
            delay 0.5
            -- Simulate Cmd+N to start new message
            keystroke "n" using {command down}
            delay 0.3
          end tell
        end tell
      `;

      try {
        await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);

        // After opening Messages, try to attach the file
        const attachScript = `
          tell application "System Events"
            tell process "Messages"
              delay 0.5
              -- Try to drag/attach file (user can also manually drag it)
              keystroke "a" using {command down}
              delay 0.3
            end tell
          end tell
        `;

        // This opens the attachment picker
        await execAsync(`osascript -e '${attachScript.replace(/'/g, "\\'")}'`);

        return { success: true };
      } catch (error) {
        console.error('❌ Messages AppleScript failed:', error);
        // Fallback: just open Messages app
        await execAsync('open -a Messages');
        return { success: true, fallback: true };
      }
    } else {
      return { success: false, error: 'Messages integration only available on macOS' };
    }
  } catch (error) {
    console.error('❌ Failed to send via Messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send via Messages',
    };
  }
});

/**
 * Show native macOS share sheet for a file
 */
ipcMain.handle('shell:share-item', async (_event, fullPath: string) => {
  try {
    console.log('🔗 Sharing item:', fullPath);

    if (process.platform === 'darwin') {
      // Use AppleScript to trigger the native macOS share menu
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Escape the file path for AppleScript
      const escapedPath = fullPath.replace(/"/g, '\\"');

      // AppleScript to open Finder, select the file, and trigger share menu
      // Uses Finder's menu bar Share menu for most reliable access
      const script = `
        tell application "Finder"
          activate
          set theFile to POSIX file "${escapedPath}" as alias
          reveal theFile
          select theFile
        end tell

        delay 0.4

        tell application "System Events"
          tell process "Finder"
            -- Click on File menu in menu bar
            click menu bar item "File" of menu bar 1
            delay 0.2

            -- Click on Share submenu
            try
              click menu item "Share" of menu "File" of menu bar item "File" of menu bar 1
            on error errMsg
              -- Try alternative path for different macOS versions
              try
                click menu item "Share" of menu 1 of menu bar item "File" of menu bar 1
              end try
            end try
          end tell
        end tell
      `;

      try {
        await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
        return { success: true };
      } catch (error) {
        console.error('❌ AppleScript failed, falling back to Finder:', error);
        // Fallback: just show in Finder so user can manually share
        shell.showItemInFolder(fullPath);
        return { success: true, fallback: true };
      }
    } else {
      // On other platforms, just show in file manager
      shell.showItemInFolder(fullPath);
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to share item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share item',
    };
  }
});
