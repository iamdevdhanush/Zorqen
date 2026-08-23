import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Truck,
  Cloud,
  Droplets,
  Clock,
  Database,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { tokens } from '../../lib/tokens';

// Search Types
interface SearchResult {
  type: 'ward' | 'address' | 'landmark';
  name: string;
  subtitle: string;
}

// Quick Actions
const quickActions = [
  { id: 'compare', label: 'Compare Wards', icon: TrendingUp },
  { id: 'highest-risk', label: 'Highest Risk', icon: AlertTriangle },
  { id: 'tanker', label: 'Tanker Hotspots', icon: Truck },
  { id: 'forecast', label: 'Water Forecast', icon: Cloud },
  { id: 'groundwater', label: 'Low Groundwater', icon: Droplets },
];

// Recent Analyses
interface RecentAnalysis {
  id: string;
  name: string;
  timestamp: string;
}

const recentAnalyses: RecentAnalysis[] = [
  { id: '1', name: 'Mahadevapura Ward Analysis', timestamp: '2m ago' },
  { id: '2', name: 'KR Puram Risk Assessment', timestamp: '15m ago' },
  { id: '3', name: 'Whitefield Groundwater Study', timestamp: '1h ago' },
];

// Data Sources
const dataSources = [
  { name: 'BBMP Ward Data', count: 198 },
  { name: 'Groundwater Levels', count: 247 },
  { name: 'Rainfall Records', count: 156 },
  { name: 'Tanker Routes', count: 89 },
];

export function WorkspaceCard() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock search
  useEffect(() => {
    if (searchQuery.length > 1) {
      setSearchResults([
        { type: 'ward', name: 'Mahadevapura', subtitle: 'Ward 150 • Critical Risk' },
        { type: 'ward', name: 'KR Puram', subtitle: 'Ward 85 • High Risk' },
        { type: 'ward', name: 'Whitefield', subtitle: 'Ward 141 • Moderate Risk' },
        { type: 'landmark', name: 'ITPL', subtitle: 'Mahadevapura' },
        { type: 'address', name: 'Marathahalli Bridge', subtitle: 'Mahadevapura' },
      ].filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())));
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <motion.div
      className="workspace-card"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Logo */}
      <div className="workspace-header">
        <div className="workspace-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="url(#logoGrad)" />
            <path
              d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 10v12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#2563EB" />
                <stop offset="1" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
          </svg>
          <span className="workspace-logo-text">VAYU</span>
        </div>
      </div>

      {/* Search */}
      <div className="workspace-search" ref={searchRef}>
        <div className={`search-pill ${searchFocused ? 'focused' : ''}`}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search ward, address, landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>

        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              className="search-dropdown"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {searchResults.map((result, i) => (
                <motion.button
                  key={i}
                  className="search-result"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <MapPin size={16} />
                  <div className="search-result-content">
                    <span className="search-result-name">{result.name}</span>
                    <span className="search-result-subtitle">{result.subtitle}</span>
                  </div>
                  <ChevronRight size={14} className="search-result-arrow" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analyze Ward Button */}
      <button className="analyze-button">
        <MapPin size={18} />
        <span>Analyze Ward</span>
        <ArrowRight size={16} className="analyze-arrow" />
      </button>

      {/* Quick Actions */}
      <div className="workspace-section">
        <h3 className="section-label">Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <QuickActionChip key={action.id} action={action} />
          ))}
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="workspace-section">
        <h3 className="section-label">Recent Analyses</h3>
        <div className="recent-list">
          {recentAnalyses.map((analysis) => (
            <RecentAnalysisItem key={analysis.id} analysis={analysis} />
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div className="workspace-section">
        <h3 className="section-label">
          <Database size={14} />
          <span>Data Sources</span>
        </h3>
        <div className="data-sources">
          {dataSources.map((source) => (
            <div key={source.name} className="data-source-item">
              <span className="data-source-name">{source.name}</span>
              <span className="data-source-count">{source.count}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Quick Action Chip Component
interface QuickActionChipProps {
  action: { id: string; label: string; icon: React.ComponentType<{ size?: number }> };
}

function QuickActionChip({ action }: QuickActionChipProps) {
  const Icon = action.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="quick-action-chip"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="quick-action-icon"
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <Icon size={16} />
      </motion.div>
      <span className="quick-action-label">{action.label}</span>
    </motion.button>
  );
}

// Recent Analysis Item
function RecentAnalysisItem({ analysis }: { analysis: RecentAnalysis }) {
  return (
    <motion.button
      className="recent-item"
      whileHover={{ backgroundColor: 'rgba(37, 99, 235, 0.06)' }}
    >
      <Clock size={14} className="recent-item-icon" />
      <span className="recent-item-name">{analysis.name}</span>
      <span className="recent-item-time">{analysis.timestamp}</span>
    </motion.button>
  );
}