import { contextBridge, ipcRenderer } from 'electron';
// ============================================================================
// API Implementation
// ============================================================================
const electronAPI = {
    pdf: {
        open: (filePath) => ipcRenderer.invoke('pdf:open', filePath),
        close: (documentId) => ipcRenderer.invoke('pdf:close', documentId),
        getPage: (documentId, pageNumber) => ipcRenderer.invoke('pdf:get-page', { documentId, pageNumber }),
    },
    ai: {
        ask: (question, context, pageNumber) => ipcRenderer.invoke('ai:ask', { question, context, pageNumber }),
        embed: (text) => ipcRenderer.invoke('ai:embed', text),
        search: (documentId, query, topK = 5) => ipcRenderer.invoke('ai:search', { documentId, query, topK }),
    },
    settings: {
        get: (key) => ipcRenderer.invoke('settings:get', key),
        set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    },
    file: {
        read: (filePath) => ipcRenderer.invoke('file:read', filePath),
    },
    system: {
        platform: process.platform,
        openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
    },
};
// ============================================================================
// Expose API to Renderer
// ============================================================================
// Expose the API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map