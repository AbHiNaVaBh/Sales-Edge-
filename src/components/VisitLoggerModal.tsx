import React, { useState } from 'react';
import {
  CheckCircle,
  MapPin,
  Clock,
  Camera,
  X,
  Store,
  Warehouse,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { Customer, CustomerVisit, VisitPurpose, VisitOutcome } from '../types/index.ts';

interface VisitLoggerModalProps {
  initialCustomer?: Customer | null;
  onClose: () => void;
  onVisitLogged: (visit: CustomerVisit) => void;
}

export const VisitLoggerModal: React.FC<VisitLoggerModalProps> = ({
  initialCustomer,
  onClose,
  onVisitLogged,
}) => {
  const customers = db.getCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer ? initialCustomer.id : customers[0]?.id || ''
  );
  const [purpose, setPurpose] = useState<VisitPurpose>('Order Booking');
  const [outcome, setOutcome] = useState<VisitOutcome>('Productive - Order Placed');
  const [stockNotes, setStockNotes] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [simulatedPhotoCaptured, setSimulatedPhotoCaptured] = useState<boolean>(false);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const newVisit = db.recordVisit({
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      routeBeat: activeCustomer.routeBeat,
      checkInTime: new Date(Date.now() - 15 * 60000).toISOString(),
      checkOutTime: new Date().toISOString(),
      durationMinutes: 15,
      purpose,
      outcome,
      stockNotes: stockNotes || undefined,
      generalNotes: generalNotes || undefined,
      shelfPhotoVerified: simulatedPhotoCaptured,
    });

    onVisitLogged(newVisit);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Log Field Store Visit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {/* Customer Selection */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Select Outlet / Store:</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-900 focus:bg-white focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · [{c.type.toUpperCase()}] · {c.routeBeat}
                </option>
              ))}
            </select>
            {activeCustomer && (
              <p className="mt-1 text-slate-500">
                Proprietor: {activeCustomer.ownerName} · Address: {activeCustomer.address}
              </p>
            )}
          </div>

          {/* Purpose of Visit */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Visit Objective:</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as VisitPurpose)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:bg-white"
            >
              <option value="Order Booking">Order Booking & Scheme Presentation</option>
              <option value="Payment Collection">Payment Collection & Ledger Review</option>
              <option value="Stock Audit">Stock Audit & Shelf Visibility Check</option>
              <option value="Scheme Presentation">New Scheme Presentation</option>
              <option value="Complaint Resolution">Complaint Resolution / Return Check</option>
              <option value="General Courtesy">Relationship / General Courtesy Call</option>
            </select>
          </div>

          {/* Outcome of Visit */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Visit Result / Outcome:</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:bg-white"
            >
              <option value="Productive - Order Placed">Productive - Order Placed</option>
              <option value="Payment Collected">Payment Collected</option>
              <option value="Both Order & Payment">Both Order & Payment Handled</option>
              <option value="Follow-up Scheduled">Follow-up Scheduled for Next Beat</option>
              <option value="Store Closed">Store Closed during visit</option>
              <option value="Owner Unavailable">Decision Maker Unavailable</option>
            </select>
          </div>

          {/* Stock & Shelf Visibility Audit */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Stock Audit / Competitor Activity:
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Lime Sparkler 12 cases in stock. Shelf eye-level visibility maintained..."
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
            />
          </div>

          {/* Photo Capture Proof Simulation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800 block">Shelf Display Photo Proof</span>
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  {simulatedPhotoCaptured ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 inline" />
                      <span className="text-emerald-700 font-semibold">Photo geo-tagged & attached</span>
                    </>
                  ) : (
                    'Optional store shelf verification'
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSimulatedPhotoCaptured(!simulatedPhotoCaptured)}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                simulatedPhotoCaptured
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {simulatedPhotoCaptured ? 'Attached' : 'Capture Photo'}
            </button>
          </div>

          {/* General Notes */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Rep Remarks:</label>
            <textarea
              rows={2}
              placeholder="Store keeper feedback, special delivery timing requests..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
            >
              Save & Mark Visited
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
