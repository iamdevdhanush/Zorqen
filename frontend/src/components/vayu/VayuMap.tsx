import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import type { WardData } from './WardInspector';

// Bengaluru Center
const BENGALURU_CENTER: L.LatLngTuple = [12.9716, 77.5946];
const BENGALURU_ZOOM = 11;

// CARTO Positron Tile Layer
const CARTO_POSITRON = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

interface VayuMapProps {
  onWardSelect: (ward: WardData) => void;
  selectedWardId: string | null;
}

export function VayuMap({ onWardSelect, selectedWardId }: VayuMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const wardsLayerRef = useRef<L.GeoJSON | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: BENGALURU_CENTER,
      zoom: BENGALURU_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // Add CARTO Positron tiles
    L.tileLayer(CARTO_POSITRON, {
      maxZoom: 19,
      subdomains: 'abcd',
      className: 'map-tiles',
    }).addTo(map);

    // Add custom zoom control later (via React)
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Load Ward GeoJSON
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const loadWards = async () => {
      try {
        // Using the official BBMP 198 ward GeoJSON from GitHub
        const response = await fetch(
          'https://raw.githubusercontent.com/datameet/Municipal_Spatial_Data/master/Bangalore/BBMP.GeoJSON'
        );
        const geojson = await response.json();

        // Style functions
        const getStyle = (feature: any): L.PathOptions => {
          const isSelected = feature.properties?.WARD_NUM === selectedWardId;
          return {
            fillColor: 'transparent',
            fillOpacity: 0,
            color: isSelected ? '#2563EB' : '#C8CCD0',
            weight: isSelected ? 2.5 : 1,
            opacity: 1,
          };
        };

        const getHoverStyle = (): L.PathOptions => ({
          fillColor: '#2563EB',
          fillOpacity: 0.08,
          color: '#2563EB',
          weight: 2,
          opacity: 1,
        });

        const getSelectedStyle = (): L.PathOptions => ({
          fillColor: '#2563EB',
          fillOpacity: 0.15,
          color: '#00D4FF',
          weight: 3,
          opacity: 1,
          dashArray: '0',
        });

        // Remove existing layer
        if (wardsLayerRef.current) {
          mapInstanceRef.current.removeLayer(wardsLayerRef.current);
        }

        // Create new layer
        const wardsLayer = L.geoJSON(geojson, {
          style: getStyle,
          onEachFeature: (feature, layer) => {
            const wardName = feature.properties?.WARD_NAME || 'Unknown Ward';
            const wardNum = feature.properties?.WARD_NUM || '?';

            // Create mock ward data
            const wardData: WardData = {
              id: String(wardNum),
              name: wardName,
              wardNumber: parseInt(wardNum) || 0,
              score: Math.floor(Math.random() * 40) + 60,
              riskLevel: ['safe', 'moderate', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
              lastUpdated: 'today',
              aiInsight: `Water stress levels in ${wardName} have increased by 12% over the past month. Groundwater levels are critically low in northern sectors. Immediate intervention recommended.`,
              metrics: {
                groundwater: Math.floor(Math.random() * 40) + 20,
                rainfall: Math.floor(Math.random() * 100) + 50,
                supply: Math.floor(Math.random() * 30) + 10,
                forecast: Math.floor(Math.random() * 5) + 3,
              },
            };

            // Events
            layer.on({
              mouseover: (e) => {
                const target = e.target as L.Polygon;
                if (selectedWardId !== wardData.id) {
                  target.setStyle(getHoverStyle());
                  target.bringToFront();
                }
              },
              mouseout: (e) => {
                const target = e.target as L.Polygon;
                if (selectedWardId !== wardData.id) {
                  wardsLayer.resetStyle(target);
                }
              },
              click: () => {
                // Ripple effect
                const center = (layer as L.Polygon).getBounds().getCenter();
                const ripple = L.circleMarker(center, {
                  radius: 0,
                  fillColor: '#2563EB',
                  fillOpacity: 0.3,
                  color: 'transparent',
                }).addTo(mapInstanceRef.current!);

                // Animate ripple
                let radius = 0;
                const animate = () => {
                  radius += 3;
                  ripple.setRadius(radius);
                  ripple.setStyle({ fillOpacity: 0.3 - radius / 200 });

                  if (radius < 60) {
                    requestAnimationFrame(animate);
                  } else {
                    ripple.remove();
                  }
                };
                animate();

                // Select ward
                onWardSelect(wardData);
              },
            });

            // Store ward data on layer
            (layer as any).wardData = wardData;
          },
        });

        wardsLayer.addTo(mapInstanceRef.current);
        wardsLayerRef.current = wardsLayer;
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load ward data:', error);
        setIsLoading(false);
      }
    };

    loadWards();
  }, [onWardSelect, selectedWardId]);

  // Update selected ward styling
  useEffect(() => {
    if (!wardsLayerRef.current) return;

    wardsLayerRef.current.eachLayer((layer) => {
      const wardData = (layer as any).wardData as WardData;
      if (wardData) {
        const isSelected = wardData.id === selectedWardId;
        if (isSelected) {
          (layer as L.Polygon).setStyle({
            fillColor: '#2563EB',
            fillOpacity: 0.15,
            color: '#00D4FF',
            weight: 3,
            opacity: 1,
          });
          (layer as L.Polygon).bringToFront();
        } else {
          wardsLayerRef.current!.resetStyle(layer as L.Polygon);
        }
      }
    });
  }, [selectedWardId]);

  // Map control functions
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const handleLocate = useCallback(() => {
    mapInstanceRef.current?.setView(BENGALURU_CENTER, BENGALURU_ZOOM);
  }, []);

  return (
    <>
      {/* Map Container */}
      <div ref={mapRef} className="vayu-map" />

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          className="map-loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="map-loading-content">
            <div className="map-spinner" />
            <span>Loading Bengaluru Wards...</span>
          </div>
        </motion.div>
      )}

      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocate={handleLocate}
      />
    </>
  );
}

// Map Controls Component
interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
}

function MapControls({ onZoomIn, onZoomOut, onLocate }: MapControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  return (
    <div className="map-controls">
      <MapControlButton icon={Search} onClick={() => {}} tooltip="Search" />
      <MapControlButton
        icon={Layers}
        onClick={() => setShowLayers(!showLayers)}
        tooltip="Layers"
        active={showLayers}
      />
      <MapControlButton icon={Crosshair} onClick={onLocate} tooltip="Center" />
      <div className="map-controls-divider" />
      <MapControlButton icon={Plus} onClick={onZoomIn} tooltip="Zoom In" />
      <MapControlButton icon={Minus} onClick={onZoomOut} tooltip="Zoom Out" />
    </div>
  );
}

// Map Control Button
import { Search, Layers, Crosshair, Plus, Minus } from 'lucide-react';

interface MapControlButtonProps {
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
}

function MapControlButton({ icon: Icon, onClick, tooltip, active }: MapControlButtonProps) {
  return (
    <motion.button
      className={`map-control-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={tooltip}
    >
      <Icon size={18} />
    </motion.button>
  );
}