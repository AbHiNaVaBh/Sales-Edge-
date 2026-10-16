import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
  Store,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { DailyBeatStats, ActiveStoreSession, Customer } from '../types/index.ts';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSyncCenter: () => void;
  onStartNewOrder: (customer?: Customer) => void;
  onResetApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSyncCenter,
  onStartNewOrder,
  onResetApp,
}) => {
  const [stats, setStats] = useState<DailyBeatStats>(db.getDailyStats());
  const [activeSession, setActiveSession] = useState<ActiveStoreSession | null>(db.getActiveStoreSession());
  const [isOnline, setIsOnline] = useState<boolean>(db.isOnline());
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(db.getIsSimulatedOffline());
  const [queueCount, setQueueCount] = useState<number>(db.getSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setStats(db.getDailyStats());
      setActiveSession(db.getActiveStoreSession());
      setIsOnline(db.isOnline());
      setSimulatedOffline(db.getIsSimulatedOffline());
      setQueueCount(db.getSyncQueue().length);
    });
    return unsubscribe;
  }, []);

  const handleToggleOffline = () => {
    const nextVal = !simulatedOffline;
    db.setSimulatedOffline(nextVal);
  };

  const handleQuickSync = async () => {
    if (!isOnline) {
      setSyncFeedback('Cannot sync: Device offline');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }
    setIsSyncing(true);
    const result = await db.performSync();
    setIsSyncing(false);
    setSyncFeedback(result.message);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handlePunchToggle = () => {
    db.togglePunch(stats.repName);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      {/* Top Banner for Field Sales Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between py-3 gap-3">
          {/* Brand & Rep Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center font-bold text-white shadow-inner">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">HUL SalesEdge</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-blue-300 font-medium">Hindustan Unilever Field SFA</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-[11px] bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                  {stats.dsrCode || 'DSR-HUL-9842'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                <span className="font-semibold text-slate-100">{stats.repName}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-slate-300 truncate max-w-xs">{stats.distributorName || 'Shree Balaji Consumer Agencies (HUL RS)'}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-amber-300 font-semibold">Rs. {stats.dailyIncentiveEarned} Incentive Today</span>
              </div>
            </div>
          </div>

          {/* Rep Controls: In-Store Session, Punch-In, Offline Mode, Sync */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Active In-Store indicator */}
            {activeSession && (
              <button
                onClick={() => setActiveTab('beat')}
                aria-label={`Currently in ${activeSession.customerName}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-900/90 border border-emerald-400 text-emerald-200 hover:bg-emerald-800 transition-colors shadow-xs"
                title="Click to view active in-store visit on Beat"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="truncate max-w-[150px]">In: {activeSession.customerName}</span>
              </button>
            )}

            {/* Punch In / Out Button */}
            <button
              onClick={handlePunchToggle}
              aria-label={stats.isPunchedIn ? 'Punch Out for the day' : 'Punch In to start beat'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                stats.isPunchedIn
                  ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{stats.isPunchedIn ? `Active (${stats.punchInTime || '08:30 AM'})` : 'Punched Out'}</span>
            </button>

            {/* Simulated Offline Toggle */}
            <button
              onClick={handleToggleOffline}
              aria-label={simulatedOffline ? 'Switch to Online mode' : 'Simulate Offline mode'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                !isOnline
                  ? 'bg-amber-950/70 border-amber-600/70 text-amber-300 hover:bg-amber-900/80'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Click to toggle offline mode simulation for testing field resilience"
            >
              {!isOnline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
            </button>

            {/* Sync Status Button */}
            <button
              onClick={queueCount > 0 ? handleQuickSync : onOpenSyncCenter}
              disabled={isSyncing}
              aria-label="Sync status and offline queue center"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                queueCount > 0
                  ? 'bg-blue-900/70 border-blue-600 text-blue-200 hover:bg-blue-800'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={queueCount > 0 ? `${queueCount} items in offline queue` : 'All records synced'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : queueCount > 0 ? `${queueCount} Pending Sync` : 'Synced'}</span>
            </button>

            {/* Only allow in-store order when store session is active */}
            {activeSession && (
              <button
                onClick={() => {
                  const cust = db.getCustomerById(activeSession.customerId);
                  if (cust) {
                    onStartNewOrder(cust);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                title={`Book order for entered store: ${activeSession.customerName}`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>In-Store Order</span>
              </button>
            )}

            {/* Temporary Testing Utility: Reset App & Data */}
            <button
              onClick={onResetApp}
              aria-label="Temporary testing utility: Reset app and data"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-300 hover:text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
              title="Temporary testing button: Reset all app data to default demo state (can be removed later)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Reset App (Testing)</span>
            </button>
          </div>
        </div>

        {/* Sync or Locked Navigation Toast Feedback */}
        {syncFeedback && (
          <div className="mb-2 py-1.5 px-3 bg-blue-950/90 border border-blue-700/60 rounded-md text-xs text-blue-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {syncFeedback}
            </span>
            <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white text-xs pl-2">✕</button>
          </div>
        )}

        {/* In-Store Mode Notification Pill if active */}
        {activeSession && (
          <div className="px-3 py-1 mb-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded-lg flex items-center justify-between text-[11px] text-emerald-200">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                <strong>In-Store Navigation Locked:</strong> Currently inside <strong>{activeSession.customerName}</strong>. You cannot switch to other tabs until you exit this store.
              </span>
            </div>
            <span className="font-mono text-amber-300 font-bold shrink-0 ml-2">Store Active</span>
          </div>
        )}

        {/* Navigation Tabs - Locked when in-store */}
        <nav className="flex space-x-1 border-t border-slate-800 pt-1 pb-1 overflow-x-auto text-xs font-medium" aria-label="Main Navigation">
          {[
            { id: 'beat', label: activeSession ? `In-Store: ${activeSession.customerName}` : 'Daily Beat & Visits' },
            { id: 'orders', label: 'Orders & Schemes' },
            { id: 'payments', label: 'Payment Collection' },
            { id: 'customers', label: 'Customers & Outlets' },
            { id: 'reports', label: 'Performance Dashboards' },
            { id: 'sync', label: 'Sync & Offline Center' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const isLocked = Boolean(activeSession && tab.id !== 'beat');

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isLocked) {
                    setSyncFeedback(
                      `Navigation locked: Currently inside ${activeSession?.customerName}. Complete or exit visit before switching tabs.`
                    );
                    setTimeout(() => setSyncFeedback(null), 4000);
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                disabled={isLocked}
                title={
                  isLocked
                    ? `Navigation locked: Inside ${activeSession?.customerName}. Complete or exit visit to unlock.`
                    : tab.label
                }
                className={`px-3.5 py-2 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? activeSession
                      ? 'bg-emerald-700 text-white font-bold ring-2 ring-emerald-400 shadow-sm'
                      : 'bg-blue-600 text-white font-semibold shadow-xs'
                    : isLocked
                    ? 'text-slate-500 opacity-40 cursor-not-allowed hover:bg-transparent'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isLocked && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                {activeSession && tab.id === 'beat' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
