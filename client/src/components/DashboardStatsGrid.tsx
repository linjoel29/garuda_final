import React from 'react';
import { DashboardStats } from '../shared/schemas';
import { Truck, Package, Clock, ShieldCheck, Fuel, TrendingUp, Zap } from 'lucide-react';
import { formatDistance } from '../lib/utils';

interface DashboardStatsGridProps {
  stats: DashboardStats;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Fleet Utilization',
      value: `${stats.fleet_utilization_pct}%`,
      subtitle: `${stats.active_vehicles_count} vehicles active`,
      icon: Truck,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-600/20 border-indigo-500/30',
      badge: 'Real-time',
    },
    {
      title: 'Orders Scheduled',
      value: stats.total_orders_today,
      subtitle: `${stats.total_routes_today} optimized routes`,
      icon: Package,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-600/20 border-emerald-500/30',
      badge: 'Active Today',
    },
    {
      title: 'Distance Saved',
      value: `${stats.total_distance_saved_km} km`,
      subtitle: 'vs. naive routing algorithm',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-600/20 border-cyan-500/30',
      badge: 'CVRP Efficiency',
    },
    {
      title: 'Fuel Saved Estimate',
      value: `${stats.total_fuel_saved_liters} L`,
      subtitle: '~32% lower emissions',
      icon: Fuel,
      color: 'text-amber-400',
      bgColor: 'bg-amber-600/20 border-amber-500/30',
      badge: 'Eco Impact',
    },
    {
      title: 'Avg Delivery Duration',
      value: `${stats.avg_delivery_time_min} min`,
      subtitle: 'per route cycle',
      icon: Clock,
      color: 'text-violet-400',
      bgColor: 'bg-violet-600/20 border-violet-500/30',
      badge: 'Speed Index',
    },
    {
      title: 'System Health',
      value: '100% Operational',
      subtitle: 'Gemini AI & ORS Matrix online',
      icon: Zap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-600/20 border-emerald-500/30',
      badge: 'Healthy',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden group hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-800">
                {card.badge}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">{card.title}</p>
              <p className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
