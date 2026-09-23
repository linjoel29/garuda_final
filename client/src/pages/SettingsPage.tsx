import React, { useState } from 'react';
import { Settings, Key, MapPin, Clock, Save, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [depotAddress, setDepotAddress] = useState('100 Central Logistics Hub, New York, NY');
  const [depotLat, setDepotLat] = useState('40.7128');
  const [depotLng, setDepotLng] = useState('-74.0060');
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            <span>Platform Settings & API Keys</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure default depot coordinates, operating hours, and integration status
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {savedSuccess && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <span>Settings saved successfully! Default preferences updated.</span>
          </div>
        )}

        {/* API Status Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">API Integrations Status</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Google Gemini 2.5 API
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active Server SDK
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generates natural language dispatch summaries (Prompt A) and disruption explanations (Prompt B).
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Google Maps Distance Matrix API
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Matrix Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Driving travel-time and road distance matrix solver via Google Maps Platform.
              </p>
            </div>
          </div>
        </div>

        {/* Default Depot Location */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Default Central Depot Configuration</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Depot Address</label>
              <input
                type="text"
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Latitude</label>
                <input
                  type="text"
                  value={depotLat}
                  onChange={(e) => setDepotLat(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Longitude</label>
                <input
                  type="text"
                  value={depotLng}
                  onChange={(e) => setDepotLng(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Operating Hours */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">Dispatch Operating Hours</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Shift Start Time</label>
              <input
                type="text"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Shift End Time</label>
              <input
                type="text"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
          >
            <Save className="h-4 w-4" />
            <span>Save Preference Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
