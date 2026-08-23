import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Droplets,
  CloudRain,
  Truck,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Download,
  Share2,
} from 'lucide-react';

// Ward Data Interface
export interface WardData {
  id: string;
  name: string;
  wardNumber: number;
  score: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  aiInsight: string;
  metrics: {
    groundwater: number;
    rainfall: number;
    supply: number;
    forecast: number;
  };
}

interface WardInspectorProps {
  ward: WardData | null;
  onClose: () => void;
}

export function WardInspector({ ward, onClose }: WardInspectorProps) {
  // Close on ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getRiskColor = (level: WardData['riskLevel']) => {
    const colors = {
      safe: '#67C587',
      moderate: '#D6B83C',
      high: '#F28C28',
      critical: '#D95B5B',
    };
    return colors[level];
  };

  return (
    <AnimatePresence>
      {ward && (
        <>
          {/* Backdrop */}
          <motion.div
            className="inspector-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Inspector Panel */}
          <motion.div
            className="inspector-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Close Button */}
            <button className="inspector-close" onClick={onClose}>
              <X size={18} />
            </button>

            {/* Header */}
            <div className="inspector-header">
              <div className="inspector-ward-badge">
                <MapPin size={14} />
                <span>Ward {ward.wardNumber}</span>
              </div>
              <h2 className="inspector-title">{ward.name}</h2>

              {/* Score */}
              <div className="inspector-score-row">
                <motion.div
                  className="inspector-score"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, delay: 0.1 }}
                >
                  {ward.score}
                </motion.div>
                <motion.div
                  className="inspector-risk-badge"
                  style={{ backgroundColor: getRiskColor(ward.riskLevel) }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {ward.riskLevel.charAt(0).toUpperCase() + ward.riskLevel.slice(1)}
                </motion.div>
              </div>

              <p className="inspector-updated">Updated {ward.lastUpdated}</p>
            </div>

            {/* Divider */}
            <div className="inspector-divider" />

            {/* AI Insight */}
            <div className="inspector-section">
              <div className="ai-insight">
                <div className="ai-insight-header">
                  <div className="ai-insight-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="ai-insight-label">AI Insight</span>
                </div>
                <p className="ai-insight-text">{ward.aiInsight}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="inspector-divider" />

            {/* Metrics Grid */}
            <div className="inspector-section">
              <h3 className="section-label">Key Metrics</h3>
              <div className="metrics-grid">
                <MetricTile
                  icon={Droplets}
                  label="Groundwater"
                  value={ward.metrics.groundwater}
                  unit="%"
                  trend="down"
                />
                <MetricTile
                  icon={CloudRain}
                  label="Rainfall"
                  value={ward.metrics.rainfall}
                  unit="mm"
                  trend="up"
                />
                <MetricTile
                  icon={Truck}
                  label="Supply"
                  value={ward.metrics.supply}
                  unit="MLD"
                  trend="stable"
                />
                <MetricTile
                  icon={TrendingUp}
                  label="Forecast"
                  value={ward.metrics.forecast}
                  unit="/10"
                  trend="down"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="inspector-divider" />

            {/* Actions */}
            <div className="inspector-section">
              <h3 className="section-label">Actions</h3>
              <div className="inspector-actions">
                <motion.button
                  className="inspector-action-btn primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <BarChart3 size={16} />
                  <span>Full Report</span>
                </motion.button>
                <motion.button
                  className="inspector-action-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={16} />
                  <span>Export</span>
                </motion.button>
                <motion.button
                  className="inspector-action-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Metric Tile Component
interface MetricTileProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

function MetricTile({ icon: Icon, label, value, unit, trend }: MetricTileProps) {
  const trendColors = {
    up: '#67C587',
    down: '#D95B5B',
    stable: '#5A5A5A',
  };

  return (
    <motion.div
      className="metric-tile"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div className="metric-content">
        <span className="metric-label">{label}</span>
        <div className="metric-value-row">
          <span className="metric-value">{value}</span>
          <span className="metric-unit">{unit}</span>
          {trend !== 'stable' && (
            <motion.span
              className="metric-trend"
              style={{ color: trendColors[trend] }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {trend === 'up' ? '↑' : '↓'}
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}