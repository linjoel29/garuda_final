import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { VehicleItem, VehicleInput } from '../shared/schemas';
import { VehicleFormModal } from '../components/VehicleFormModal';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const VehiclesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);

  const { data: vehicles, isLoading } = useQuery<VehicleItem[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VehicleInput) => {
      const res = await api.post('/vehicles', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleInput> }) => {
      const res = await api.patch(`/vehicles/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleCreateOrUpdate = async (data: VehicleInput) => {
    if (selectedVehicle) {
      await updateMutation.mutateAsync({ id: selectedVehicle.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const toggleActiveStatus = async (v: VehicleItem) => {
    await updateMutation.mutateAsync({
      id: v.id,
      data: { is_active: !v.is_active },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-indigo-400" />
            <span>Fleet Vehicle Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure vehicle payload weight limits, volumetric capacities, and depot locations
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedVehicle(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            Loading vehicle fleet...
          </div>
        ) : vehicles && vehicles.length > 0 ? (
          vehicles.map((v) => (
            <div
              key={v.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-slate-700 transition relative overflow-hidden group"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">{v.name}</h3>
                    <p className="text-xs text-slate-400">{v.vehicle_type || 'Van'}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleActiveStatus(v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition border ${
                    v.is_active
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {v.is_active ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Max Payload Weight</p>
                  <p className="text-lg font-bold text-slate-100 mt-0.5">{v.max_weight_kg} kg</p>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Max Volume Capacity</p>
                  <p className="text-lg font-bold text-slate-100 mt-0.5">{v.max_volume_m3 || 8} m³</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-400 pt-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  Depot Location:
                </p>
                <p className="text-slate-400 text-[11px] truncate">{v.depot_address || 'Central Depot'}</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedVehicle(v);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Edit vehicle"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => deleteMutation.mutate(v.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                  title="Delete vehicle"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full glass-panel rounded-2xl p-12 text-center space-y-3 border border-slate-800">
            <Truck className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-base font-bold text-slate-200">No Fleet Vehicles Registered</p>
            <p className="text-xs text-slate-400">Add delivery vehicles to run route optimization solves.</p>
          </div>
        )}
      </div>

      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedVehicle}
      />
    </div>
  );
};
