import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Compass,
  CloudRain,
  FileText,
  Users,
  Settings,
} from 'lucide-react';

export type RailView = 'intelligence' | 'explorer' | 'forecast' | 'reports' | 'community' | 'settings';

interface RailContextType {
  activeView: RailView;
  setActiveView: (view: RailView) => void;
}

const RailContext = createContext<RailContextType | null>(null);

export const useRail = () => {
  const ctx = useContext(RailContext);
  if (!ctx) throw new Error('useRail must be used within IconRail');
  return ctx;
};

interface IconRailProps {
  children: React.ReactNode;
}

export function IconRail({ children }: IconRailProps) {
  const [activeView, setActiveView] = useState<RailView>('explorer');

  return (
    <RailContext.Provider value={{ activeView, setActiveView }}>
      <nav className="icon-rail">
        <div className="icon-rail-inner">
          <RailIcon
            view="intelligence"
            icon={Brain}
            label="Intelligence"
          />
          <RailIcon
            view="explorer"
            icon={Compass}
            label="Explorer"
          />
          <RailIcon
            view="forecast"
            icon={CloudRain}
            label="Forecast"
          />
          <RailIcon
            view="reports"
            icon={FileText}
            label="Reports"
          />
          <RailIcon
            view="community"
            icon={Users}
            label="Community"
          />
          <div className="icon-rail-spacer" />
          <RailIcon
            view="settings"
            icon={Settings}
            label="Settings"
          />
        </div>
      </nav>
      {children}
    </RailContext.Provider>
  );
}

interface RailIconProps {
  view: RailView;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}

function RailIcon({ view, icon: Icon, label }: RailIconProps) {
  const { activeView, setActiveView } = useRail();
  const isActive = activeView === view;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="rail-icon-wrapper">
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="rail-tooltip"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        className={`rail-icon ${isActive ? 'active' : ''}`}
        onClick={() => setActiveView(view)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <Icon size={22} strokeWidth={1.5} />
        {isActive && (
          <motion.div
            className="rail-indicator"
            layoutId="rail-indicator"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    </div>
  );
}