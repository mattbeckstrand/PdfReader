import { Moon, Sun } from 'lucide-react';
import React from 'react';
import type { Theme } from '../../hooks/useTheme';

// ===================================================================
// Types
// ===================================================================

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

// ===================================================================
// Component
// ===================================================================

/**
 * Theme toggle button for switching between light and dark modes
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="btn"
      style={{
        padding: '12px',
        minWidth: 'auto',
        borderRadius: 'var(--radius-md)',
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
    </button>
  );
};
