import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DashboardStats, RouteItem, OrderItem } from '../shared/schemas';
import { DashboardStatsGrid } from '../components/DashboardStatsGrid';
import { RouteSummaryCard } from '../components/RouteSummaryCard';
import { RouteMap } from '../components/RouteMap';
import { getVehicleColor } from '../lib/utils';
import { Route, Package, Truck, PlusCircle, Sparkles, ArrowRight, UploadCloud, Map } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
  });

  const { data: routes, isLoading: routesLoading } = useQuery<RouteItem[]>({
    queryKey: ['routes-dashboard'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const { data: pendingOrders } = useQuery<OrderItem[]>({
    queryKey: ['orders-pending'],
    queryFn: async () => {
      const res = await api.get('/orders?status=pending');
      return res.data;
    },
  });

  // Prepare multi-route data for unified map rendering
  const activeRoutesForMap = routes
    ? routes
        .filter((r) => r.vehicle && r.stops && r.stops.length > 0)
        .map((r, idx) => ({
          vehicle: r.vehicle!,
          stops: r.stops || [],
          color: getVehicleColor(idx),
        }))
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-100">Dispatcher Control Center</h1>
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time Capacitated Vehicle Routing Problem (CVRP) Optimization & Dispatch Summary
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <Package className="h-4 w-4 text-indigo-400" />
            <span>Manage Orders</span>
          </Link>

          <Link
            to="/routes/generate"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
          >
            <Route className="h-4 w-4" />
            <span>Optimize Active Routes</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {statsLoading ? (
        <div className="h-40 rounded-2xl glass-panel animate-pulse"></div>
      ) : stats ? (
        <DashboardStatsGrid stats={stats} />
      ) : null}

      {/* Unified Multi-Vehicle Fleet Map */}
      {activeRoutesForMap.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">Multi-Vehicle Fleet Live Map</h2>
              <span className="text-xs text-slate-400">({activeRoutesForMap.length} Active Vehicles)</span>
            </div>

            {/* Vehicle Color Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              {activeRoutesForMap.map((r, idx) => (
                <div key={r.vehicle.id} className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span
                    className="h-3 w-3 rounded-full inline-block shadow"
                    style={{ backgroundColor: r.color }}
                  ></span>
                  <span className="text-slate-200">{r.vehicle.name}</span>
                  <span className="text-[10px] text-slate-400">({r.stops.length} stops)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[420px] w-full rounded-xl overflow-hidden">
            <RouteMap routes={activeRoutesForMap} stops={[]} />
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Routes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">Active Fleet Routes</h2>
            </div>
            <Link
              to="/routes/history"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View Route Log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {routesLoading ? (
            <div className="space-y-4">
              <div className="h-48 rounded-2xl glass-panel animate-pulse"></div>
              <div className="h-48 rounded-2xl glass-panel animate-pulse"></div>
            </div>
          ) : routes && routes.length > 0 ? (
            <div className="space-y-4">
              {routes.slice(0, 3).map((route) => (
                <RouteSummaryCard key={route.id} route={route} showActions={true} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
                <Route className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-200">No Active Routes Scheduled</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select pending delivery orders and available fleet vehicles to run the CVRP optimization solver.
              </p>
              <Link
                to="/routes/generate"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Generate Today's Routes</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Pending Orders Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">Pending Orders</h2>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              {pendingOrders?.length || 0}
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 max-h-[500px] overflow-y-auto">
            {pendingOrders && pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200 truncate max-w-[140px]">
                      {order.recipient_name}
                    </span>
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

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>Weight: {order.weight_kg} kg</span>
                    <span>Window: {order.time_window_start || '09:00'} - {order.time_window_end || '17:00'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-400">All current orders assigned to active routes!</p>
                <Link
                  to="/orders"
                  className="text-xs text-indigo-400 font-semibold hover:underline inline-block"
                >
                  + Add New Delivery Stop
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
