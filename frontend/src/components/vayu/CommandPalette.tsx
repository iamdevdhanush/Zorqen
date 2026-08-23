import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, MapPin, TrendingUp, AlertTriangle, Layers, ZoomIn } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'analysis' | 'actions';
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (command: string) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Commands
  const commands: Command[] = [
    { id: 'find-mahadevapura', label: 'Find Mahadevapura', category: 'navigation', icon: MapPin, action: () => onNavigate('find-mahadevapura') },
    { id: 'compare-whitefield', label: 'Compare Whitefield', category: 'analysis', icon: TrendingUp, action: () => onNavigate('compare-whitefield') },
    { id: 'show-highest-risk', label: 'Show highest-risk wards', category: 'analysis', icon: AlertTriangle, action: () => onNavigate('show-highest-risk') },
    { id: 'toggle-heatmap', label: 'Toggle heatmap', category: 'actions', icon: Layers, action: () => onNavigate('toggle-heatmap') },
    { id: 'zoom-kr-puram', label: 'Zoom to KR Puram', category: 'navigation', icon: ZoomIn, action: () => onNavigate('zoom-kr-puram') },
  ];

  // Filter commands
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        onNavigate('open-palette');
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onNavigate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="command-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="command-palette"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Search Input */}
            <div className="command-input-wrapper">
              <Search size={20} className="command-input-icon" />
              <input
                ref={inputRef}
                type="text"
                className="command-input"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <kbd className="command-esc">ESC</kbd>
            </div>

            {/* Results */}
            <div className="command-results">
              {filteredCommands.length === 0 ? (
                <div className="command-empty">No commands found</div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <motion.button
                    key={cmd.id}
                    className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="command-item-icon">
                      <cmd.icon size={16} />
                    </div>
                    <span className="command-item-label">{cmd.label}</span>
                    <span className="command-item-category">{cmd.category}</span>
                    <ArrowRight size={14} className="command-item-arrow" />
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="command-footer">
              <span><kbd>↑↓</kbd> Navigate</span>
              <span><kbd>↵</kbd> Select</span>
              <span><kbd>ESC</kbd> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
