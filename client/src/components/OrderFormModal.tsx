import React, { useState, useEffect } from 'react';
import { OrderItem, OrderInput, orderSchema } from '../shared/schemas';
import { X, Package, MapPin, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrderInput) => Promise<void>;
  initialData?: OrderItem | null;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<OrderInput>({
    recipient_name: '',
    address: '',
    weight_kg: 20,
    volume_m3: 0.5,
    priority: 'standard',
    category: 'Standard',
    time_window_start: '09:00',
    time_window_end: '17:00',
    special_instructions: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        recipient_name: initialData.recipient_name,
        address: initialData.address,
        weight_kg: Number(initialData.weight_kg),
        volume_m3: initialData.volume_m3 ? Number(initialData.volume_m3) : 0.5,
        priority: initialData.priority,
        category: initialData.category || 'Standard',
        time_window_start: initialData.time_window_start || '09:00',
        time_window_end: initialData.time_window_end || '17:00',
        special_instructions: initialData.special_instructions || '',
      });
    } else {
      setFormData({
        recipient_name: '',
        address: '',
        weight_kg: 20,
        volume_m3: 0.5,
        priority: 'standard',
        category: 'Standard',
        time_window_start: '09:00',
        time_window_end: '17:00',
        special_instructions: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validated = orderSchema.parse(formData);
      await onSubmit(validated);
      onClose();
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors.map((e: any) => e.message).join(', '));
      } else {
        setError(err.message || 'Validation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {initialData ? 'Edit Delivery Order' : 'Create New Delivery Order'}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Recipient Name / Business</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Health Pharmacy"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Order Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Standard">Standard Package</option>
                <option value="Fragile">Fragile Electronics</option>
                <option value="Refrigerated">Refrigerated / Medical</option>
                <option value="Urgent">Urgent Parcel</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Delivery Address</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. 350 5th Ave, New York, NY 10118"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Weight (kg)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Volume (m³)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.volume_m3 || ''}
                onChange={(e) => setFormData({ ...formData, volume_m3: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent / Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Time Window Start</label>
              <input
                type="text"
                placeholder="09:00"
                value={formData.time_window_start || ''}
                onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Time Window End</label>
              <input
                type="text"
                placeholder="17:00"
                value={formData.time_window_end || ''}
                onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Special Delivery Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Leave with security desk, ring doorbell twice."
              value={formData.special_instructions || ''}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
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
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Saving Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{initialData ? 'Update Order' : 'Save Order'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
