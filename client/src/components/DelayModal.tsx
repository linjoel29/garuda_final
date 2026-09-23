import React, { useState } from 'react';
import { RouteStopItem, DelaySimulationInput, disruptionTypeEnum } from '../shared/schemas';
import { X, AlertTriangle, RefreshCw, Clock, ShieldAlert } from 'lucide-react';

interface DelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: RouteStopItem | null;
  onSimulate: (data: DelaySimulationInput) => Promise<void>;
}

export const DelayModal: React.FC<DelayModalProps> = ({ isOpen, onClose, stop, onSimulate }) => {
  const [eventType, setEventType] = useState<'delay' | 'closure' | 'breakdown' | 'extended_stop'>('delay');
  const [delayMinutes, setDelayMinutes] = useState<number>(20);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !stop) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSimulate({
        stop_id: stop.id,
        event_type: eventType,
        delay_minutes: delayMinutes,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to simulate delay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 bg-red-950/20 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Simulate Traffic / Disruption Event</h2>
              <p className="text-xs text-slate-400">Trigger real-time CVRP route recomputation</p>
            </div>
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

          <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-400">Affected Stop #{stop.sequence_number}</span>
              <span className="text-slate-400">Current ETA: {stop.eta || 'N/A'}</span>
            </div>
            <p className="font-semibold text-sm text-slate-100">{stop.order?.recipient_name}</p>
            <p className="text-xs text-slate-400 truncate">{stop.order?.address}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Disruption Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-red-500 focus:outline-none"
            >
              <option value="delay">Unexpected Traffic Delay</option>
              <option value="closure">Road Closure / Blocked Access</option>
              <option value="extended_stop">Stop Taking Longer Than Estimated</option>
              <option value="breakdown">Vehicle Mechanical Issue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Added Delay Duration (minutes)</span>
              <span className="text-red-400 font-bold">{delayMinutes} min</span>
            </label>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Event Notes / Reason</label>
            <input
              type="text"
              placeholder="e.g. Major congestion on 5th Ave due to construction."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none"
            />
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
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Recomputing CVRP Route...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Recompute Route & Explain</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
