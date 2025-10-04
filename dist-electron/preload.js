"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// ============================================================================
// API Implementation
// ============================================================================
const electronAPI = {
    pdf: {
        open: (filePath) => electron_1.ipcRenderer.invoke('pdf:open', filePath),
        close: (documentId) => electron_1.ipcRenderer.invoke('pdf:close', documentId),
        getPage: (documentId, pageNumber) => electron_1.ipcRenderer.invoke('pdf:get-page', { documentId, pageNumber }),
    },
    ai: {
        ask: (question, context, pageNumber, imageBase64, conversationHistory) => electron_1.ipcRenderer.invoke('ai:ask', {
            question,
            context,
            pageNumber,
            imageBase64,
            conversationHistory,
        }),
        onStreamChunk: (callback) => {
            const listener = (_event, data) => callback(data);
            electron_1.ipcRenderer.on('ai:stream-chunk', listener);
            // Return cleanup function
            return () => {
                electron_1.ipcRenderer.removeListener('ai:stream-chunk', listener);
            };
        },
        embed: (text) => electron_1.ipcRenderer.invoke('ai:embed', text),
        search: (documentId, query, topK = 5) => electron_1.ipcRenderer.invoke('ai:search', { documentId, query, topK }),
    },
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('settings:set', { key, value }),
    },
    file: {
        read: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
    },
    dialog: {
        openFile: () => electron_1.ipcRenderer.invoke('dialog:openFile'),
    },
    system: {
        platform: process.platform,
        openExternal: (url) => electron_1.ipcRenderer.invoke('system:open-external', url),
        openOAuthModal: (url) => electron_1.ipcRenderer.invoke('system:open-oauth-modal', url),
        onOAuthCallback: (callback) => {
            const listener = (_event, data) => callback(data);
            electron_1.ipcRenderer.on('oauth-callback', listener);
            return () => {
                electron_1.ipcRenderer.removeListener('oauth-callback', listener);
            };
        },
        onCheckoutComplete: (callback) => {
            const listener = (_event, data) => callback(data);
            electron_1.ipcRenderer.on('checkout-complete', listener);
            return () => {
                electron_1.ipcRenderer.removeListener('checkout-complete', listener);
            };
        },
    },
    shell: {
        showItemInFolder: (fullPath) => electron_1.ipcRenderer.invoke('shell:show-item-in-folder', fullPath),
        shareItem: (fullPath) => electron_1.ipcRenderer.invoke('shell:share-item', fullPath),
        sendViaMessages: (fullPath) => electron_1.ipcRenderer.invoke('shell:send-via-messages', fullPath),
    },
    extract: {
        region: (pdfPath, pageNumber, bbox, pythonPath) => electron_1.ipcRenderer.invoke('extract:region', { pdfPath, pageNumber, bbox, pythonPath }),
    },
    license: {
        verify: (licenseKey) => electron_1.ipcRenderer.invoke('license:verify', licenseKey),
        activate: (licenseKey, email) => electron_1.ipcRenderer.invoke('license:activate', { licenseKey, email }),
        getStored: () => electron_1.ipcRenderer.invoke('license:get-stored'),
        store: (licenseKey, email) => electron_1.ipcRenderer.invoke('license:store', { licenseKey, email }),
        clear: () => electron_1.ipcRenderer.invoke('license:clear'),
        createCheckout: (priceId, email) => electron_1.ipcRenderer.invoke('license:create-checkout', { priceId, email }),
        getByEmail: (email) => electron_1.ipcRenderer.invoke('license:get-by-email', email),
    },
};
// ============================================================================
// Expose API to Renderer
// ============================================================================
// Expose the API to the renderer process via window.electronAPI
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map