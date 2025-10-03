import { Copy, Link as LinkIcon, Mail, Share2 } from 'lucide-react';
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

  // Handle share via system dialog (macOS/Windows)
  const handleSystemShare = useCallback(async () => {
    if (!pdfPath) return;
    try {
      // Use Electron shell to show file in folder (closest to system share)
      await window.electronAPI.shell.showItemInFolder(pdfPath);
      onClose();
    } catch (error) {
      console.error('Failed to open system share:', error);
    }
  }, [pdfPath, onClose]);

  if (!isOpen || !pdfPath) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--stroke-1)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        minWidth: '220px',
        zIndex: 1000,
        animation: 'dropdownFadeIn 0.15s ease-out',
      }}
    >
      {/* Email */}
      <button
        onClick={handleEmailShare}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: 'var(--text-1)',
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Mail size={16} />
        <span>Share via Email</span>
      </button>

      {/* Copy Path */}
      <button
        onClick={handleCopyPath}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: 'var(--text-1)',
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <LinkIcon size={16} />
        <span>{copiedState === 'path' ? '✓ Copied!' : 'Copy File Path'}</span>
      </button>

      {/* Copy File */}
      <button
        onClick={handleCopyFile}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: 'var(--text-1)',
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Copy size={16} />
        <span>{copiedState === 'file' ? '✓ Copied!' : 'Copy to Clipboard'}</span>
      </button>

      {/* Show in Finder/Explorer */}
      <button
        onClick={handleSystemShare}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: 'var(--text-1)',
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Share2 size={16} />
        <span>Show in Finder</span>
      </button>

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
