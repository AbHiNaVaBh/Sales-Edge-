import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Search,
  PlusCircle,
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  X,
  CreditCard,
  Building,
  Store,
  Warehouse,
  Coins,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { db } from '../services/db.ts';
import { calculateAgingBuckets, autoAllocatePayment } from '../utils/paymentUtils.ts';
import type { Customer, Order, PaymentRecord, PaymentMode } from '../types/index.ts';
import { UPIPaymentQRCode } from './UPIPaymentQRCode.tsx';
import { PaymentMethodDetails } from './PaymentMethodDetails.tsx';
import { PaymentAutoFillSelector } from './PaymentAutoFillSelector.tsx';

interface PaymentManagementProps {
  initialCustomer?: Customer | null;
  onOpenRecordPayment: () => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  initialCustomer,
  onOpenRecordPayment,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [payments, setPayments] = useState<PaymentRecord[]>(db.getPayments());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'retailer' | 'wholesaler'>('all');

  // Record Payment Modal State - MUST NEVER auto-popup on general tab click
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(Boolean(initialCustomer));
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer ? initialCustomer.id : ''
  );
  const [paymentAmount, setPaymentAmount] = useState<string>(
    initialCustomer && initialCustomer.outstandingBalance > 0
      ? initialCustomer.outstandingBalance.toString()
      : ''
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);
  const [receiptNotice, setReceiptNotice] = useState<string | null>(null);

  // Sync when initialCustomer prop changes from Beat or Directory
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomerId(initialCustomer.id);
      setShowPaymentModal(true);
      setPaymentAmount(initialCustomer.outstandingBalance > 0 ? initialCustomer.outstandingBalance.toFixed(2) : '');
      setPaymentMode('upi');
      setReferenceNo('');
      setChequeNo('');
      setBankName('');
      setNotes('');
    } else {
      setShowPaymentModal(false);
    }
  }, [initialCustomer]);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setCustomers(db.getCustomers());
      setOrders(db.getOrders());
      setPayments(db.getPayments());
    });
    return unsubscribe;
  }, []);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Auto-allocation calculation preview
  const numericAmount = parseFloat(paymentAmount) || 0;
  const allocationPreview = useMemo(() => {
    if (!activeCustomer || numericAmount <= 0) {
      return { allocations: [], remainingAdvance: 0 };
    }
    return autoAllocatePayment(numericAmount, orders, activeCustomer.id);
  }, [activeCustomer, numericAmount, orders]);

  // Aggregate metrics
  const totalOutstanding = customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalCollectedToday = payments
    .filter((p) => p.date === new Date().toISOString().split('T')[0])
    .reduce((acc, p) => acc + p.amount, 0);
  const totalCashInHand = payments
    .filter((p) => p.paymentMode === 'cash' && p.date === new Date().toISOString().split('T')[0])
    .reduce((acc, p) => acc + p.amount, 0);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [customers, searchQuery, filterType]);

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || numericAmount <= 0) return;

    const newPayment = db.recordPayment({
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      amount: numericAmount,
      paymentMode,
      referenceNumber: referenceNo || (paymentMode === 'cash' ? `CASH-${Date.now().toString().slice(-4)}` : undefined),
      chequeNumber: paymentMode === 'cheque' ? chequeNo : undefined,
      bankName: paymentMode === 'cheque' ? bankName : undefined,
      date: new Date().toISOString().split('T')[0],
      repNotes: notes,
      invoiceAllocations: allocationPreview.allocations,
    });

    setShowPaymentModal(false);
    setPaymentAmount('');
    setReferenceNo('');
    setChequeNo('');
    setBankName('');
    setNotes('');
    setActiveReceipt(newPayment);
  };

  const handleOpenCollect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    const defaultAmt = customer.outstandingBalance > 0 ? customer.outstandingBalance.toFixed(2) : '';
    setPaymentAmount(defaultAmt);
    setPaymentMode('cash');
    setReferenceNo(`CSH-${Date.now().toString().slice(-6)}`);
    setChequeNo('');
    setBankName('');
    setNotes('');
    setShowPaymentModal(true);
  };

  const handlePaymentModeChange = (nextMode: PaymentMode) => {
    setPaymentMode(nextMode);
    if (nextMode === 'cash') {
      setReferenceNo(`CSH-${Date.now().toString().slice(-6)}`);
    } else if (
      referenceNo.startsWith('CSH-') ||
      referenceNo.startsWith('IMPS') ||
      referenceNo.startsWith('NEFT') ||
      referenceNo.startsWith('RTGS') ||
      referenceNo.startsWith('UPI')
    ) {
      setReferenceNo('');
    }
  };

  const handlePrintReceipt = (rec: PaymentRecord) => {
    setReceiptNotice(`Payment Receipt #${rec.receiptNumber} sent to printer.`);
    setTimeout(() => setReceiptNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {receiptNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <span>{receiptNotice}</span>
          <button onClick={() => setReceiptNotice(null)} className="text-emerald-600 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Aggregate KPI Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Field Outstanding</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-slate-900">
              Rs. {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Across {customers.length} outlets</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Collections Today</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-emerald-700">
              Rs. {totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Auto-reconciled FIFO</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Cash In Hand (With Sales Rep)</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-amber-700">
              Rs. {totalCashInHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-amber-600">Pending end-of-day bank deposit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Quick Collection Entry</span>
            <p className="text-xs text-slate-500 mt-0.5">Collect Cash, UPI or Cheque from customer</p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </section>

      {/* Outstanding Receivables Ledger Table */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Customer Outstanding & Aging Ledger</h2>
            <p className="text-xs text-slate-500">
              Track pending balances, payment terms compliance, and aging buckets
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search customer or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 text-slate-700 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="retailer">Retailers</option>
              <option value="wholesaler">Wholesalers</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Customer & Beat</th>
                <th className="py-3 px-4">Credit Terms</th>
                <th className="py-3 px-4">Total Balance</th>
                <th className="py-3 px-4">0-15 Days</th>
                <th className="py-3 px-4">16-30 Days</th>
                <th className="py-3 px-4">30+ Days Overdue</th>
                <th className="py-3 px-4 text-right">Collect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredCustomers.map((customer) => {
                const aging = calculateAgingBuckets(orders, customer.id);
                const isWholesale = customer.type === 'wholesaler';

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {isWholesale ? (
                          <Warehouse className="w-3.5 h-3.5 text-purple-700" />
                        ) : (
                          <Store className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>{customer.name}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Owner: {customer.ownerName} · {customer.routeBeat}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{customer.paymentTermsDays} Days</span>
                      <span className="text-slate-500 block text-[11px]">Limit: Rs. {customer.creditLimit}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 text-sm">
                        Rs. {customer.outstandingBalance.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      Rs. {aging.current.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-amber-700 font-medium">
                      Rs. {aging.thirtyDays.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          aging.overdue > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        Rs. {aging.overdue.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenCollect(customer)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Payments Ledger */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Collection Receipts</h3>
          <span className="text-xs text-slate-500">{payments.length} receipts issued</span>
        </div>

        <div className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <div key={payment.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{payment.receiptNumber}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-800">{payment.customerName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">
                    {payment.paymentMode}
                  </span>
                </div>
                <div className="text-slate-500 mt-1 flex items-center gap-2">
                  <span>Date: {payment.date}</span>
                  {payment.referenceNumber && <span>Ref: {payment.referenceNumber}</span>}
                  {payment.invoiceAllocations?.length > 0 && (
                    <span>
                      Allocated against {payment.invoiceAllocations.map((a) => a.orderNumber).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-emerald-700">${payment.amount.toFixed(2)}</span>
                <button
                  onClick={() => setActiveReceipt(payment)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  View Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Record Payment Modal - Fixed Viewport Height & Pinned Header */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Pinned Header */}
            <div className="px-5 py-3 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm sm:text-base">Record Payment Collection</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleRecordPaymentSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs text-slate-700">
              {/* Compact Specified Outlet Banner */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    {activeCustomer?.type === 'wholesaler' ? <Warehouse className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                      {activeCustomer?.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {activeCustomer?.ownerName} · {activeCustomer?.routeBeat}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Due Balance</span>
                  <span className="font-mono font-extrabold text-rose-600 text-sm">
                    Rs. {activeCustomer?.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Compact Quick Auto-Fill Presets */}
              {activeCustomer && (
                <PaymentAutoFillSelector
                  outstandingBalance={activeCustomer.outstandingBalance}
                  creditLimit={activeCustomer.creditLimit}
                  currentAmount={numericAmount}
                  overdueAmount={calculateAgingBuckets(orders, activeCustomer.id).overdue}
                  onSelectAmount={(val) => setPaymentAmount(val.toString())}
                />
              )}

              {/* Amount & Mode in compact 2-col row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1 text-xs">Collection Amount (Rs.) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">Rs.</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1 text-xs">Payment Method:</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'upi', label: 'UPI/QR' },
                      { id: 'cash', label: 'Cash' },
                      { id: 'cheque', label: 'Cheque' },
                      { id: 'bank_transfer', label: 'Bank' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handlePaymentModeChange(m.id as PaymentMode)}
                        className={`py-1.5 px-1 text-center rounded-lg font-bold text-[11px] border transition-colors ${
                          paymentMode === m.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mode-specific Fields */}
              {paymentMode !== 'upi' && activeCustomer && (
                <PaymentMethodDetails
                  mode={paymentMode}
                  amount={numericAmount > 0 ? numericAmount : activeCustomer.outstandingBalance}
                  customerName={activeCustomer.name}
                  referenceNumber={referenceNo}
                  onReferenceChange={setReferenceNo}
                  chequeNumber={chequeNo}
                  onChequeNumberChange={setChequeNo}
                  bankName={bankName}
                  onBankNameChange={setBankName}
                />
              )}

              {paymentMode === 'upi' && (
                <div className="space-y-2">
                  {numericAmount > 0 ? (
                    <>
                      <UPIPaymentQRCode
                        amount={numericAmount}
                        customerName={activeCustomer?.name || 'Selected Customer'}
                        onPaymentVerified={(utr) => setReferenceNo(utr)}
                        isPaid={Boolean(referenceNo)}
                      />
                      <div>
                        <label className="font-bold text-slate-800 block mb-0.5 text-[11px]">
                          UPI Ref / UTR {referenceNo && '(Verified)'}:
                        </label>
                        <input
                          type="text"
                          placeholder="Auto-filled via QR code or bank webhook"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono text-xs"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                      <QrCode className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        Enter a collection amount above to generate live UPI QR Code
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FIFO Allocation Preview (Compact) */}
              {allocationPreview.allocations.length > 0 && (
                <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg space-y-1 text-[11px]">
                  <span className="font-bold text-blue-900 block">
                    Automatic FIFO Settlement:
                  </span>
                  {allocationPreview.allocations.map((a, i) => (
                    <div key={i} className="flex justify-between text-blue-800">
                      <span>Invoice #{a.orderNumber}</span>
                      <span className="font-bold font-mono">Rs. {a.allocatedAmount.toFixed(2)}</span>
                    </div>
                  ))}
                  {allocationPreview.remainingAdvance > 0 && (
                    <div className="flex justify-between text-emerald-800 pt-0.5 border-t border-blue-200">
                      <span>Advance Deposit:</span>
                      <span className="font-bold font-mono">Rs. {allocationPreview.remainingAdvance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-0.5 text-[11px]">Collection Remarks (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Verified with shopkeeper..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-xs"
                />
              </div>
            </form>

            {/* Pinned Footer (Always visible on screen) */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPaymentSubmit}
                disabled={numericAmount <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm text-xs transition-colors"
              >
                Save & Issue Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="text-center pb-3 border-b border-slate-200">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Payment Voucher Receipt</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{activeReceipt.receiptNumber}</p>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{activeReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Received:</span>
                <span className="font-bold text-base text-emerald-700">${activeReceipt.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold uppercase text-slate-800">{activeReceipt.paymentMode}</span>
              </div>
              {activeReceipt.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference / Ref ID:</span>
                  <span className="font-mono text-slate-800">{activeReceipt.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Timestamp:</span>
                <span>{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sync Status:</span>
                <span className="font-semibold text-emerald-700 uppercase">
                  {activeReceipt.syncStatus === 'synced' ? 'Synced to Central Books' : 'Stored in Offline Ledger'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => handlePrintReceipt(activeReceipt)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
