/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { BeatDashboard } from './components/BeatDashboard.tsx';
import { OrderTakingModal } from './components/OrderTakingModal.tsx';
import { OrderManagement } from './components/OrderManagement.tsx';
import { PaymentManagement } from './components/PaymentManagement.tsx';
import { CustomerDirectory } from './components/CustomerDirectory.tsx';
import { ReportingDashboard } from './components/ReportingDashboard.tsx';
import { SyncCenterModal } from './components/SyncCenterModal.tsx';
import { VisitLoggerModal } from './components/VisitLoggerModal.tsx';
import { ResetConfirmModal } from './components/ResetConfirmModal.tsx';
import { db } from './services/db.ts';
import type { Customer, Order, CustomerVisit } from './types/index.ts';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('beat');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [customerForOrder, setCustomerForOrder] = useState<Customer | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [customerForPayment, setCustomerForPayment] = useState<Customer | null>(null);

  const [isVisitModalOpen, setIsVisitModalOpen] = useState<boolean>(false);
  const [customerForVisit, setCustomerForVisit] = useState<Customer | null>(null);

  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handlers for modal interactions
  const handleStartOrder = (customer?: Customer) => {
    const session = db.getActiveStoreSession();
    if (session) {
      const activeCustomer = db.getCustomerById(session.customerId);
      setCustomerForOrder(activeCustomer || null);
    } else {
      setCustomerForOrder(customer || null);
    }
    setIsOrderModalOpen(true);
  };

  const handleStartPayment = (customer?: Customer) => {
    const session = db.getActiveStoreSession();
    if (session) {
      // In active store mode, remain strictly in store view
      setActiveTab('beat');
      return;
    }
    setCustomerForPayment(customer || null);
    setActiveTab('payments');
  };

  const handleStartVisit = (customer?: Customer) => {
    setCustomerForVisit(customer || null);
    setIsVisitModalOpen(true);
  };

  const handleOrderSuccess = (order: Order) => {
    setIsOrderModalOpen(false);
    const session = db.getActiveStoreSession();
    if (session) {
      showToast(`Order ${order.orderNumber} booked for ${order.customerName}! Rs. ${order.grandTotal.toFixed(2)} added to store session.`);
      setActiveTab('beat');
      return;
    }
    showToast(`Order ${order.orderNumber} booked successfully! Grand Total: Rs. ${order.grandTotal.toFixed(2)}`);
    setActiveTab('orders');
  };

  const handleConfirmReset = () => {
    db.resetToDefaultSeed();
    setActiveTab('beat');
    setIsResetModalOpen(false);
    setIsOrderModalOpen(false);
    setIsPaymentModalOpen(false);
    setIsVisitModalOpen(false);
    setIsSyncCenterOpen(false);
    showToast('App and data reset to default demo state successfully.');
  };

  const handleVisitLogged = (visit: CustomerVisit) => {
    setIsVisitModalOpen(false);
    showToast(`Visit to ${visit.customerName} recorded. Outcome: ${visit.outcome}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          const session = db.getActiveStoreSession();
          if (session && tab !== 'beat') {
            showToast(`Navigation locked: Currently inside ${session.customerName}. Complete or exit visit first.`);
            return;
          }
          if (tab === 'sync') {
            setIsSyncCenterOpen(true);
          } else {
            setCustomerForPayment(null);
            setCustomerForOrder(null);
            setActiveTab(tab);
          }
        }}
        onOpenSyncCenter={() => {
          const session = db.getActiveStoreSession();
          if (session) {
            showToast(`Navigation locked: Complete or exit visit at ${session.customerName} before opening Sync Center.`);
            return;
          }
          setIsSyncCenterOpen(true);
        }}
        onStartNewOrder={(cust) => handleStartOrder(cust)}
        onResetApp={() => setIsResetModalOpen(true)}
      />

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-md animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium leading-relaxed">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold pl-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'beat' && (
          <BeatDashboard
            onTakeOrder={(cust) => handleStartOrder(cust)}
            onRecordPayment={(cust) => handleStartPayment(cust)}
            onLogVisit={(cust) => handleStartVisit(cust)}
            onViewCustomerDetails={(cust) => {
              setActiveTab('customers');
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManagement onStartNewOrder={() => handleStartOrder()} />
        )}

        {activeTab === 'payments' && (
          <PaymentManagement
            initialCustomer={customerForPayment}
            onOpenRecordPayment={() => {}}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerDirectory
            onTakeOrder={(cust) => handleStartOrder(cust)}
            onRecordPayment={(cust) => handleStartPayment(cust)}
            onLogVisit={(cust) => handleStartVisit(cust)}
          />
        )}

        {activeTab === 'reports' && <ReportingDashboard />}
      </main>

      {/* Modals */}
      {isOrderModalOpen && (
        <OrderTakingModal
          initialCustomer={customerForOrder}
          onClose={() => setIsOrderModalOpen(false)}
          onOrderSuccess={handleOrderSuccess}
        />
      )}

      {isVisitModalOpen && (
        <VisitLoggerModal
          initialCustomer={customerForVisit}
          onClose={() => setIsVisitModalOpen(false)}
          onVisitLogged={handleVisitLogged}
        />
      )}

      {isSyncCenterOpen && (
        <SyncCenterModal onClose={() => setIsSyncCenterOpen(false)} />
      )}

      {/* Temporary Reset App Data Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmReset}
      />
    </div>
  );
}
