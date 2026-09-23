import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RouteItem, RouteStopItem, DelaySimulationInput } from '../shared/schemas';
import { RouteMap } from '../components/RouteMap';
import { RouteSummaryCard } from '../components/RouteSummaryCard';
import { DelayModal } from '../components/DelayModal';
import {
  Route,
  ArrowLeft,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { formatDistance, formatDuration } from '../lib/utils';

export const RouteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedStopForDelay, setSelectedStopForDelay] = useState<RouteStopItem | null>(null);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);

  const { data: route, isLoading } = useQuery<RouteItem>({
    queryKey: ['route', id],
    queryFn: async () => {
      const res = await api.get(`/routes/${id}`);
      return res.data;
    },
  });

  const simulateDelayMutation = useMutation({
    mutationFn: async (payload: DelaySimulationInput) => {
      const res = await api.post(`/routes/${id}/simulate-delay`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleSimulateDelay = async (data: DelaySimulationInput) => {
    await simulateDelayMutation.mutateAsync(data);
  };

  const handleStopClick = (stop: RouteStopItem) => {
    setSelectedStopForDelay(stop);
    setIsDelayModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Loading Route Map & Details...</p>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Route Not Found</h2>
        <p className="text-xs text-slate-400">The requested route could not be retrieved.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-100">
                Route #{route.id.substring(0, 8)}
              </h1>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                {route.vehicle?.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduled Date: {route.route_date} • {route.stops?.length || 0} Delivery Stops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              route.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : route.status === 'in_progress'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {route.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* AI Summary Card */}
      <RouteSummaryCard route={route} showActions={false} />

      {/* Map & Stop Sequence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Live Map */}
        <div className="lg:col-span-2 h-[500px]">
          <RouteMap
            stops={route.stops || []}
            vehicle={route.vehicle}
            onStopClick={handleStopClick}
            disruptedStopId={selectedStopForDelay?.id}
          />
        </div>

        {/* Sequenced Stop Table Sidebar */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 flex flex-col h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-400" />
              <span>Sequenced Stop Order</span>
            </h2>
            <span className="text-xs text-slate-400">{route.stops?.length || 0} Stops</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {route.stops && route.stops.length > 0 ? (
              route.stops.map((stop) => (
                <div
                  key={stop.id}
                  className={`rounded-xl p-3.5 border transition space-y-2 ${
                    stop.was_rerouted
                      ? 'bg-red-950/20 border-red-500/40'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white shadow">
                        #{stop.sequence_number}
                      </span>
                      <span className="font-semibold text-xs text-slate-100 truncate max-w-[150px]">
                        {stop.order?.recipient_name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stop.order?.priority === 'urgent'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {stop.order?.priority?.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate pl-8">{stop.order?.address}</p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 pl-8">
                    <span className="font-medium text-emerald-400">
                      ETA: {stop.eta ? new Date(stop.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                    <button
                      onClick={() => handleStopClick(stop)}
                      className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>Simulate Delay</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">No stops sequenced.</div>
            )}
          </div>
        </div>
      </div>

      {/* Disruption Event Log */}
      {route.events && route.events.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-bold text-slate-100">Disruption & Recomputation Log</h2>
          </div>

          <div className="space-y-3">
            {route.events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl bg-slate-900/80 p-4 border border-red-500/30 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-400 uppercase tracking-wider">{event.event_type}</span>
                  <span className="text-slate-400">{new Date(event.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs font-semibold text-slate-200">{event.description}</p>

                {event.ai_explanation && (
                  <div className="rounded-lg bg-indigo-950/30 border border-indigo-500/20 p-3 text-xs text-slate-300 italic flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>"{event.ai_explanation}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <DelayModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        stop={selectedStopForDelay}
        onSimulate={handleSimulateDelay}
      />
    </div>
  );
};
