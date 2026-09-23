import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteStopItem, VehicleItem } from '../shared/schemas';
import { getVehicleColor } from '../lib/utils';
import { MapPin, Navigation, Truck, AlertTriangle } from 'lucide-react';

interface RouteMapProps {
  stops: RouteStopItem[];
  vehicle?: VehicleItem;
  routes?: { vehicle: VehicleItem; stops: RouteStopItem[]; color: string }[];
  onStopClick?: (stop: RouteStopItem) => void;
  disruptedStopId?: string;
}

// Helper to fetch actual road path polyline coordinates from OSRM routing service
async function fetchRoadGeometry(waypoints: [number, number][]): Promise<[number, number][]> {
  if (waypoints.length < 2) return waypoints;
  try {
    const formattedCoords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${formattedCoords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return waypoints;
    const data = await res.json();
    if (data.routes && data.routes[0] && data.routes[0].geometry) {
      // OSRM returns coordinates as [lng, lat], convert back to Leaflet format [lat, lng]
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      return coords;
    }
  } catch (e) {
    console.warn('[RouteMap] Failed to fetch OSRM road geometry, falling back to straight lines:', e);
  }
  return waypoints;
}

// Component to dynamically fit map bounds around markers
const MapBoundsFitter: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, map]);

  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({
  stops,
  vehicle,
  routes,
  onStopClick,
  disruptedStopId,
}) => {
  // Normalize routes data: either multi-route or single route
  const activeRoutes = routes || (vehicle ? [{ vehicle, stops, color: '#6366f1' }] : []);

  // State to hold road geometry paths for each active route indexed by vehicle ID
  const [roadPaths, setRoadPaths] = useState<Record<string, [number, number][]>>({});

  // Collect all coordinate points for map bounds calculations
  const allPoints: [number, number][] = [];

  activeRoutes.forEach((r) => {
    if (r.vehicle.depot_lat && r.vehicle.depot_lng) {
      allPoints.push([Number(r.vehicle.depot_lat), Number(r.vehicle.depot_lng)]);
    }
    r.stops.forEach((s) => {
      if (s.order?.lat && s.order?.lng) {
        allPoints.push([Number(s.order.lat), Number(s.order.lng)]);
      }
    });
  });

  // Fetch road path geometry when activeRoutes change
  useEffect(() => {
    let isMounted = true;

    const loadRoadGeometries = async () => {
      const newPaths: Record<string, [number, number][]> = {};

      for (const r of activeRoutes) {
        const waypoints: [number, number][] = [];
        const depotLat = Number(r.vehicle.depot_lat);
        const depotLng = Number(r.vehicle.depot_lng);

        if (depotLat && depotLng) {
          waypoints.push([depotLat, depotLng]);
        }

        r.stops.forEach((s) => {
          const lat = Number(s.order?.lat);
          const lng = Number(s.order?.lng);
          if (lat && lng) {
            waypoints.push([lat, lng]);
          }
        });

        if (waypoints.length >= 2) {
          const roadCoords = await fetchRoadGeometry(waypoints);
          newPaths[r.vehicle.id] = roadCoords;
        } else {
          newPaths[r.vehicle.id] = waypoints;
        }
      }

      if (isMounted) {
        setRoadPaths(newPaths);
      }
    };

    loadRoadGeometries();

    return () => {
      isMounted = false;
    };
  }, [activeRoutes]);

  const defaultCenter: [number, number] = allPoints.length > 0 ? allPoints[0] : [12.8702, 74.8427]; // Mangalore default

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full z-10"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPoints.length > 0 && <MapBoundsFitter points={allPoints} />}

        {activeRoutes.map((r, rIdx) => {
          const routeColor = r.color || getVehicleColor(rIdx);

          const rawWaypoints: [number, number][] = [];

          // Depot Start Marker
          const depotLat = Number(r.vehicle.depot_lat);
          const depotLng = Number(r.vehicle.depot_lng);

          if (depotLat && depotLng) {
            rawWaypoints.push([depotLat, depotLng]);
          }

          // Order Stop Markers
          const stopMarkers = r.stops.map((stop) => {
            const lat = Number(stop.order?.lat);
            const lng = Number(stop.order?.lng);

            if (!lat || !lng) return null;
            rawWaypoints.push([lat, lng]);

            const isDisrupted = stop.id === disruptedStopId || stop.order_id === disruptedStopId;
            const isUrgent = stop.order?.priority === 'urgent';

            // Create custom HTML icon for Leaflet marker
            const customIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: `
                <div style="
                  background-color: ${isDisrupted ? '#ef4444' : isUrgent ? '#f59e0b' : routeColor};
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 13px;
                  border: 2px solid white;
                  box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                ">
                  ${stop.sequence_number}
                </div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            return (
              <Marker
                key={stop.id}
                position={[lat, lng]}
                icon={customIcon}
              >
                <Popup className="dark-leaflet-popup">
                  <div className="p-1 space-y-1.5 text-slate-900 max-w-[220px]">
                    <div className="flex items-center justify-between border-b pb-1 border-slate-200">
                      <span className="font-bold text-xs text-indigo-700">Stop #{stop.sequence_number}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded text-white ${
                          isUrgent ? 'bg-amber-500' : 'bg-slate-600'
                        }`}
                      >
                        {stop.order?.priority?.toUpperCase()}
                      </span>
                    </div>

                    <p className="font-semibold text-sm leading-tight">{stop.order?.recipient_name}</p>
                    <p className="text-xs text-slate-600 truncate">{stop.order?.address}</p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-medium">
                      <span>ETA: <strong className="text-emerald-600">{stop.eta || 'N/A'}</strong></span>
                      <span>Weight: <strong>{stop.order?.weight_kg} kg</strong></span>
                    </div>

                    {onStopClick && (
                      <button
                        onClick={() => onStopClick(stop)}
                        className="w-full mt-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 shadow"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Simulate Delay
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          });

          // Depot Marker Icon with label badge
          const depotIcon = L.divIcon({
            className: 'depot-leaflet-marker',
            html: `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
              ">
                <div style="
                  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                  width: 36px;
                  height: 36px;
                  border-radius: 10px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 18px;
                  border: 2.5px solid white;
                  box-shadow: 0 4px 14px rgba(37,99,235,0.6);
                ">
                  🏬
                </div>
                <div style="
                  background: rgba(15, 23, 42, 0.9);
                  color: #60a5fa;
                  font-weight: 700;
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  border: 1px solid #3b82f6;
                  margin-top: 3px;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                ">
                  ${r.vehicle.name} Depot
                </div>
              </div>
            `,
            iconSize: [80, 56],
            iconAnchor: [40, 18],
          });

          const polylineCoords = roadPaths[r.vehicle.id] || rawWaypoints;

          return (
            <React.Fragment key={r.vehicle.id}>
              {depotLat && depotLng && (
                <Marker position={[depotLat, depotLng]} icon={depotIcon}>
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <p className="font-bold text-xs text-blue-600">Depot / Start Hub</p>
                      <p className="font-semibold text-sm">{r.vehicle.name}</p>
                      <p className="text-xs text-slate-600">{r.vehicle.depot_address || 'Central Depot'}</p>
                      <p className="text-xs mt-1">Capacity: {r.vehicle.max_weight_kg} kg</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">({depotLat.toFixed(4)}, {depotLng.toFixed(4)})</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {stopMarkers}

              {polylineCoords.length > 1 && (
                <Polyline
                  positions={polylineCoords}
                  pathOptions={{
                    color: routeColor,
                    weight: 5,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

