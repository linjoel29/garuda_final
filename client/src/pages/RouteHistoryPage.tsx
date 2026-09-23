import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RouteItem } from '../shared/schemas';
import { History, Route, Truck, Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { formatDistance, formatDuration, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

export const RouteHistoryPage: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: routes, isLoading } = useQuery<RouteItem[]>({
    queryKey: ['routes-history', dateFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/routes?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <History className="h-6 w-6 text-indigo-400" />
            <span>Route Performance History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit log of generated CVRP delivery routes, actual performance & Gemini AI summaries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading route history...</div>
        ) : routes && routes.length > 0 ? (
          routes.map((route) => (
            <div
              key={route.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">{route.vehicle?.name || 'Vehicle'}</h3>
                    <p className="text-xs text-slate-400">
                      Route Date: {formatDate(route.route_date)} • ID #{route.id.substring(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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

                  <Link
                    to={`/routes/${route.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white transition"
                  >
                    <span>Inspect Route</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Gemini Summary snippet */}
              {route.ai_summary && (
                <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800 text-xs text-slate-300 italic flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>"{route.ai_summary}"</span>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Stops</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">{route.stops?.length || 0}</p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Distance</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {formatDistance(route.total_distance_km || 0)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Total Duration</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {formatDuration(route.total_duration_min || 0)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                  <p className="text-[10px] text-slate-400">Events Logged</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">{route.events?.length || 0}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border border-slate-800">
            <Route className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-base font-bold text-slate-200">No Route History Recorded</p>
            <p className="text-xs text-slate-400">Generated delivery routes will appear in this historical log.</p>
          </div>
        )}
      </div>
    </div>
  );
};
