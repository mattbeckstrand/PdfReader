import { Copy, Mail, MessageSquare, Share, StickyNote } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ===================================================================
// Types
// ===================================================================

interface ShareDropdownProps {
  pdfPath?: string;
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

// ===================================================================
// Component
// ===================================================================

export const ShareDropdown: React.FC<ShareDropdownProps> = ({
  pdfPath,
  isOpen,
  onClose,
  buttonRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  // Handle share via email
  const handleEmailShare = useCallback(() => {
    if (!pdfPath) return;
    const fileName = pdfPath.split('/').pop() || 'document.pdf';
    const subject = encodeURIComponent(`Check out this PDF: ${fileName}`);
    const body = encodeURIComponent(
      `I wanted to share this PDF with you: ${fileName}\n\nFile path: ${pdfPath}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    onClose();
  }, [pdfPath, onClose]);

  // Handle copy path
  const handleCopyPath = useCallback(async () => {
    if (!pdfPath) return;
    try {
      await navigator.clipboard.writeText(pdfPath);
      setCopiedState('path');
      setTimeout(() => setCopiedState(null), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  }, [pdfPath]);

  // Handle copy file (for drag-drop or paste)
  const handleCopyFile = useCallback(async () => {
    if (!pdfPath) return;
    try {
      // Use Electron API to read file and copy to clipboard
      const result = await window.electronAPI.file.read(pdfPath);
      if (result.success && result.data) {
        // Create a blob and copy to clipboard
        const blob = new Blob([result.data], { type: 'application/pdf' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'application/pdf': blob,
          }),
        ]);
        setCopiedState('file');
        setTimeout(() => setCopiedState(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy file:', error);
      // Fallback to copying path
      handleCopyPath();
    }
  }, [pdfPath, handleCopyPath]);

  // Handle send via Messages
  const handleMessages = useCallback(async () => {
    if (!pdfPath) return;
    try {
      const result = await window.electronAPI.shell.sendViaMessages(pdfPath);
      if (result.success) {
        console.log('💬 Messages opened', result.fallback ? '(fallback)' : '');
      }
      onClose();
    } catch (error) {
      console.error('Failed to open Messages:', error);
      onClose();
    }
  }, [pdfPath, onClose]);

  // Handle native macOS/system share
  const handleNativeShare = useCallback(async () => {
    if (!pdfPath) return;
    try {
      // Use native macOS share sheet
      const result = await window.electronAPI.shell.shareItem(pdfPath);
      if (result.success) {
        console.log('📤 Share sheet opened', result.fallback ? '(via Finder fallback)' : '');
      }
      onClose();
    } catch (error) {
      console.error('Failed to open share menu:', error);
      // Fallback to showing in Finder
      await window.electronAPI.shell.showItemInFolder(pdfPath);
      onClose();
    }
  }, [pdfPath, onClose]);

  if (!isOpen || !pdfPath) return null;

  return (
    <div
      ref={dropdownRef}
      className="share-menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '0',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--stroke-1)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
        width: '200px',
        zIndex: 1000,
        animation: 'shareMenuFadeIn 0.15s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Share Actions */}
      <div style={{ padding: '4px' }}>
        {/* AirDrop */}
        <button
          onClick={handleNativeShare}
          className="share-option"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.1s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          <Share size={16} color="var(--text-1)" strokeWidth={2} />
          <span style={{ fontWeight: 400 }}>AirDrop</span>
        </button>

        {/* Mail */}
        <button
          onClick={handleEmailShare}
          className="share-option"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.1s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          <Mail size={16} color="var(--text-1)" strokeWidth={2} />
          <span style={{ fontWeight: 400 }}>Mail</span>
        </button>

        {/* Messages */}
        <button
          onClick={handleMessages}
          className="share-option"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.1s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          <MessageSquare size={16} color="var(--text-1)" strokeWidth={2} />
          <span style={{ fontWeight: 400 }}>Messages</span>
        </button>

        {/* Notes */}
        <button
          onClick={handleCopyPath}
          className="share-option"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.1s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          <StickyNote size={16} color="var(--text-1)" strokeWidth={2} />
          <span style={{ fontWeight: 400 }}>
            {copiedState === 'path' ? '✓ Path Copied' : 'Notes'}
          </span>
        </button>

        {/* Copy */}
        <button
          onClick={handleCopyFile}
          className="share-option"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.1s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          <Copy size={16} color="var(--text-1)" strokeWidth={2} />
          <span style={{ fontWeight: 400 }}>Copy</span>
        </button>
      </div>

      <style>{`
        @keyframes shareMenuFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .share-option:hover {
          background-color: var(--surface-3) !important;
        }

        .share-option:active {
          background-color: var(--surface-4) !important;
        }
      `}</style>
    </div>
  );
};
