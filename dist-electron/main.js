import { app, BrowserWindow, ipcMain } from 'electron';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
//# sourceMappingURL=main.js.map