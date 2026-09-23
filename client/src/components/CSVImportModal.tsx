import React, { useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (csvText: string) => Promise<void>;
}

const SAMPLE_CSV = `recipient_name,address,weight_kg,volume_m3,priority,category,time_window_start,time_window_end,special_instructions
Mount Sinai West,1000 10th Ave New York NY,110,1.2,urgent,Refrigerated,08:30,11:30,Medical lab delivery
Tribeca Grocers,185 Franklin St New York NY,340,3.0,standard,Standard,10:00,15:00,Loading dock entry
Chelsea Tech Tower,111 8th Ave New York NY,90,0.8,standard,Fragile,09:00,12:00,Check in ground floor
Financial Hub,200 Vesey St New York NY,210,2.1,urgent,Standard,11:00,14:00,Express priority package`;

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCsvContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!csvContent.trim()) {
      setError('Please paste CSV content or upload a CSV file.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onImport(csvContent);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Bulk Import Delivery Orders (CSV)</h2>
              <p className="text-xs text-slate-400">Auto-geocode addresses and sequence stops</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Paste CSV Content or Upload File</span>
            </label>

            <label className="cursor-pointer text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 border border-indigo-500/30 px-3 py-1 rounded-lg bg-indigo-950/30">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Browse .csv file</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            rows={8}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
          />

          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Supported CSV Headers:
            </p>
            <p>
              <code className="text-indigo-300">recipient_name</code>, <code className="text-indigo-300">address</code>, <code className="text-indigo-300">weight_kg</code>, <code className="text-indigo-300">volume_m3</code>, <code className="text-indigo-300">priority</code> (standard/urgent), <code className="text-indigo-300">time_window_start</code>, <code className="text-indigo-300">time_window_end</code>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Geocoding & Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Geocode & Import Orders</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
