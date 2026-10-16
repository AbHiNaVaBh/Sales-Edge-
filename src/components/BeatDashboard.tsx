import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  CheckCircle,
  Clock,
  Navigation,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
  Store,
  Warehouse,
  Sparkles,
  Camera,
  Award,
  Zap,
  LogOut,
  ArrowRight,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { Customer, DailyBeatStats, ActiveStoreSession, CustomerVisit } from '../types/index.ts';
import { EnterStoreModal } from './EnterStoreModal.tsx';
import { ExitStoreModal } from './ExitStoreModal.tsx';
import { ActiveStoreView } from './ActiveStoreView.tsx';
import { StorePaymentModal } from './StorePaymentModal.tsx';
import { OutletLocationModal } from './OutletLocationModal.tsx';

interface BeatDashboardProps {
  onTakeOrder: (customer: Customer) => void;
  onRecordPayment: (customer: Customer) => void;
  onLogVisit: (customer: Customer) => void;
  onViewCustomerDetails: (customer: Customer) => void;
}

export const BeatDashboard: React.FC<BeatDashboardProps> = ({
  onTakeOrder,
  onRecordPayment,
  onLogVisit,
  onViewCustomerDetails,
}) => {
  const [stats, setStats] = useState<DailyBeatStats>(db.getDailyStats());
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [activeSession, setActiveSession] = useState<ActiveStoreSession | null>(db.getActiveStoreSession());
  const [selectedBeat, setSelectedBeat] = useState<string>('Thursday: MG Road & Central Market');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_store' | 'visited'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals
  const [enteringCustomer, setEnteringCustomer] = useState<Customer | null>(null);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [showStorePaymentModal, setShowStorePaymentModal] = useState<boolean>(false);
  const [viewingVisitDetails, setViewingVisitDetails] = useState<{ customer: Customer; visit?: CustomerVisit } | null>(null);
  const [selectedOutletForMap, setSelectedOutletForMap] = useState<Customer | null>(null);

  // Live in-store timer
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setStats(db.getDailyStats());
      setCustomers(db.getCustomers());
      setActiveSession(db.getActiveStoreSession());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeSession) {
      setTimerSeconds(0);
      return;
    }
    const updateTimer = () => {
      const elapsed = Math.max(0, Math.round((Date.now() - activeSession.checkInTimestamp) / 1000));
      setTimerSeconds(elapsed);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const beats = Array.from(new Set(customers.map((c) => c.routeBeat)));
  const filteredCustomers = customers.filter((c) => {
    if (selectedBeat !== 'all' && c.routeBeat !== selectedBeat) return false;
    if (statusFilter === 'pending' && c.visitStatus !== 'pending') return false;
    if (statusFilter === 'in_store' && c.visitStatus !== 'in_store') return false;
    if (statusFilter === 'visited' && c.visitStatus !== 'visited') return false;
    return true;
  });

  const totalBeatCustomers = customers.filter((c) => selectedBeat === 'all' || c.routeBeat === selectedBeat);
  const visitedCount = totalBeatCustomers.filter((c) => c.visitStatus === 'visited').length;
  const inStoreCount = totalBeatCustomers.filter((c) => c.visitStatus === 'in_store').length;
  const pendingCount = totalBeatCustomers.length - visitedCount - inStoreCount;

  const salesAchievementPct = Math.min(100, Math.round((stats.achievedSales / stats.totalSalesTarget) * 100));
  const collectionAchievementPct = Math.min(100, Math.round((stats.achievedCollection / stats.collectionTarget) * 100));
  const strikeRatePct = visitedCount > 0 ? Math.round((stats.productiveVisits / visitedCount) * 100) : 0;

  // Handlers for store entry & exit
  const handleInitiateEnterStore = (customer: Customer) => {
    if (activeSession) {
      if (activeSession.customerId === customer.id) {
        setActionNotice(`You are already inside ${customer.name}. Use the Exit Store button when your visit is complete.`);
        return;
      }
      setActionNotice(
        `Active visit in progress at "${activeSession.customerName}". Please complete check-out or exit before entering another outlet.`
      );
      return;
    }
    setEnteringCustomer(customer);
  };

  const handleConfirmCheckIn = (customer: Customer) => {
    try {
      db.checkInStore(customer);
      setEnteringCustomer(null);
      setActionNotice(`Checked in at ${customer.name}. Entered store workspace.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enter store';
      setActionNotice(msg);
    }
  };

  const handleConfirmCheckOut = (params: Parameters<typeof db.checkOutStore>[0]) => {
    try {
      const visit = db.checkOutStore(params);
      setShowExitModal(false);
      setActionNotice(
        `Checked out from ${visit.customerName}. Dwell time: ${visit.durationMinutes}m. Visit recorded successfully.`
      );
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete check out';
      setActionNotice(msg);
    }
  };

  const handleViewCompletedVisit = (customer: Customer) => {
    const visits = db.getVisits();
    const customerVisit = visits.find((v) => v.customerId === customer.id);
    setViewingVisitDetails({ customer, visit: customerVisit });
  };

  const handleSimulateCall = (customer: Customer) => {
    setActionNotice(`Dialing ${customer.ownerName} (${customer.phone})...`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSimulateDirections = (customer: Customer) => {
    setActionNotice(`Opening GPS navigation route to ${customer.name} at ${customer.address}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // If rep is currently inside a store:
  // SHOW ONLY THE INFORMATION ABOUT THE ENTERED STORE!
  if (activeSession) {
    const enteredCustomer = customers.find((c) => c.id === activeSession.customerId);
    if (enteredCustomer) {
      return (
        <div className="space-y-6">
          {actionNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-medium flex items-center justify-between shadow-xs">
              <span>{actionNotice}</span>
              <button onClick={() => setActionNotice(null)} className="text-blue-700 font-bold hover:underline ml-4">
                Dismiss
              </button>
            </div>
          )}

          <ActiveStoreView
            session={activeSession}
            customer={enteredCustomer}
            onTakeOrder={() => onTakeOrder(enteredCustomer)}
            onRecordPayment={() => setShowStorePaymentModal(true)}
            onExitStore={() => setShowExitModal(true)}
            onCancelSession={() => {
              db.cancelActiveStoreSession();
              setActionNotice(`Check-in at ${enteredCustomer.name} cancelled.`);
              setTimeout(() => setActionNotice(null), 3000);
            }}
          />

          {/* Dedicated In-Store Payment Modal with Dynamic UPI QR Code */}
          {showStorePaymentModal && (
            <StorePaymentModal
              customer={enteredCustomer}
              onClose={() => setShowStorePaymentModal(false)}
              onPaymentRecorded={(payment) => {
                setShowStorePaymentModal(false);
                setActionNotice(
                  `Payment of Rs. ${payment.amount.toLocaleString()} recorded for ${enteredCustomer.name}. Receipt #${payment.receiptNumber}`
                );
                setTimeout(() => setActionNotice(null), 4000);
              }}
            />
          )}

          {/* Exit Store Modal */}
          {showExitModal && (
            <ExitStoreModal
              session={activeSession}
              onClose={() => setShowExitModal(false)}
              onConfirmCheckOut={handleConfirmCheckOut}
              onTakeOrderShortcut={() => onTakeOrder(enteredCustomer)}
              onCollectPaymentShortcut={() => setShowStorePaymentModal(true)}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {actionNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-medium flex items-center justify-between shadow-xs">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-blue-700 font-bold hover:underline ml-4">
            Dismiss
          </button>
        </div>
      )}



      {/* Top Beat Metrics Banner */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Permanent Journey Plan (PJP)
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-600 font-medium">Distributor: {stats.distributorName}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Today's Territory Beat Execution</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Shift: {stats.punchInTime || '08:30 AM'} - 05:30 PM · Representative: {stats.repName} ({stats.dsrCode})
            </p>
          </div>

          {/* Beat Selector & Map View Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="beat-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Active PJP Beat:
            </label>
            <select
              id="beat-select"
              value={selectedBeat}
              onChange={(e) => setSelectedBeat(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All PJP Beats ({customers.length} outlets)</option>
              {beats.map((b) => (
                <option key={b} value={b}>
                  {b} ({customers.filter((c) => c.routeBeat === b).length} outlets)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Core Execution KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {/* Target vs Achieved Sales */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Sales Achievement</span>
              <span className="font-bold text-blue-700">{salesAchievementPct}%</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                Rs. {stats.achievedSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-500">
                / Rs. {stats.totalSalesTarget.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${salesAchievementPct}%` }}></div>
            </div>
          </div>

          {/* Planned vs Completed Visits */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Beat Store Coverage</span>
              <span className="font-bold text-indigo-700">
                {Math.round((visitedCount / (totalBeatCustomers.length || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{visitedCount}</span>
              <span className="text-xs text-slate-500">/ {totalBeatCustomers.length} stores visited</span>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${(visitedCount / (totalBeatCustomers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Productive Calls & Strike Rate */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Strike Rate (PC / TC)</span>
              <span className="font-bold text-emerald-700">{strikeRatePct}%</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{stats.productiveVisits}</span>
              <span className="text-xs text-slate-500">productive orders</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Remaining stores: {pendingCount}</span>
              {inStoreCount > 0 && <span className="text-emerald-700 font-bold">1 in-store</span>}
            </div>
          </div>

          {/* Collection Recovery */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Collection Recovery</span>
              <span className="font-bold text-emerald-700">{collectionAchievementPct}%</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                Rs. {stats.achievedCollection.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-500">/ Rs. {stats.collectionTarget.toLocaleString()}</span>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${collectionAchievementPct}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer / Outlet Beat Execution List */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* List Header and Filter Tabs */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Scheduled Outlets on Beat</h2>
            <p className="text-xs text-slate-500">
              Enter store on arrival with GPS geofence verification · Capture orders & audit · Complete check-out on departure
            </p>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Outlets ({totalBeatCustomers.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            {inStoreCount > 0 && (
              <button
                onClick={() => setStatusFilter('in_store')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === 'in_store' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                In Store ({inStoreCount})
              </button>
            )}
            <button
              onClick={() => setStatusFilter('visited')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'visited' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({visitedCount})
            </button>
          </div>
        </div>

        {/* Outlets Cards */}
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No outlets found matching this filter in selected beat.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((customer, index) => {
              const isInStore = customer.visitStatus === 'in_store';
              const isVisited = customer.visitStatus === 'visited';
              const isOverdue = customer.outstandingBalance > customer.creditLimit * 0.75;
              const isAnotherStoreActive = activeSession && activeSession.customerId !== customer.id;

              return (
                <div
                  key={customer.id}
                  className={`p-5 transition-all ${
                    isInStore
                      ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500 shadow-xs'
                      : isVisited
                      ? 'bg-slate-50/40 hover:bg-slate-50'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isInStore
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                            : customer.type === 'wholesaler'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {customer.type === 'wholesaler' ? (
                          <Warehouse className="w-5 h-5" />
                        ) : (
                          <Store className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onViewCustomerDetails(customer)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left text-base transition-colors"
                          >
                            {index + 1}. {customer.name}
                          </button>
                          <span className="text-slate-400">·</span>
                          <span
                            className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                              customer.hulClubTier === 'Diamond Club'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : customer.hulClubTier === 'Gold Star'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : customer.hulClubTier === 'Wholesale Mandi'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {customer.hulClubTier}
                          </span>
                          <span className="text-slate-400">·</span>

                          {/* Dynamic Visit Status Badge */}
                          {isInStore ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                              <span>IN STORE NOW ({formatTimer(timerSeconds)})</span>
                            </span>
                          ) : isVisited ? (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Visited & Checked Out</span>
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Pending Visit</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-800">Proprietor: {customer.ownerName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600">{customer.address}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-mono">GST: {customer.gstin}</span>
                        </div>

                        {/* Geofence & Envision Score & Financial Snapshot */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs">
                          {/* Geofence tag */}
                          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium text-[11px]">
                            <MapPin className="w-3 h-3" />
                            <span>Geofence: {customer.geofenceDistanceMeters}m away (Verified)</span>
                          </div>

                          {/* Perfect store score */}
                          <div className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium text-[11px]">
                            <Award className="w-3 h-3" />
                            <span>Perfect Store: {customer.perfectStoreScore}%</span>
                          </div>

                          {/* Outstanding */}
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded text-[11px]">
                            <span className="text-slate-500">Outstanding:</span>
                            <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                              Rs. {customer.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Credit limit */}
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded text-[11px]">
                            <span className="text-slate-500">Limit:</span>
                            <span className="font-semibold text-slate-800">
                              Rs. {customer.creditLimit.toLocaleString()}
                            </span>
                          </div>

                          {isOverdue && (
                            <span className="text-rose-600 flex items-center gap-1 font-medium text-[11px]">
                              <AlertCircle className="w-3 h-3" /> 75%+ credit used
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls for Field Rep */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                      {/* 1. If currently inside this store -> Prominent Exit Store CTA */}
                      {isInStore ? (
                        <>
                          <button
                            onClick={() => setShowExitModal(true)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Exit Store / Check-Out</span>
                          </button>
                          <button
                            onClick={() => onTakeOrder(customer)}
                            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Take Order</span>
                          </button>
                          <button
                            onClick={() => onRecordPayment(customer)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Collect Payment</span>
                          </button>
                        </>
                      ) : isVisited ? (
                        /* 2. If store is already visited -> Summary, GPS Map, and Collection options */
                        <>
                          <button
                            onClick={() => handleViewCompletedVisit(customer)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Visit Summary</span>
                          </button>
                          <button
                            onClick={() => setSelectedOutletForMap(customer)}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="View outlet GPS location on Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>GPS Map</span>
                          </button>
                          <button
                            onClick={() => onRecordPayment(customer)}
                            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            $ Collect
                          </button>
                        </>
                      ) : (
                        /* 3. If store is pending -> Primary CTA is Enter Store (Check-In) and GPS Navigation */
                        <>
                          <button
                            onClick={() => handleInitiateEnterStore(customer)}
                            disabled={Boolean(isAnotherStoreActive)}
                            className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                              isAnotherStoreActive
                                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                                : 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 hover:shadow-md'
                            }`}
                            title={
                              isAnotherStoreActive
                                ? `Finish visit at ${activeSession?.customerName} first`
                                : 'Check-in and start in-store visit'
                            }
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Enter Store (Check-In)</span>
                          </button>

                          <button
                            onClick={() => setSelectedOutletForMap(customer)}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="View outlet GPS location on Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>GPS Map</span>
                          </button>
                        </>
                      )}

                      {/* Quick Call */}
                      <button
                        onClick={() => handleSimulateCall(customer)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
                        title="Call Customer"
                        aria-label={`Call ${customer.ownerName}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      {/* Directions */}
                      <button
                        onClick={() => handleSimulateDirections(customer)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
                        title="Navigate to store"
                        aria-label={`Directions to ${customer.name}`}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Enter Store Modal */}
      {enteringCustomer && (
        <EnterStoreModal
          customer={enteringCustomer}
          onClose={() => setEnteringCustomer(null)}
          onConfirmCheckIn={handleConfirmCheckIn}
        />
      )}

      {/* Exit Store Modal */}
      {showExitModal && activeSession && (
        <ExitStoreModal
          session={activeSession}
          onClose={() => setShowExitModal(false)}
          onConfirmCheckOut={handleConfirmCheckOut}
          onTakeOrderShortcut={() => {
            const cust = customers.find((c) => c.id === activeSession.customerId);
            if (cust) onTakeOrder(cust);
          }}
          onCollectPaymentShortcut={() => {
            const cust = customers.find((c) => c.id === activeSession.customerId);
            if (cust) onRecordPayment(cust);
          }}
        />
      )}

      {/* Visited Store Summary Dialog */}
      {viewingVisitDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block">
                  Completed Store Visit Record
                </span>
                <h3 className="text-lg font-bold text-white">{viewingVisitDetails.customer.name}</h3>
              </div>
              <button
                onClick={() => setViewingVisitDetails(null)}
                className="text-white/70 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Visit completed & geofence authenticated. Dwell time recorded.</span>
              </div>

              {viewingVisitDetails.visit ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Visit Outcome:</span>
                    <strong className="text-slate-900">{viewingVisitDetails.visit.outcome}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Visit Purpose:</span>
                    <span className="text-slate-800">{viewingVisitDetails.visit.purpose}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Store Dwell Time:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {viewingVisitDetails.visit.durationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Timestamps:</span>
                    <span className="text-slate-700">
                      {new Date(viewingVisitDetails.visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
                      {viewingVisitDetails.visit.checkOutTime
                        ? new Date(viewingVisitDetails.visit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Done'}
                    </span>
                  </div>
                  {viewingVisitDetails.visit.orderAmount ? (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Order Placed:</span>
                      <strong className="text-emerald-700">Rs. {viewingVisitDetails.visit.orderAmount.toLocaleString()}</strong>
                    </div>
                  ) : null}
                  {viewingVisitDetails.visit.paymentAmount ? (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Payment Collected:</span>
                      <strong className="text-emerald-700">Rs. {viewingVisitDetails.visit.paymentAmount.toLocaleString()}</strong>
                    </div>
                  ) : null}
                  {viewingVisitDetails.visit.noOrderReason && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Non-Productive Reason:</span>
                      <span className="text-amber-800 font-medium">{viewingVisitDetails.visit.noOrderReason}</span>
                    </div>
                  )}
                  {viewingVisitDetails.visit.generalNotes && (
                    <div className="py-1.5">
                      <span className="text-slate-500 block mb-1">Rep Notes:</span>
                      <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-200">
                        "{viewingVisitDetails.visit.generalNotes}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">
                  Store marked visited earlier in today's beat shift.
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingVisitDetails(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outlet Location GPS Modal for Single Outlet */}
      {selectedOutletForMap && (
        <OutletLocationModal
          outlet={selectedOutletForMap}
          allOutlets={customers}
          onClose={() => {
            setSelectedOutletForMap(null);
          }}
          onEnterStore={(cust) => {
            setSelectedOutletForMap(null);
            handleInitiateEnterStore(cust);
          }}
        />
      )}
    </div>
  );
};
