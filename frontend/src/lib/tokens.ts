/**
 * VAYU AI Design Tokens
 * Spatial Intelligence Operating System for Bengaluru Water Risk
 */

export const colors = {
  background: '#ECEEF1',
  primary: '#111111',
  secondary: '#5A5A5A',
  blue: '#2563EB',
  safe: '#67C587',
  moderate: '#D6B83C',
  high: '#F28C28',
  critical: '#D95B5B',
  cyan: '#06B6D4',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
}

export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFeatures: 'calt, liga, tnum',
  sizes: {
    h1: 42,
    h2: 30,
    body: 15,
    caption: 12,
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
}

export const spacing = [0, 8, 12, 16, 20, 24, 32, 40]

export const radius = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 30,
  full: 999,
}

export const shadows = {
  glass: '0 10px 30px rgba(0, 0, 0, 0.08)',
  glow: '0 0 20px rgba(37, 99, 235, 0.4)',
  lift: '0 2px 12px rgba(0, 0, 0, 0.08)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}

export const blur = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '24px',
  xl: '32px',
}

export const glass = {
  backdrop: '24px',
  background: 'rgba(236, 238, 241, 0.7)',
}

export const layout = {
  viewport: {
    width: 1680,
    height: 945,
  },
  grid: {
    columns: '72px 1fr',
    iconRail: '72px',
  },
  map: {
    minHeight: '85vh',
  },
}

export const zIndices = {
  base: 1,
  floating: 10,
  modal: 100,
  overlay: 50,
}

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    standard: [0.4, 0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
    gentle: [0.4, 0, 0.2, 0.9],
  },
}

export const mapConfig = {
  tileLayer: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  subdomains: ['a', 'b', 'c', 'd'],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}

export const geoJsonUrl = 'https://raw.githubusercontent.com/datameet/Municipal_Spatial_Data/master/Bangalore/BBMP.GeoJSON'

export const icons = [
  { id: 'intelligence', name: 'Intelligence', keyword: 'ai' },
  { id: 'explorer', name: 'Explorer', keyword: 'map' },
  { id: 'forecast', name: 'Forecast', keyword: 'weather' },
  { id: 'reports', name: 'Reports', keyword: 'reports' },
  { id: 'community', name: 'Community', keyword: 'community' },
  { id: 'settings', name: 'Settings', keyword: 'settings' },
]

export const quickActions = [
  { id: 'compare', name: 'Compare Wards', keyword: 'compare' },
  { id: 'highest-risk', name: 'Highest Risk', keyword: 'risk' },
  { id: 'hotspots', name: 'Tanker Hotspots', keyword: 'tanker' },
  { id: 'forecast', name: 'Water Forecast', keyword: 'forecast' },
  { id: 'groundwater', name: 'Low Groundwater', keyword: 'groundwater' },
]

export const commands = [
  { id: 'find-ward', name: 'Find Ward', keyword: 'find' },
  { id: 'compare-wards', name: 'Compare Wards', keyword: 'compare' },
  { id: 'highest-risk', name: 'Show Highest-Risk Wards', keyword: 'risk' },
  { id: 'toggle-heatmap', name: 'Toggle Heatmap', keyword: 'heatmap' },
  { id: 'zoom-kr-puram', name: 'Zoom to KR Puram', keyword: 'kr' },
]

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  blur,
  glass,
  layout,
  zIndices,
  animations,
  mapConfig,
  geoJsonUrl,
  icons,
  quickActions,
  commands,
}