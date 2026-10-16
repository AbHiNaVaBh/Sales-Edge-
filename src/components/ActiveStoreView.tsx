import React, { useState, useEffect } from 'react';
import {
  Store,
  Warehouse,
  Clock,
  MapPin,
  Phone,
  FileText,
  DollarSign,
  Camera,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Award,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  Receipt,
  Check,
  Calendar,
  Lock,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { Customer, ActiveStoreSession, Order } from '../types/index.ts';
import { OrderDetailsModal } from './OrderDetailsModal.tsx';
import { OutletLocationModal } from './OutletLocationModal.tsx';

interface ActiveStoreViewProps {
  session: ActiveStoreSession;
  customer: Customer;
  onTakeOrder: () => void;
  onRecordPayment: () => void;
  onExitStore: () => void;
  onCancelSession: () => void;
}

export const ActiveStoreView: React.FC<ActiveStoreViewProps> = ({
  session,
  customer,
  onTakeOrder,
  onRecordPayment,
  onExitStore,
  onCancelSession,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    Math.max(0, Math.round((Date.now() - session.checkInTimestamp) / 1000))
  );
  const [shelfPhotoCaptured, setShelfPhotoCaptured] = useState<boolean>(false);
  const [stockCheckNotes, setStockCheckNotes] = useState<string>('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [showLocationMap, setShowLocationMap] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - session.checkInTimestamp) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session.checkInTimestamp]);

  useEffect(() => {
    const loadOrders = () => {
      const allOrders = db.getOrders();
      const storeOrders = allOrders
        .filter((o) => o.customerId === customer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentOrders(storeOrders);
    };
    loadOrders();
    const unsubscribe = db.subscribe(loadOrders);
    return unsubscribe;
  }, [customer.id]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const liveTimerStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const availableCredit = Math.max(0, customer.creditLimit - customer.outstandingBalance);
  const creditUsagePct = Math.min(100, Math.round((customer.outstandingBalance / customer.creditLimit) * 100));
  const isOverdue = creditUsagePct >= 75;

  const hasOrdersInVisit = session.totalOrderAmount > 0;
  const hasPaymentsInVisit = session.totalPaymentAmount > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation & Exit Store Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          <span className="font-semibold text-slate-700">
            {customer.routeBeat}
          </span>
          <span className="text-slate-400">/</span>
          <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>In-Store Session Locked · Tabs Disabled</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancelSession}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            title="Cancel check-in without recording a visit"
          >
            Abort Check-In
          </button>
          <button
            onClick={onExitStore}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Store & Check-Out</span>
          </button>
        </div>
      </div>

      {/* Main In-Store Command Cockpit */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl border-2 border-emerald-500 p-6 shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              {customer.type === 'wholesaler' ? (
                <Warehouse className="w-8 h-8 text-purple-300" />
              ) : (
                <Store className="w-8 h-8 text-emerald-300" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Active In-Store Visit
                </span>
                <span className="text-xs font-mono font-bold bg-black/50 text-amber-300 px-2.5 py-0.5 rounded border border-amber-400/30">
                  ⏱ {liveTimerStr}
                </span>
                <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-400/30">
                  {customer.hulClubTier}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1.5">
                {customer.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="font-semibold text-white">Proprietor: {customer.ownerName}</span>
                <span>·</span>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-blue-300 hover:text-white flex items-center gap-1 underline underline-offset-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{customer.phone}</span>
                </a>
                <span>·</span>
                <span className="text-slate-300">{customer.address}</span>
                <span>·</span>
                <span className="font-mono text-slate-400">GST: {customer.gstin}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setShowLocationMap(true)}
                  className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                  title="View Store Location on Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  <span>GPS Map & Geofence</span>
                </button>
              </div>
            </div>
          </div>

          {/* High Priority Exit Store CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={onExitStore}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:from-rose-800 active:to-rose-900 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Complete Visit (Exit Store)</span>
            </button>
            <span className="text-[11px] text-slate-400 text-center">
              Dwell time automatically calculated & verified
            </span>
          </div>
        </div>

        {/* Live Session Counters for this Visit */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">Orders Booked This Visit</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              Rs. {session.totalOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {session.ordersPlacedCount} order(s) entered
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">Collections Recorded</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              Rs. {session.totalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {session.paymentsCollectedCount} receipt(s) issued
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">GPS Geofence Status</span>
            <span className="text-xs font-bold text-emerald-400 mt-1 block flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Verified On-Premise
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {customer.geofenceDistanceMeters}m from pin
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">Perfect Store Score</span>
            <span className="text-lg font-bold text-blue-300 mt-0.5 block">
              {customer.perfectStoreScore}%
            </span>
            <span className="text-[10px] text-slate-400">Target: 90%+ compliance</span>
          </div>
        </div>
      </div>

      {/* In-Store Interactive Action Cards (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Order Taking & Trade Schemes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Book Store Order</h3>
                  <p className="text-xs text-slate-500">
                    {customer.type === 'wholesaler' ? 'Wholesale Slab Pricing' : 'Retailer PTR Trade Pricing'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                Active Schemes
              </span>
            </div>

            <div className="my-4 space-y-2 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900 block">Monsoon BOGO Scheme</span>
                  <span className="text-slate-600 text-[11px]">Buy 8 cases of Lime Sparkler, get 1 free</span>
                </div>
                <span className="text-xs font-bold text-blue-700">Unlocked</span>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-purple-900 block">Focus Drive Lines</span>
                  <span className="text-slate-600 text-[11px]">Surf Excel Matic & Dove Shampoo for LPC target</span>
                </div>
                <span className="text-xs font-bold text-purple-700">+Bonus</span>
              </div>
            </div>
          </div>

          <button
            onClick={onTakeOrder}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>{hasOrdersInVisit ? 'Add More Lines to Order' : 'Open Catalog & Take Order'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Payment Collection & Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Collect Payment</h3>
                  <p className="text-xs text-slate-500">FIFO Invoice Settlement & Instant Receipts</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {isOverdue ? 'Overdue Alert' : 'Credit Normal'}
              </span>
            </div>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Outstanding Balance:</span>
                <span className={`font-bold text-sm ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                  Rs. {customer.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Assigned Credit Limit:</span>
                <span className="font-semibold text-slate-800">
                  Rs. {customer.creditLimit.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Available Credit:</span>
                <span className="font-semibold text-emerald-700">
                  Rs. {availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                <div
                  className={`h-1.5 rounded-full ${isOverdue ? 'bg-rose-600' : 'bg-emerald-600'}`}
                  style={{ width: `${creditUsagePct}%` }}
                ></div>
              </div>
            </div>
          </div>

          <button
            onClick={onRecordPayment}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Cash, UPI or Cheque Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Envision Shelf Audit & Merchandising Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Envision Shelf Display Audit</h3>
                <p className="text-xs text-slate-500">Planogram compliance & POSM marketing visibility</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Audited
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-800 block">Shelf Display Photo Proof</span>
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                {shelfPhotoCaptured ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                    <span className="text-emerald-700 font-semibold">Geo-tagged shelf proof captured</span>
                  </>
                ) : (
                  'Take camera verification of storefront facings'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShelfPhotoCaptured(!shelfPhotoCaptured)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                shelfPhotoCaptured
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {shelfPhotoCaptured ? 'Attached' : 'Capture Photo'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store Stock & Shelf Notes
            </label>
            <input
              type="text"
              value={stockCheckNotes}
              onChange={(e) => setStockCheckNotes(e.target.value)}
              placeholder="e.g. Good visibility on top shelf; needs 2 more posters"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Card 4: Store Order History & Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recent Outlet Orders</h3>
                <p className="text-xs text-slate-500">Previous orders placed by this outlet</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Terms: {customer.paymentTermsDays} Days
            </span>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No previous orders found for this outlet. Book their first order above!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderForDetails(ord)}
                  className="py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-xs group-hover:text-blue-700 transition-colors">
                          {ord.orderNumber}
                        </span>
                        {ord.date === new Date().toISOString().split('T')[0] && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                            Just Placed
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {ord.date} · {ord.items.length} lines · {ord.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Rs. {ord.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderForDetails(ord);
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-2xs"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Departure Action Bar */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-300 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ready to complete store visit?</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Dwell time: {liveTimerStr} · Orders: Rs. {session.totalOrderAmount.toLocaleString()} · Collections: Rs. {session.totalPaymentAmount.toLocaleString()}
          </p>
        </div>

        <button
          onClick={onExitStore}
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Store & Check-Out</span>
        </button>
      </div>

      {/* Order Details Modal for inspecting order line items */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
        />
      )}

      {/* Outlet Location Modal for in-store GPS navigation and verification */}
      {showLocationMap && (
        <OutletLocationModal
          outlet={customer}
          onClose={() => setShowLocationMap(false)}
          onTakeOrder={onTakeOrder}
        />
      )}
    </div>
  );
};
