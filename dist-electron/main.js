// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
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
    }
    else {
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
ipcMain.handle('file:read', async (_event, filePath) => {
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
    }
    catch (error) {
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
ipcMain.handle('dialog:openFile', async (event) => {
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
    }
    catch (error) {
        console.error('❌ Failed to open file dialog:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to open file',
        };
    }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
// ============================================================================
// Smart Extraction: text first, OCR fallback (invokes Python script)
// ============================================================================
ipcMain.handle('extract:region', async (_event, args) => {
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
                    }
                    else {
                        console.error('❌ Python extraction failed:', parsed.error || stderr);
                        resolve({ success: false, error: parsed.error || stderr || 'Extraction failed' });
                    }
                }
                catch (e) {
                    console.error('❌ Failed to parse Python output:', e, 'stdout:', stdout, 'stderr:', stderr);
                    resolve({ success: false, error: e?.message || stderr || 'Invalid extractor output' });
                }
            });
            proc.stdin.write(payload);
            proc.stdin.end();
        }
        catch (error) {
            console.error('❌ Failed to spawn Python process:', error);
            resolve({ success: false, error: error?.message || 'Extractor invocation error' });
        }
    });
});
// ============================================================================
// AI: Ask (Gemini)
// ============================================================================
ipcMain.handle('ai:ask', async (_event, args) => {
    console.log('🤖 [AI] Received ask request:', {
        question: args?.question?.substring(0, 50) + '...',
        contextLength: args?.context?.length || 0,
        pageNumber: args?.pageNumber,
    });
    const { question, context, pageNumber } = args || { question: '', context: [] };
    const apiKey = process.env['VITE_GEMINI_API_KEY'] || process.env['GEMINI_API_KEY'];
    // Use Flash model (higher free tier limits, faster) - fallback to 1.5 Flash if 2.0 not available
    const modelName = process.env['VITE_GEMINI_MODEL'] || 'gemini-1.5-flash';
    console.log('🔑 [AI] API Key available:', !!apiKey);
    console.log('🤖 [AI] Model:', modelName);
    const makeAnswer = (answer) => ({
        id: `${Date.now()}`,
        questionId: 'inline',
        answer,
        pageNumber,
        model: modelName,
        timestamp: Date.now(),
        tokensUsed: 0,
    });
    if (!apiKey) {
        console.error('❌ [AI] No API key found!');
        return makeAnswer('AI not configured: missing GEMINI_API_KEY.');
    }
    try {
        console.log('🤖 [AI] Initializing Gemini client...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const mergedContext = (context || []).filter(Boolean).join('\n\n---\n\n');
        const prompt = [
            'You are helping a student understand math from a PDF textbook.',
            'Given the focused selection and nearby context, answer clearly and thoroughly.',
            '',
            'Context:',
            '---',
            mergedContext || '(no additional context)',
            '---',
            '',
            `Question: ${question}`,
            '',
            'Guidelines:',
            '- Explain intuition first, then formal details.',
            '- If math is present, include LaTeX for formulas.',
            '- Reference definitions if relevant.',
            '- Keep the answer concise but complete.',
        ].join('\n');
        console.log('🤖 [AI] Sending to Gemini...');
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.() || '';
        console.log('✅ [AI] Response received:', text.substring(0, 100) + '...');
        return makeAnswer(text || '');
    }
    catch (error) {
        console.error('❌ [AI] Error:', error);
        const msg = error?.message || 'Failed to get AI response';
        return makeAnswer(`Error: ${msg}`);
    }
});
//# sourceMappingURL=main.js.map