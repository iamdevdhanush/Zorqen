import { useState } from 'react';
import { motion } from 'framer-motion';
import { Map, Thermometer, Satellite, CloudRain } from 'lucide-react';

export type ViewMode = 'ward' | 'heatmap' | 'satellite' | 'forecast';

interface BottomToolbarProps {
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function BottomToolbar({ activeMode, onModeChange }: BottomToolbarProps) {
  const modes: { id: ViewMode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'ward', label: 'Ward', icon: Map },
    { id: 'heatmap', label: 'Heatmap', icon: Thermometer },
    { id: 'satellite', label: 'Satellite', icon: Satellite },
    { id: 'forecast', label: 'Forecast', icon: CloudRain },
  ];

  return (
    <div className="bottom-toolbar">
      {modes.map((mode) => (
        <motion.button
          key={mode.id}
          className={`toolbar-btn ${activeMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          whileHover={{ scale: activeMode === mode.id ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <mode.icon size={16} />
          <span>{mode.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
