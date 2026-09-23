import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  Route,
  History,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/orders', label: 'Delivery Orders', icon: Package },
    { to: '/vehicles', label: 'Fleet Vehicles', icon: Truck },
    { to: '/routes/generate', label: 'Optimize Routes', icon: Route, highlight: true },
    { to: '/routes/history', label: 'Route History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950/60 flex flex-col justify-between py-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4 px-3">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
                    item.highlight && !isActive && 'text-emerald-400 font-semibold'
                  )
                }
              >
                <Icon className={cn('h-4 w-4', item.highlight && 'text-emerald-400')} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="px-4">
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-slate-900/80 p-3.5 text-center">
          <p className="text-xs font-semibold text-slate-200">Need instant dispatch?</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Auto-sequence new orders in seconds.</p>
          <NavLink
            to="/routes/generate"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Generate Now</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
