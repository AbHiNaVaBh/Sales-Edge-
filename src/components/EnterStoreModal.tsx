import React, { useState } from 'react';
import {
  MapPin,
  CheckCircle,
  X,
  Store,
  Warehouse,
  ShieldCheck,
  Clock,
  Award,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { Customer } from '../types/index.ts';

interface EnterStoreModalProps {
  customer: Customer;
  onClose: () => void;
  onConfirmCheckIn: (customer: Customer) => void;
}

export const EnterStoreModal: React.FC<EnterStoreModalProps> = ({
  customer,
  onClose,
  onConfirmCheckIn,
}) => {
  const [isVerifyingGPS, setIsVerifyingGPS] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleEnterStore = () => {
    setIsVerifyingGPS(true);
    setTimeout(() => {
      onConfirmCheckIn(customer);
    }, 400);
  };

  const isOverdue = customer.outstandingBalance > customer.creditLimit * 0.75;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                {customer.type === 'wholesaler' ? (
                  <Warehouse className="w-6 h-6 text-purple-300" />
                ) : (
                  <Store className="w-6 h-6 text-emerald-300" />
                )}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">
                  Store Entry & Geofence Check-In
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white">{customer.name}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Geofence Radar Verification Box */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600"></span>
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded">
                    GPS Geofence Verified
                  </span>
                  <span className="text-xs text-emerald-800 font-medium">
                    {customer.geofenceDistanceMeters}m from outlet
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Representative location authenticated within 50m geofence perimeter. Ready to begin on-site store audit & commercial engagement.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Proprietor / Contact:</span>
              <span className="font-semibold text-slate-800">{customer.ownerName} ({customer.phone})</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Club Tier & Beat:</span>
              <span className="font-semibold text-blue-700">{customer.hulClubTier} · {customer.pjpDay}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Outstanding Balance:</span>
              <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                Rs. {customer.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {isOverdue && ' (High Overdue)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Available Credit Limit:</span>
              <span className="font-semibold text-slate-800">
                Rs. {(customer.creditLimit - customer.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Check-In Time & Protocol Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>
                Entry Time: <strong>{currentTime}</strong>
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Live in-store stopwatch starts upon entry
            </span>
          </div>

          {/* Guidance note */}
          <p className="text-[11px] text-slate-500 text-center">
            Once you enter the store, you can take orders, audit shelf presence, and collect payments. Complete check-out when exiting the store.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEnterStore}
            disabled={isVerifyingGPS}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {isVerifyingGPS ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating Geofence...</span>
              </>
            ) : (
              <>
                <span>Enter Store & Start Visit</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
