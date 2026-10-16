import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  DollarSign,
  Camera,
  LogOut,
  FileText,
  Store,
  Warehouse,
  Check,
  Building,
} from 'lucide-react';
import type { ActiveStoreSession, VisitPurpose, VisitOutcome } from '../types/index.ts';

interface ExitStoreModalProps {
  session: ActiveStoreSession;
  onClose: () => void;
  onConfirmCheckOut: (params: {
    purpose: VisitPurpose;
    outcome: VisitOutcome;
    noOrderReason?: string;
    stockNotes?: string;
    generalNotes?: string;
    shelfPhotoVerified?: boolean;
    orderAmount?: number;
    paymentAmount?: number;
  }) => void;
  onTakeOrderShortcut: () => void;
  onCollectPaymentShortcut: () => void;
}

const NO_ORDER_REASONS = [
  'Stock Sufficient / No Requirement Today',
  'Proprietor / Decision Maker Not Available',
  'Outstanding Credit Limit Exceeded',
  'Retailer Financial / Liquidity Crunch',
  'Competitor Trade Scheme Preferred',
  'Counter Too Busy / Requested Return Visit',
  'Store Temporarily Closed / Stock Audit Ongoing',
];

export const ExitStoreModal: React.FC<ExitStoreModalProps> = ({
  session,
  onClose,
  onConfirmCheckOut,
  onTakeOrderShortcut,
  onCollectPaymentShortcut,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.max(1, Math.round((Date.now() - session.checkInTimestamp) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - session.checkInTimestamp) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [session.checkInTimestamp]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose>(
    session.totalOrderAmount > 0 ? 'Order Booking' : 'Envision Shelf Check'
  );
  const [noOrderReason, setNoOrderReason] = useState<string>(NO_ORDER_REASONS[0]);
  const [shelfPhotoVerified, setShelfPhotoVerified] = useState<boolean>(false);
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const hasOrders = session.totalOrderAmount > 0;
  const hasPayments = session.totalPaymentAmount > 0;

  // Derive outcome
  const derivedOutcome: VisitOutcome = hasOrders && hasPayments
    ? 'Both Order & Payment'
    : hasOrders
    ? 'Productive - Order Placed'
    : hasPayments
    ? 'Payment Collected'
    : 'Follow-up Scheduled';

  const handleCompleteExit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    onConfirmCheckOut({
      purpose: visitPurpose,
      outcome: derivedOutcome,
      noOrderReason: !hasOrders ? noOrderReason : undefined,
      shelfPhotoVerified,
      generalNotes: visitNotes.trim() || undefined,
      orderAmount: session.totalOrderAmount,
      paymentAmount: session.totalPaymentAmount,
    });
  };

  const checkInFormatted = new Date(session.checkInTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const checkOutFormatted = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold block">
                  Store Check-Out & Exit
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white">{session.customerName}</h2>
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

          {/* Dwell Time & Shift Times Bar */}
          <div className="mt-4 p-3 bg-white/10 rounded-xl flex items-center justify-between text-xs border border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>
                In-Store Dwell Time: <strong className="text-amber-300 text-sm">{formattedDuration}</strong>
              </span>
            </div>
            <span className="text-white/80">
              {checkInFormatted} → {checkOutFormatted}
            </span>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleCompleteExit} className="p-6 space-y-5">
          {/* Activity Accomplished in this Store Visit */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Visit Commercial Activity Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Order Card */}
              <div className={`p-3.5 rounded-xl border ${
                hasOrders ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Receipt className={`w-3.5 h-3.5 ${hasOrders ? 'text-emerald-700' : 'text-slate-400'}`} />
                    Order Booked
                  </span>
                  {hasOrders ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {session.ordersPlacedCount} Order(s)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">None</span>
                  )}
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  Rs. {session.totalOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                {!hasOrders && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTakeOrderShortcut();
                    }}
                    className="mt-2 text-xs text-blue-700 font-semibold hover:underline block"
                  >
                    + Book Order Now
                  </button>
                )}
              </div>

              {/* Payment Collection Card */}
              <div className={`p-3.5 rounded-xl border ${
                hasPayments ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <DollarSign className={`w-3.5 h-3.5 ${hasPayments ? 'text-emerald-700' : 'text-slate-400'}`} />
                    Payment Collected
                  </span>
                  {hasPayments ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {session.paymentsCollectedCount} Receipt(s)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">None</span>
                  )}
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  Rs. {session.totalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                {!hasPayments && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCollectPaymentShortcut();
                    }}
                    className="mt-2 text-xs text-emerald-700 font-semibold hover:underline block"
                  >
                    + Collect Payment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* If No Order was booked: Mandatory FMCG Reason Selection */}
          {!hasOrders && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mandatory Non-Productive Call Reason
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                As per territory sales protocol, specify why an order was not booked during this visit:
              </p>
              <select
                value={noOrderReason}
                onChange={(e) => setNoOrderReason(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-amber-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                {NO_ORDER_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Primary Visit Purpose Confirmation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Visit Objective
            </label>
            <select
              value={visitPurpose}
              onChange={(e) => setVisitPurpose(e.target.value as VisitPurpose)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-600"
            >
              <option value="Order Booking">Order Booking & Scheme Pitch</option>
              <option value="Envision Shelf Check">Envision Perfect Store Shelf Audit</option>
              <option value="Payment Collection">Payment Collection & Ledger Reconciliation</option>
              <option value="Stock Audit">Stock Level & Expiry Check</option>
              <option value="Scheme Presentation">New Product / Monsoon Scheme Launch</option>
              <option value="Complaint Resolution">Commercial Dispute / Replacement</option>
            </select>
          </div>

          {/* Shelf Compliance Photo Check */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Envision Merchandising Photo
                </span>
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  {shelfPhotoVerified ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 inline" />
                      <span className="text-emerald-700 font-semibold">Geo-tagged shelf proof captured</span>
                    </>
                  ) : (
                    'Optional FMCG display compliance audit'
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShelfPhotoVerified(!shelfPhotoVerified)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                shelfPhotoVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {shelfPhotoVerified ? 'Captured' : 'Snap Photo'}
            </button>
          </div>

          {/* Visit Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Store Visit Summary & Intelligence Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="e.g. Retailer interested in upcoming detergent scheme; promised Rs. 10,000 cheque next Tuesday."
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
            />
          </div>

          {/* Footer CTAs */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Stay In Store
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Confirm Exit & Check-Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
