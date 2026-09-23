import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { OrderItem, VehicleItem, RouteGenerateInput } from '../shared/schemas';
import {
  Route,
  Package,
  Truck,
  Sparkles,
  CheckSquare,
  Square,
  Calendar,
  Zap,
  Sliders,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const RouteGeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];

  const [routeDate, setRouteDate] = useState(todayStr);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [objective, setObjective] = useState<'minimize_time' | 'minimize_distance' | 'balance_load'>(
    'minimize_time'
  );

  const [error, setError] = useState<string | null>(null);

  // Fetch pending orders
  const { data: orders, isLoading: ordersLoading } = useQuery<OrderItem[]>({
    queryKey: ['orders-for-routing'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    },
  });

  // Fetch active vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<VehicleItem[]>({
    queryKey: ['vehicles-for-routing'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  // Auto select all pending orders and active vehicles whenever orders/vehicles load
  React.useEffect(() => {
    if (orders) {
      const pendingIds = orders.filter((o) => o.status === 'pending' || o.status === 'assigned').map((o) => o.id);
      setSelectedOrderIds((prev) => {
        // Combine previous selections with any newly added pending orders
        const combined = Array.from(new Set([...prev, ...pendingIds]));
        return combined.length > 0 ? combined : pendingIds;
      });
    }
  }, [orders]);

  React.useEffect(() => {
    if (vehicles && selectedVehicleIds.length === 0) {
      const activeIds = vehicles.filter((v) => v.is_active).map((v) => v.id);
      setSelectedVehicleIds(activeIds);
    }
  }, [vehicles]);

  const generateMutation = useMutation({
    mutationFn: async (payload: RouteGenerateInput) => {
      const res = await api.post('/routes/generate', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      // Navigate to Dashboard to display all active multi-vehicle routes simultaneously on the map
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Route optimization failed');
    },
  });

  const toggleOrderSelect = (id: string) => {
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleVehicleSelect = (id: string) => {
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAllOrders = () => {
    if (!orders) return;
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const handleSelectAllVehicles = () => {
    if (!vehicles) return;
    if (selectedVehicleIds.length === vehicles.length) {
      setSelectedVehicleIds([]);
    } else {
      setSelectedVehicleIds(vehicles.map((v) => v.id));
    }
  };

  const handleGenerateSubmit = () => {
    setError(null);
    if (selectedOrderIds.length === 0) {
      setError('Please select at least 1 delivery order');
      return;
    }
    if (selectedVehicleIds.length === 0) {
      setError('Please select at least 1 fleet vehicle');
      return;
    }

    generateMutation.mutate({
      route_date: routeDate,
      order_ids: selectedOrderIds,
      vehicle_ids: selectedVehicleIds,
      objective,
    });
  };

  // Calculate payload capacity totals
  const totalSelectedOrderWeight =
    orders
      ?.filter((o) => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + Number(o.weight_kg), 0) || 0;

  const totalVehicleWeightCapacity =
    vehicles
      ?.filter((v) => selectedVehicleIds.includes(v.id))
      .reduce((sum, v) => sum + Number(v.max_weight_kg), 0) || 0;

  const capacityRatio = totalVehicleWeightCapacity > 0 ? (totalSelectedOrderWeight / totalVehicleWeightCapacity) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Route className="h-6 w-6 text-indigo-400" />
            <span>Generate Optimized Routes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            CVRP Solver with Capacity, Priority Weighting, Time Windows & Gemini AI Dispatch Summaries
          </p>
        </div>

        <button
          onClick={handleGenerateSubmit}
          disabled={generateMutation.isPending}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 transition disabled:opacity-50"
        >
          {generateMutation.isPending ? (
            <>
              <Zap className="h-5 w-5 animate-spin text-white" />
              <span>Solving CVRP & Matrix...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-emerald-200" />
              <span>Run CVRP Route Optimization</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>Dispatch Date</span>
          </label>
          <input
            type="date"
            value={routeDate}
            onChange={(e) => setRouteDate(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <span>Optimization Objective</span>
          </label>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value as any)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="minimize_time">Minimize Travel Time (Fastest)</option>
            <option value="minimize_distance">Minimize Total Distance (Fuel Saving)</option>
            <option value="balance_load">Balance Fleet Payload Load</option>
          </select>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Total Selected Payload</span>
            <span className={`font-bold ${capacityRatio > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
              {capacityRatio.toFixed(0)}% Cap
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {totalSelectedOrderWeight} kg / {totalVehicleWeightCapacity} kg Total Fleet Limit
          </p>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${
                capacityRatio > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, capacityRatio)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Selection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Selection Column */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">
                Select Orders ({selectedOrderIds.length} / {orders?.length || 0})
              </h2>
            </div>

            <button
              onClick={handleSelectAllOrders}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
            >
              {selectedOrderIds.length === (orders?.length || 0) ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span>Select All</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {ordersLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading orders...</div>
            ) : orders && orders.length > 0 ? (
              orders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                return (
                  <div
                    key={order.id}
                    onClick={() => toggleOrderSelect(order.id)}
                    className={`rounded-xl p-3.5 border transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200">{order.recipient_name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            order.priority === 'urgent'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {order.priority.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate">{order.address}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Weight: {order.weight_kg} kg</span>
                        <span>Window: {order.time_window_start || '09:00'} - {order.time_window_end || '17:00'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No orders available.</div>
            )}
          </div>
        </div>

        {/* Vehicles Selection Column */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">
                Select Fleet Vehicles ({selectedVehicleIds.length} / {vehicles?.length || 0})
              </h2>
            </div>

            <button
              onClick={handleSelectAllVehicles}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
            >
              {selectedVehicleIds.length === (vehicles?.length || 0) ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span>Select All</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {vehiclesLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading vehicles...</div>
            ) : vehicles && vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                const isSelected = selectedVehicleIds.includes(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => toggleVehicleSelect(vehicle.id)}
                    className={`rounded-xl p-3.5 border transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200">{vehicle.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {vehicle.vehicle_type || 'Van'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate">{vehicle.depot_address || 'Central Depot'}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Max Weight: {vehicle.max_weight_kg} kg</span>
                        <span>Max Vol: {vehicle.max_volume_m3 || 8} m³</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No active vehicles available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
