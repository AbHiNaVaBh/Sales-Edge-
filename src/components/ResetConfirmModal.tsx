import React from 'react';
import { AlertTriangle, RotateCcw, X, ShieldAlert, Check } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-rose-300 border border-white/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-rose-200 font-bold block">
                Testing Utility · Temporary
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">Reset App & Data</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Are you sure you want to reset all data?</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              This action will clear all newly placed orders, recorded payment receipts, logged store visits, active in-store sessions, and restore the initial sample HUL SalesEdge dataset.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-700 block">What will happen:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>Restore 8 default retail and wholesale outlets</li>
              <li>Reset visit status (exits any active in-store session)</li>
              <li>Revert sales target achievements and payment records</li>
              <li>Clear offline queue to clean synced state</li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            Note: This temporary reset button can be removed when the app goes into production.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmReset();
                onClose();
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm & Reset All Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
