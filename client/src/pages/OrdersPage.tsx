import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { OrderItem, OrderInput } from '../shared/schemas';
import { OrderFormModal } from '../components/OrderFormModal';
import { CSVImportModal } from '../components/CSVImportModal';
import {
  Package,
  Plus,
  UploadCloud,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const { data: orders, isLoading } = useQuery<OrderItem[]>({
    queryKey: ['orders', search, priorityFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/orders?${params.toString()}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OrderInput) => {
      const res = await api.post('/orders', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrderInput> }) => {
      const res = await api.patch(`/orders/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (csvText: string) => {
      const res = await api.post('/orders/bulk-import', { csvText });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleCreateOrUpdate = async (data: OrderInput) => {
    if (selectedOrder) {
      await updateMutation.mutateAsync({ id: selectedOrder.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Package className="h-6 w-6 text-indigo-400" />
            <span>Delivery Order Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, edit, bulk-import CSV delivery stops with geocoded coordinates & priority levels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <UploadCloud className="h-4 w-4 text-emerald-400" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => {
              setSelectedOrder(null);
              setIsOrderModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Delivery Order</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search recipient or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Filter:</span>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="standard">Standard</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Recipient / Destination</th>
                <th className="py-3.5 px-4">Priority & Category</th>
                <th className="py-3.5 px-4">Weight / Volume</th>
                <th className="py-3.5 px-4">Time Window</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading delivery orders...
                  </td>
                </tr>
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-semibold text-slate-100">{order.recipient_name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-xs">{order.address}</span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          order.priority === 'urgent'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {order.priority.toUpperCase()}
                      </span>
                      <p className="text-[10px] text-slate-400">{order.category || 'Standard'}</p>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-semibold text-slate-200">{order.weight_kg} kg</p>
                      <p className="text-[10px] text-slate-400">{order.volume_m3 || 0.5} m³</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {order.time_window_start || '09:00'} - {order.time_window_end || '17:00'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'assigned'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : order.status === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                          title="Edit order"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => deleteMutation.mutate(order.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                          title="Delete order"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-2">
                    <Package className="h-8 w-8 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold">No Delivery Orders Found</p>
                    <p className="text-xs">Add an order manually or import CSV stops to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedOrder}
      />

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={async (csvText) => {
          await bulkImportMutation.mutateAsync(csvText);
        }}
      />
    </div>
  );
};
