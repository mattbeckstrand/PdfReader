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
import { ZeroEntropy } from 'zeroentropy';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Log loaded environment variables (for debugging)
console.log('🔐 Environment loaded:', {
    hasGeminiKey: !!process.env['VITE_GEMINI_API_KEY'] || !!process.env['GEMINI_API_KEY'],
    hasMathPixId: !!process.env['MATHPIX_APP_ID'],
    hasMathPixKey: !!process.env['MATHPIX_APP_KEY'],
    hasBackendUrl: !!process.env['BACKEND_API_URL'],
    hasZeroEntropy: !!process.env['ZERO_ENTROPY'],
});
// ============================================================================
// ZeroEntropy Client Setup
// ============================================================================
// Initialize ZeroEntropy client (lazy initialization)
let zeroEntropyClient = null;
function getZeroEntropyClient() {
    if (!zeroEntropyClient) {
        const apiKey = process.env['ZERO_ENTROPY'];
        if (!apiKey) {
            return null;
        }
        zeroEntropyClient = new ZeroEntropy({ apiKey });
    }
    return zeroEntropyClient;
}
// Store mapping of document IDs to ZeroEntropy collection names
const documentCollections = new Map();
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
ipcMain.handle('ai:ask', async (event, args) => {
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
        const formatHistory = (history) => {
            if (!history || history.length === 0)
                return '';
            const formatted = history
                .map(msg => {
                const pagePart = msg.pageNumber ? ` (Page ${msg.pageNumber})` : '';
                const role = msg.role === 'user' ? 'Student' : 'Assistant';
                // Truncate old responses to 150 chars to save tokens
                const content = msg.role === 'assistant' && msg.content.length > 150
                    ? msg.content.substring(0, 150) + '...'
                    : msg.content;
                return `${role}${pagePart}: ${content}`;
            })
                .join('\n\n');
            return '\n\n💬 PREVIOUS CONVERSATION:\n---\n' + formatted + '\n---\n';
        };
        const historySection = formatHistory(conversationHistory);
        // Build multimodal content array
        const contentParts = [];
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
                '🎓 ROLE: You are an expert tutor helping a student understand THIS SPECIFIC TEXTBOOK. Your job is to teach using ONLY what this textbook has presented, preserving its notation, definitions, and approach.',
                '',
                '📊 CONTEXT STRUCTURE:',
                'You will receive context in THREE parts:',
                '1. RELEVANT CONTEXT FROM DOCUMENT: Key passages retrieved from elsewhere in the textbook (definitions, theorems, prior explanations)',
                '2. CURRENT SELECTION: The exact text the student highlighted and is asking about',
                '3. SURROUNDING CONTEXT: Paragraphs immediately before and after the selection on the same page',
                '',
                '🔍 USING RETRIEVED CONTEXT (CRITICAL):',
                'The RELEVANT CONTEXT passages were semantically matched to the question - they contain the definitions, explanations, or background needed.',
                '',
                'CONFIDENCE RULES:',
                '- Retrieved context >1000 characters: You have comprehensive information. Answer fully and confidently.',
                '- Retrieved context 500-1000 characters: You have sufficient information. Provide a solid answer.',
                '- Retrieved context <500 characters: Limited but use what you have. Note gaps if truly incomplete.',
                '',
                'CRITICAL: If you have 1000+ characters of retrieved text, DO NOT say "I need more context" - you have enough.',
                '',
                '💬 NATURAL GROUNDING (Not Formal Citations):',
                'Reference sources naturally in conversation:',
                '- "This connects to what the text covered earlier on page 23..."',
                '- "The chapter explained this concept on page 12 as..."',
                '- "Going back to the definition from page 8..."',
                '- "The textbook uses this notation throughout, starting on page 15..."',
                '',
                'Make it feel like you\'re helping a friend understand, not writing a research paper. Weave page references naturally into explanations.',
                historySection,
                '',
                '📸 IMAGE: See the screenshot above showing the selected content from the PDF.',
                '',
                '📝 EXTRACTED TEXT (may be incomplete for equations/diagrams):',
                '---',
                mergedContext || '(no text extracted)',
                '---',
                '',
                `❓ STUDENT QUESTION: ${question}`,
                '',
                '📋 CRITICAL INSTRUCTIONS - TEXTBOOK FIDELITY:',
                '',
                '🔒 STAY WITHIN THE TEXTBOOK:',
                '- You must ONLY use information from the provided PDF context above',
                "- Use the textbook's exact notation, definitions, and terminology",
                '- If the textbook proves something using method X, use method X - do NOT suggest alternative approaches from outside this textbook',
                '- If the context lacks information to answer fully, say: "The provided context shows [what you see], but to fully explain this I would need [what\'s missing, e.g., the definition from an earlier chapter]"',
                '- Do NOT fill gaps with knowledge from your training data',
                '',
                '📸 VISION ANALYSIS:',
                '- ALWAYS analyze the IMAGE first - describe what you see visually',
                '- For equations: describe what you see in the image AND reference any LaTeX',
                '- For diagrams/graphs: describe visual elements thoroughly',
                '- Use the extracted text as supplementary context only',
                '',
                '✍️ RESPONSE STRUCTURE:',
                '1. Direct Answer (1-2 sentences): Answer the question immediately',
                '2. Intuition (2-3 sentences): Explain WHY in plain language first',
                "3. Details: Formal definitions, equations, proofs - using the textbook's approach",
                '4. Connection (if relevant): How this relates to surrounding content',
                '',
                '🎯 TEACHING STYLE (Conversational Peer):',
                '- Explain like you\'re helping a friend study, not lecturing',
                '- Build conceptual understanding: "Here\'s the key idea..." not "The definition states..."',
                '- Use natural transitions: "So...", "Here\'s why...", "The cool thing is..."',
                '- If previous messages show confusion, address it: "Ah, I see where the confusion is..."',
                '- Use LaTeX for math: \\( \\) inline, \\[ \\] for display',
                '- Keep paragraphs short (2-3 sentences)',
                '- Use **bold** for emphasis on key terms',
                '- Be encouraging but not condescending',
                '',
                '❌ NEVER:',
                '- Give generic textbook explanations when the PDF has specific content',
                '- Use different notation than what the textbook uses',
                '- Suggest "alternative methods" not in this textbook',
                '- Make up definitions or theorems not present in the context',
                '- Say "this is simple" or "obviously" or "just"',
            ].join('\n')
            : [
                '🎓 ROLE: You are an expert tutor helping a student understand THIS SPECIFIC TEXTBOOK. Your job is to teach using ONLY what this textbook has presented, preserving its notation, definitions, and approach.',
                '',
                '📊 CONTEXT STRUCTURE:',
                'You will receive context in THREE parts:',
                '1. RELEVANT CONTEXT FROM DOCUMENT: Key passages retrieved from elsewhere in the textbook (definitions, theorems, prior explanations)',
                '2. CURRENT SELECTION: The exact text the student highlighted and is asking about',
                '3. SURROUNDING CONTEXT: Paragraphs immediately before and after the selection on the same page',
                '',
                '🔍 USING RETRIEVED CONTEXT (CRITICAL):',
                'The RELEVANT CONTEXT passages were semantically matched to the question - they contain the definitions, explanations, or background needed.',
                '',
                'CONFIDENCE RULES:',
                '- Retrieved context >1000 characters: You have comprehensive information. Answer fully and confidently.',
                '- Retrieved context 500-1000 characters: You have sufficient information. Provide a solid answer.',
                '- Retrieved context <500 characters: Limited but use what you have. Note gaps if truly incomplete.',
                '',
                'CRITICAL: If you have 1000+ characters of retrieved text, DO NOT say "I need more context" - you have enough.',
                '',
                '💬 NATURAL GROUNDING (Not Formal Citations):',
                'Reference sources naturally in conversation:',
                '- "This connects to what the text covered earlier on page 23..."',
                '- "The chapter explained this concept on page 12 as..."',
                '- "Going back to the definition from page 8..."',
                '- "The textbook uses this notation throughout, starting on page 15..."',
                '',
                'Make it feel like you\'re helping a friend understand, not writing a research paper. Weave page references naturally into explanations.',
                '',
                '📖 TEXTBOOK CONTEXT PROVIDED:',
                '---',
                mergedContext || '(no additional context)',
                '---',
                historySection,
                '',
                `❓ STUDENT QUESTION: ${question}`,
                '',
                '📋 CRITICAL INSTRUCTIONS - TEXTBOOK FIDELITY:',
                '',
                '🔒 STAY WITHIN THE TEXTBOOK:',
                '- You must ONLY use information, notation, and approaches from the provided PDF context above',
                '- Use the textbook\'s exact definitions and terminology - do not paraphrase with "standard" definitions from your training',
                '- If the textbook uses specific notation (e.g., ∈ vs ε), use exactly that notation',
                '- If the textbook proves something using method X, explain using method X - do NOT suggest method Y even if more elegant',
                '- If the context is insufficient, say: "Based on the visible text, I can see [X], but a complete answer would need [Y, e.g., the definition of [term] from an earlier section]"',
                '- Do NOT use general knowledge to "fill gaps" - work only with what the textbook explicitly states',
                '',
                '✍️ RESPONSE STRUCTURE:',
                '1. **Direct Answer** (1-2 sentences): Answer their question immediately',
                '2. **Intuition** (2-3 sentences): Explain WHY this is true in plain language',
                "3. **Details** (as needed): Formal definitions, equations, or proofs using the textbook's exact approach",
                '4. **Connection** (1 sentence, if relevant): How this relates to the surrounding context',
                '',
                '🎯 TEACHING STYLE (Conversational Peer):',
                '- Explain like you\'re helping a friend study, not lecturing',
                '- Build conceptual understanding: "Here\'s the key idea..." not "The definition states..."',
                '- Use natural transitions: "So...", "Here\'s why...", "The cool thing is..."',
                '- Reference pages naturally: "This builds on page 23..." not "According to page 23..."',
                '- If previous messages show confusion, address it: "Ah, I see where the confusion is..."',
                '- For math: Write equations in LaTeX, then explain what each term means',
                '- Keep paragraphs short (2-3 sentences)',
                '- Use **bold** for emphasis on key terms',
                '- Be encouraging but not condescending',
                '',
                '❌ AVOID:',
                '- Generic explanations when specific content is provided ("A derivative measures rate of change" vs using the textbook\'s exact definition)',
                '- Alternative methods not in this textbook ("Here\'s an easier way...")',
                '- Different notation than the textbook uses',
                '- Condescending language ("this is easy", "obviously", "simply")',
                '- Answering a different question than asked',
                '- Making up theorems, definitions, or facts not in the provided context',
                '',
                '📖 EXAMPLES OF HYBRID APPROACH:',
                '',
                'EXAMPLE 1 - Conversational + Grounded:',
                'Question: "What does convergence mean?"',
                'Retrieved: 1200 chars from page 23 with definition',
                '',
                '❌ TOO FORMAL: "According to page 23, Definition 2.1 states that convergence is..."',
                '❌ TOO CASUAL: "It means the sequence gets closer to some number..." (no grounding)',
                '✅ HYBRID: "This connects to what the chapter covered on page 23. **Convergence** means the sequence is approaching a specific limit L - the values get arbitrarily close as n increases. Formally, for any ε > 0, eventually all terms stay within ε of L. Think of it like zeroing in on a target..."',
                '',
                'EXAMPLE 2 - Using Multiple Retrieved Sources:',
                'Question: "Explain this proof"',
                'Retrieved: Definition page 12, Theorem page 45, Current proof page 87',
                '',
                '❌ BAD: Uses generic proof without mentioning sources',
                '✅ GOOD: "Let\'s break this down. The proof relies on the definition of boundedness from page 12 and Theorem 3.1 from page 45. The key insight is [explain intuition]. Now following the textbook\'s approach, we start by assuming..."',
                '',
                'EXAMPLE 3 - Transparent When Limited:',
                'Question: "What does this notation mean?"',
                'Retrieved: 200 chars, doesn\'t define notation',
                '',
                '❌ BAD: Makes up definition',
                '✅ GOOD: "This notation appears in your equation, but I don\'t see it defined in the passages I can access (pages 9-12). It\'s likely introduced earlier in the chapter. Try highlighting the section where symbols are first defined - usually near the chapter start."',
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
    }
    catch (error) {
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
});
// ============================================================================
// ZeroEntropy Integration - Document Retrieval
// ============================================================================
/**
 * IPC Handler: ai:index-document-ze
 * Purpose: Index entire PDF in ZeroEntropy for semantic search
 * Called when: PDF is loaded
 */
ipcMain.handle('ai:index-document-ze', async (_event, args) => {
    const { documentId, documentTitle, pages } = args;
    console.log(`📚 [ZEROENTROPY] Starting indexing for: ${documentTitle}`);
    console.log(`📚 [ZEROENTROPY] Total pages: ${pages.length}`);
    const client = getZeroEntropyClient();
    if (!client) {
        throw new Error('ZERO_ENTROPY API key not found in environment');
    }
    try {
        // Use documentId as collection name (sanitize it)
        const collectionName = documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Step 1: Create collection (or use existing)
        let collectionId = documentCollections.get(documentId);
        let isNewCollection = false;
        if (!collectionId) {
            console.log(`📦 [ZEROENTROPY] Creating collection: ${collectionName}`);
            try {
                await client.collections.add({
                    collection_name: collectionName,
                });
                documentCollections.set(documentId, collectionName);
                collectionId = collectionName;
                isNewCollection = true;
                console.log(`✅ [ZEROENTROPY] Created collection: ${collectionName}`);
            }
            catch (error) {
                // Collection might already exist
                if (error.message?.includes('already exists') || error.status === 409) {
                    console.log(`✅ [ZEROENTROPY] Collection already exists: ${collectionName}`);
                    documentCollections.set(documentId, collectionName);
                    collectionId = collectionName;
                    isNewCollection = false;
                }
                else {
                    throw error;
                }
            }
        }
        else {
            console.log(`✅ [ZEROENTROPY] Using existing collection: ${collectionId}`);
            isNewCollection = false;
        }
        // Step 2: Check if collection already has documents (Option A: Skip re-indexing)
        if (!isNewCollection) {
            console.log('🔍 [ZEROENTROPY] Checking if documents already indexed...');
            try {
                // Quick test query to see if documents exist
                const testQuery = await client.queries.topDocuments({
                    collection_name: collectionName,
                    query: 'test',
                    k: 1,
                });
                if (testQuery.results && testQuery.results.length > 0) {
                    console.log('✅ [ZEROENTROPY] Documents already indexed, skipping re-indexing');
                    return { success: true, collectionId: collectionName };
                }
            }
            catch (error) {
                console.log('ℹ️  [ZEROENTROPY] No existing documents found, proceeding with indexing');
            }
        }
        // Step 3: Add pages to collection using SDK
        console.log(`📄 [ZEROENTROPY] Indexing ${pages.length} pages...`);
        let successCount = 0;
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (!page || !page.text) {
                continue;
            }
            try {
                await client.documents.add({
                    collection_name: collectionName,
                    path: `page_${page.pageNumber}.txt`,
                    content: {
                        type: 'text',
                        text: page.text,
                    },
                    metadata: {
                        pageNumber: String(page.pageNumber),
                        documentId: documentId,
                        documentTitle: documentTitle,
                    },
                });
                successCount++;
                // Log progress every 50 pages
                if (successCount % 50 === 0 || i === pages.length - 1) {
                    console.log(`📤 [ZEROENTROPY] Indexed ${successCount}/${pages.length} pages`);
                }
            }
            catch (error) {
                // Silent skip for 409 errors (already exists)
                if (error.status !== 409) {
                    console.warn(`⚠️  [ZEROENTROPY] Failed to index page ${page.pageNumber}:`, error.message);
                }
            }
        }
        console.log(`✅ [ZEROENTROPY] Successfully indexed ${successCount}/${pages.length} pages`);
        return { success: true, collectionId: collectionName };
    }
    catch (error) {
        console.error('❌ [ZEROENTROPY] Indexing failed:', error);
        throw new Error(`ZeroEntropy indexing failed: ${error?.message || 'Unknown error'}`);
    }
});
/**
 * IPC Handler: ai:search-ze
 * Purpose: Query ZeroEntropy for relevant document snippets
 * Called when: User asks a question
 */
ipcMain.handle('ai:search-ze', async (_event, args) => {
    const { documentId, query, topK = 5 } = args;
    console.log(`🔍 [ZEROENTROPY] Query: "${query.substring(0, 50)}..."`);
    console.log(`🔍 [ZEROENTROPY] Document: ${documentId}, topK: ${topK}`);
    const client = getZeroEntropyClient();
    if (!client) {
        console.warn('⚠️  [ZEROENTROPY] No API key, returning empty results');
        return [];
    }
    const collectionName = documentCollections.get(documentId);
    if (!collectionName) {
        console.warn(`⚠️  [ZEROENTROPY] Document ${documentId} not indexed`);
        return [];
    }
    try {
        // Query ZeroEntropy using SDK
        const response = await client.queries.topDocuments({
            collection_name: collectionName,
            query: query,
            k: topK,
        });
        // Fetch content from file URLs (ZeroEntropy returns URLs, not content directly)
        const results = [];
        for (const result of response.results || []) {
            try {
                // Extract page number from path (e.g., "page_11.txt" → 11)
                const pageMatch = result.path?.match(/page_(\d+)\.txt/);
                const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : 0;
                // Fetch content from file_url
                let text = '';
                if (result.file_url) {
                    const contentResponse = await fetch(result.file_url);
                    if (contentResponse.ok) {
                        text = await contentResponse.text();
                    }
                }
                results.push({
                    text: text,
                    pageNumber: pageNumber,
                    score: result.score || 0,
                    metadata: result.metadata || {},
                });
            }
            catch (error) {
                console.warn('⚠️  [ZEROENTROPY] Failed to process result:', error.message);
            }
        }
        console.log(`✅ [ZEROENTROPY] Retrieved ${results.length} results`);
        if (results.length > 0) {
            results.forEach((result, idx) => {
                console.log(`  ${idx + 1}. Page ${result.pageNumber}, score ${result.score.toFixed(3)}`, `\n     Text length: ${result.text.length} chars`, `\n     Preview: "${result.text.substring(0, 100)}..."`);
            });
        }
        return results;
    }
    catch (error) {
        console.error('❌ [ZEROENTROPY] Query error:', error);
        return [];
    }
});
// ============================================================================
// License Management
// ============================================================================
/**
 * Generate unique device ID
 */
function getDeviceId() {
    const storageId = path.join(app.getPath('userData'), 'device-id.txt');
    try {
        const fs = require('fs');
        if (fs.existsSync(storageId)) {
            return fs.readFileSync(storageId, 'utf8').trim();
        }
        const newId = randomBytes(16).toString('hex');
        fs.writeFileSync(storageId, newId, 'utf8');
        return newId;
    }
    catch (error) {
        console.error('❌ Failed to get device ID:', error);
        return randomBytes(16).toString('hex');
    }
}
/**
 * Verify license key with backend
 */
ipcMain.handle('license:verify', async (_event, licenseKey) => {
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
    }
    catch (error) {
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
ipcMain.handle('license:get-by-email', async (_event, email) => {
    try {
        console.log('🔍 Fetching license for email:', email);
        const response = await fetch(`${BACKEND_API_URL}/api/license/by-email/${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.success) {
            console.log('✅ Found license:', data.licenseKey);
        }
        else {
            console.log('❌ No license found');
        }
        return data;
    }
    catch (error) {
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
ipcMain.handle('license:activate', async (_event, args) => {
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
    }
    catch (error) {
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
    }
    catch (error) {
        // File doesn't exist or is invalid
        return null;
    }
});
/**
 * Store license locally
 */
ipcMain.handle('license:store', async (_event, args) => {
    try {
        await writeFile(LICENSE_FILE, JSON.stringify(args), 'utf8');
        console.log('✅ License stored locally');
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('❌ Failed to clear license:', error);
    }
});
/**
 * Create Stripe checkout session
 */
ipcMain.handle('license:create-checkout', async (event, args) => {
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
    }
    catch (error) {
        console.error('❌ Checkout creation failed:', error);
        return {
            success: false,
            error: error?.message || 'Failed to create checkout',
        };
    }
});
/**
 * Open Stripe checkout in a modal window
 */
function openStripeCheckoutModal(checkoutUrl, parent) {
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
ipcMain.handle('system:open-external', async (_event, url) => {
    try {
        await shell.openExternal(url);
    }
    catch (error) {
        console.error('❌ Failed to open URL:', error);
    }
});
/**
 * Open OAuth flow in modal (for Apple/Google Sign In)
 * Clean implementation that properly handles the Supabase OAuth callback
 */
ipcMain.handle('system:open-oauth-modal', async (event, authUrl) => {
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
            if (isClosing || oauthWindow.isDestroyed())
                return;
            isClosing = true;
            console.log('🔒 Closing OAuth modal');
            oauthWindow.close();
        };
        // Helper to check if URL has OAuth tokens
        const hasOAuthTokens = (url) => {
            return url.includes('access_token=') || url.includes('error=');
        };
        // Helper to handle callback URL
        const handleCallbackUrl = (url) => {
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
            }
            else if (url.includes('supabase.co/auth/v1/callback') && hasOAuthTokens(url)) {
                handleCallbackUrl(url);
            }
        });
        // Listen for navigation completion
        oauthWindow.webContents.on('did-navigate', (_event, url) => {
            console.log('🔄 OAuth full navigation:', url);
            // Check if navigated to localhost with tokens
            if ((url.includes('localhost') || url.includes('127.0.0.1')) && hasOAuthTokens(url)) {
                handleCallbackUrl(url);
            }
            else if (url.includes('supabase.co/auth/v1/callback') && hasOAuthTokens(url)) {
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
    }
    catch (error) {
        console.error('❌ Failed to open OAuth modal:', error);
    }
});
/**
 * Show file in system file manager (Finder on macOS, Explorer on Windows)
 */
ipcMain.handle('shell:show-item-in-folder', async (_event, fullPath) => {
    try {
        console.log('📂 Showing item in folder:', fullPath);
        shell.showItemInFolder(fullPath);
        return { success: true };
    }
    catch (error) {
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
ipcMain.handle('shell:send-via-messages', async (_event, fullPath) => {
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
            }
            catch (error) {
                console.error('❌ Messages AppleScript failed:', error);
                // Fallback: just open Messages app
                await execAsync('open -a Messages');
                return { success: true, fallback: true };
            }
        }
        else {
            return { success: false, error: 'Messages integration only available on macOS' };
        }
    }
    catch (error) {
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
ipcMain.handle('shell:share-item', async (_event, fullPath) => {
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
            }
            catch (error) {
                console.error('❌ AppleScript failed, falling back to Finder:', error);
                // Fallback: just show in Finder so user can manually share
                shell.showItemInFolder(fullPath);
                return { success: true, fallback: true };
            }
        }
        else {
            // On other platforms, just show in file manager
            shell.showItemInFolder(fullPath);
            return { success: true };
        }
    }
    catch (error) {
        console.error('❌ Failed to share item:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to share item',
        };
    }
});
//# sourceMappingURL=main.js.map