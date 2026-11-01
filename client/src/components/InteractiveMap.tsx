import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icon issue with bundlers
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  type?: 'hospital' | 'request' | 'donor';
}

interface Props {
  center?: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  showProgressiveRadius?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
  selectedCoord?: [number, number] | null;
}

const MapRecenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const LocationPicker: React.FC<{ onSelect: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const InteractiveMap: React.FC<Props> = ({
  center = [18.5204, 73.8567], // Pune coordinates default
  zoom = 12,
  markers = [],
  showProgressiveRadius = false,
  onLocationSelect,
  selectedCoord,
}) => {
  return (
    <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur px-2.5 py-1 rounded shadow text-[11px] font-semibold text-charcoal-700 flex items-center gap-1.5 border border-gray-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        OpenStreetMap (Demo Map View)
      </div>

      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="w-full h-full">
        <MapRecenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && <LocationPicker onSelect={onLocationSelect} />}

        {/* Selected Pin for picker */}
        {selectedCoord && (
          <Marker position={selectedCoord} icon={redIcon}>
            <Popup>
              <div className="text-xs">
                <strong>Selected Location</strong>
                <br />
                {selectedCoord[0].toFixed(4)}, {selectedCoord[1].toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Progressive Search Radius Circles */}
        {showProgressiveRadius && (
          <>
            <Circle
              center={center}
              radius={5000}
              pathOptions={{ color: '#B91C32', fillColor: '#B91C32', fillOpacity: 0.12, weight: 2 }}
            />
            <Circle
              center={center}
              radius={10000}
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.06, weight: 1.5, dashArray: '4, 4' }}
            />
            <Circle
              center={center}
              radius={25000}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.03, weight: 1, dashArray: '6, 6' }}
            />
          </>
        )}

        {/* Dynamic Markers */}
        {markers.map((m) => {
          let icon = blueIcon;
          if (m.type === 'hospital') icon = redIcon;
          if (m.type === 'donor') icon = greenIcon;

          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-charcoal-900 block">{m.title}</strong>
                  {m.subtitle && <span className="text-gray-600 block mt-0.5">{m.subtitle}</span>}
                  <span className="text-[10px] text-gray-500 block mt-1">
                    {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
