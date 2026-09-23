import React from 'react';
import { RouteItem } from '../shared/schemas';
import { Sparkles, Truck, Clock, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDistance, formatDuration } from '../lib/utils';
import { Link } from 'react-router-dom';

interface RouteSummaryCardProps {
  route: RouteItem;
  showActions?: boolean;
}

export const RouteSummaryCard: React.FC<RouteSummaryCardProps> = ({ route, showActions = true }) => {
  const urgentCount = route.stops?.filter((s) => s.order?.priority === 'urgent').length || 0;
  const stopsCount = route.stops?.length || 0;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">{route.vehicle?.name || 'Assigned Vehicle'}</h3>
            <p className="text-xs text-slate-400">
              {route.vehicle?.vehicle_type || 'Van'} • Max Cap: {route.vehicle?.max_weight_kg || 'N/A'} kg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
            {route.route_date}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
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

      {/* AI Dispatch Summary Box */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/20 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
          <Sparkles className="h-4 w-4 animate-spin-slow text-indigo-400" />
          <span>Gemini AI Dispatch Summary</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed italic">
          "{route.ai_summary || 'Route optimized for capacity, time window constraints, and priority orders.'}"
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
            <span>Total Stops</span>
          </div>
          <p className="text-lg font-bold text-slate-100">{stopsCount}</p>
          {urgentCount > 0 && (
            <p className="text-[10px] text-amber-400 font-semibold mt-0.5">{urgentCount} Urgent</p>
          )}
        </div>

        <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Est. Time</span>
          </div>
          <p className="text-lg font-bold text-slate-100">{formatDuration(route.total_duration_min || 0)}</p>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
            <Truck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Distance</span>
          </div>
          <p className="text-lg font-bold text-slate-100">{formatDistance(route.total_distance_km || 0)}</p>
        </div>
      </div>

      {/* Disruption Alert banner if events logged */}
      {route.events && route.events.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-red-300">Disruption Logged</p>
            <p className="text-slate-300">{route.events[0].ai_explanation || route.events[0].description}</p>
          </div>
        </div>
      )}

      {showActions && (
        <div className="pt-2 flex justify-end">
          <Link
            to={`/routes/${route.id}`}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition"
          >
            <span>View Live Map & Stops</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
