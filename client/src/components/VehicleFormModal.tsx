import React, { useState, useEffect } from 'react';
import { VehicleItem, VehicleInput, vehicleSchema } from '../shared/schemas';
import { X, Truck, MapPin, AlertTriangle, CheckCircle2, Navigation, Compass, Loader2 } from 'lucide-react';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleInput) => Promise<void>;
  initialData?: VehicleItem | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<VehicleInput>({
    name: '',
    vehicle_type: 'Van',
    max_weight_kg: 1000,
    max_volume_m3: 8,
    depot_lat: 12.8702,
    depot_lng: 74.8427,
    depot_address: 'Central Logistics Hub, Mangalore, KA',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoSuccessMessage, setGeoSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        vehicle_type: initialData.vehicle_type || 'Van',
        max_weight_kg: Number(initialData.max_weight_kg),
        max_volume_m3: initialData.max_volume_m3 ? Number(initialData.max_volume_m3) : 8,
        depot_lat: Number(initialData.depot_lat),
        depot_lng: Number(initialData.depot_lng),
        depot_address: initialData.depot_address || '',
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        name: '',
        vehicle_type: 'Van',
        max_weight_kg: 1000,
        max_volume_m3: 8,
        depot_lat: 12.8702,
        depot_lng: 74.8427,
        depot_address: 'Central Logistics Hub, Mangalore, KA',
        is_active: true,
      });
    }
    setError(null);
    setGeoSuccessMessage(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setError(null);
    setGeoSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        setFormData((prev) => ({
          ...prev,
          depot_lat: lat,
          depot_lng: lng,
          depot_address: prev.depot_address || `Live Location (${lat}, ${lng})`,
        }));

        setGeoLoading(false);
        setGeoSuccessMessage(`Depot set to your current location (${lat}, ${lng})`);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied by browser. Please enable location access in browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('The request to get user location timed out.');
            break;
          default:
            setError('Failed to retrieve current location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validated = vehicleSchema.parse(formData);
      await onSubmit(validated);
      onClose();
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors.map((e: any) => e.message).join(', '));
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to save vehicle');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <Truck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {initialData ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {geoSuccessMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span>{geoSuccessMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Vehicle Name / ID</label>
              <input
                type="text"
                required
                placeholder="e.g. Van 101 (Sprinter)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Vehicle Type</label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as any })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Bike">Cargo Bike (Small / Eco)</option>
                <option value="Van">Delivery Van (Medium)</option>
                <option value="Truck">Freight Truck (Heavy / Large)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Max Weight Capacity (kg)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.max_weight_kg}
                onChange={(e) => setFormData({ ...formData, max_weight_kg: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Max Volume Capacity (m³)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.max_volume_m3 || ''}
                onChange={(e) => setFormData({ ...formData, max_volume_m3: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Start Depot Address</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Central Logistics Hub, Mangalore, KA"
                value={formData.depot_address || ''}
                onChange={(e) => setFormData({ ...formData, depot_address: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Depot Coordinates & Live Geolocation Button */}
          <div className="space-y-2 rounded-xl bg-slate-900/60 p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-indigo-400" />
                <span>Depot Coordinates (Lat / Lng)</span>
              </label>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Use my current location</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Latitude</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.depot_lat}
                  onChange={(e) => setFormData({ ...formData, depot_lat: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Longitude</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.depot_lng}
                  onChange={(e) => setFormData({ ...formData, depot_lng: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Active for auto-dispatch and routing optimization
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Saving Vehicle...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{initialData ? 'Update Vehicle' : 'Save Vehicle'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

