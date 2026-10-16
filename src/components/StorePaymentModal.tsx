import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  X,
  CheckCircle,
  Receipt,
  Store,
  Warehouse,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  Printer,
  Sparkles,
} from 'lucide-react';
import { db } from '../services/db.ts';
import { autoAllocatePayment } from '../utils/paymentUtils.ts';
import type { Customer, PaymentRecord, PaymentMode, Order } from '../types/index.ts';
import { UPIPaymentQRCode } from './UPIPaymentQRCode.tsx';
import { PaymentMethodDetails } from './PaymentMethodDetails.tsx';
import { PaymentAutoFillSelector } from './PaymentAutoFillSelector.tsx';

interface StorePaymentModalProps {
  customer: Customer;
  onClose: () => void;
  onPaymentRecorded: (payment: PaymentRecord) => void;
}

export const StorePaymentModal: React.FC<StorePaymentModalProps> = ({
  customer,
  onClose,
  onPaymentRecorded,
}) => {
  const [amount, setAmount] = useState<string>(
    customer.outstandingBalance > 0 ? customer.outstandingBalance.toFixed(2) : ''
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recordedPayment, setRecordedPayment] = useState<PaymentRecord | null>(null);

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode);
    if (mode === 'cash') {
      setReferenceNumber(`CSH-${Date.now().toString().slice(-6)}`);
    } else if (
      referenceNumber.startsWith('CSH-') ||
      referenceNumber.startsWith('IMPS') ||
      referenceNumber.startsWith('NEFT') ||
      referenceNumber.startsWith('RTGS') ||
      referenceNumber.startsWith('UPI')
    ) {
      setReferenceNumber('');
    }
  };

  const orders = db.getOrders();
  const numericAmount = parseFloat(amount) || 0;

  const allocationPreview = useMemo(() => {
    if (numericAmount <= 0) return { allocations: [], remainingAdvance: 0 };
    return autoAllocatePayment(numericAmount, orders, customer.id);
  }, [numericAmount, orders, customer.id]);

  const handleQuickFill = (val: number) => {
    setAmount(val.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    const newPayment = db.recordPayment({
      customerId: customer.id,
      customerName: customer.name,
      amount: numericAmount,
      paymentMode,
      referenceNumber: referenceNumber || (paymentMode === 'cash' ? `CASH-${Date.now().toString().slice(-4)}` : undefined),
      chequeNumber: paymentMode === 'cheque' ? chequeNumber : undefined,
      bankName: paymentMode === 'cheque' ? bankName : undefined,
      date: new Date().toISOString().split('T')[0],
      repNotes: notes,
      invoiceAllocations: allocationPreview.allocations,
    });

    setIsSubmitting(false);
    setRecordedPayment(newPayment);
    onPaymentRecorded(newPayment);
  };

  if (recordedPayment) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          <div className="bg-emerald-700 text-white p-5 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold">Payment Collected!</h3>
            <p className="text-xs text-emerald-100 mt-1">Receipt #{recordedPayment.receiptNumber}</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Outlet Name:</span>
                <span className="font-bold text-slate-800">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Received:</span>
                <span className="font-extrabold text-emerald-700 text-base">
                  Rs. {recordedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode of Payment:</span>
                <span className="font-semibold uppercase text-slate-700">{recordedPayment.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Timestamp:</span>
                <span className="font-medium text-slate-700">{new Date().toLocaleString()}</span>
              </div>
              {recordedPayment.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref / Txn ID:</span>
                  <span className="font-mono text-slate-800">{recordedPayment.referenceNumber}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
              <span>In-store collection recorded and attributed to active visit session.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Back to Store Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Pinned Header */}
        <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
                In-Store Collection
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate max-w-xs">{customer.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* Customer Balance info */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Current Outstanding</span>
              <span className="font-extrabold text-rose-700 text-sm">
                Rs. {customer.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Credit Limit</span>
              <span className="font-semibold text-slate-700 text-xs">
                Rs. {customer.creditLimit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Smart Auto-Fill Presets */}
          <PaymentAutoFillSelector
            outstandingBalance={customer.outstandingBalance}
            creditLimit={customer.creditLimit}
            currentAmount={numericAmount}
            onSelectAmount={(val) => setAmount(val.toFixed(2))}
          />

          {/* Amount & Mode in compact 2-column row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Collection Amount (Rs.) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-1.5 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Payment Method *
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['upi', 'cash', 'cheque', 'bank_transfer'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handlePaymentModeChange(mode)}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold uppercase transition-all flex flex-col items-center justify-center border ${
                      paymentMode === mode
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{mode === 'bank_transfer' ? 'Bank' : mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic UPI Payment QR Code */}
          {paymentMode === 'upi' && (
            <div className="space-y-2">
              <UPIPaymentQRCode
                amount={numericAmount > 0 ? numericAmount : customer.outstandingBalance}
                customerName={customer.name}
                onPaymentVerified={(utr) => setReferenceNumber(utr)}
                isPaid={Boolean(referenceNumber)}
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  UPI Ref / UTR {referenceNumber && '(Verified)'}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Auto-filled via QR verification"
                  className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                />
              </div>
            </div>
          )}

          {paymentMode !== 'upi' && (
            <PaymentMethodDetails
              mode={paymentMode}
              amount={numericAmount > 0 ? numericAmount : customer.outstandingBalance}
              customerName={customer.name}
              referenceNumber={referenceNumber}
              onReferenceChange={setReferenceNumber}
              chequeNumber={chequeNumber}
              onChequeNumberChange={setChequeNumber}
              bankName={bankName}
              onBankNameChange={setBankName}
            />
          )}
        </form>

        {/* Pinned Action Buttons Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-semibold border border-slate-200 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || numericAmount <= 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Rs. {numericAmount > 0 ? numericAmount.toLocaleString() : '0'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
