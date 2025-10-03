// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFile } from 'fs/promises';
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
});

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
