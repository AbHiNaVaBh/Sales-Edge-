import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Database,
  Lock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  X,
  FileText,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { db } from '../services/db.ts';
import { packageSecurePayload } from '../utils/syncEngine.ts';
import type { SyncQueueItem } from '../types/index.ts';

interface SyncCenterModalProps {
  onClose: () => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({ onClose }) => {
  const [isOnline, setIsOnline] = useState<boolean>(db.isOnline());
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(db.getIsSimulatedOffline());
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(db.getSyncQueue());
  const [lastSyncTime, setLastSyncTime] = useState<string>(db.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setIsOnline(db.isOnline());
      setSimulatedOffline(db.getIsSimulatedOffline());
      setSyncQueue(db.getSyncQueue());
      setLastSyncTime(db.getLastSyncTime());
    });
    return unsubscribe;
  }, []);

  const handleToggleOffline = () => {
    db.setSimulatedOffline(!simulatedOffline);
  };

  const handleTriggerSync = async () => {
    if (!isOnline) {
      setSyncStatusMsg('Cannot synchronize while offline. Please turn off Offline Mode first.');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg('Encrypting payload and synchronizing with central ERP server...');
    const result = await db.performSync();
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
  };

  const handleResetData = () => {
    db.resetToDefaultSeed();
    setShowResetConfirm(false);
    setSyncStatusMsg('Database restored to default demo state.');
  };

  const packagePreview = packageSecurePayload(syncQueue);

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Offline Resilience & Cloud Sync Center</h2>
              <p className="text-xs text-slate-300">
                AES-256 Encrypted Sync Engine with Bi-directional Offline Queue
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Connection Status & Mode Switch */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  {isOnline ? 'Online - Cloud Sync Active' : 'Offline Mode Enabled'}
                </span>
                <span className="text-slate-500">
                  {isOnline
                    ? 'Mutations synchronize automatically over TLS to central database.'
                    : 'All orders, payments, and visits are buffered safely in local storage.'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleOffline}
              className={`px-3.5 py-2 rounded-lg font-bold border transition-colors shrink-0 ${
                simulatedOffline
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {simulatedOffline ? 'Switch to Online' : 'Simulate Offline Mode'}
            </button>
          </div>

          {/* Sync Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium block">Pending Offline Queue</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{syncQueue.length} record(s)</span>
              <span className="text-[11px] text-slate-400">Buffered locally</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium block">Tamper Checksum</span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-1 block truncate">
                {packagePreview.checksum}
              </span>
              <span className="text-[11px] text-emerald-600">Verified Payload Hash</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium block">Last Cloud Sync</span>
              <span className="text-xs font-semibold text-slate-800 mt-1 block">
                {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[11px] text-slate-400">{new Date(lastSyncTime).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncStatusMsg && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Pending Queue Items List */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Pending Synchronization Queue</h4>
            {syncQueue.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                <span className="font-semibold block text-slate-700">Local Ledger is Fully Synchronized</span>
                <p className="text-slate-400 mt-0.5">No pending mutations waiting in offline queue.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {syncQueue.map((item) => (
                  <div key={item.id} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {item.entityType === 'order' && <FileText className="w-4 h-4 text-blue-600" />}
                      {item.entityType === 'payment' && <DollarSign className="w-4 h-4 text-emerald-600" />}
                      {item.entityType === 'visit' && <UserCheck className="w-4 h-4 text-indigo-600" />}
                      {item.entityType === 'customer' && <Database className="w-4 h-4 text-purple-600" />}
                      <div>
                        <span className="font-bold text-slate-900 capitalize">
                          {item.action} {item.entityType}
                        </span>
                        <span className="text-slate-400 font-mono block text-[11px]">{item.entityId}</span>
                      </div>
                    </div>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                      Pending Push
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security & Encryption Verification */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Offline Security & End-to-End Encryption Protocol</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              When disconnected from cellular networks, FieldPulse stores sales transactions locally using
              high-durability offline storage. When connectivity is re-established, the payload is packaged with
              SHA-256 integrity checksums, encrypted with AES-256-GCM, and reconciled FIFO against central ERP servers.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-slate-500 hover:text-rose-600 font-medium text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Seed Data</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
            >
              Close
            </button>
            <button
              disabled={isSyncing}
              onClick={handleTriggerSync}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-70 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">Reset Local Database?</h4>
            <p className="text-xs text-slate-500">
              This will restore all sample retailers, wholesalers, products, schemes, and initial orders to default seed data.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-xs text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
