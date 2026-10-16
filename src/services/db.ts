import type {
  Customer,
  Product,
  Scheme,
  Order,
  PaymentRecord,
  CustomerVisit,
  DailyBeatStats,
  SyncQueueItem,
  ActiveStoreSession,
  VisitPurpose,
  VisitOutcome,
} from '../types/index.ts';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SCHEMES,
  INITIAL_ORDERS,
  INITIAL_PAYMENTS,
  INITIAL_VISITS,
  INITIAL_BEAT_STATS,
} from './seedData.ts';
import { createSyncQueueItem, packageSecurePayload } from '../utils/syncEngine.ts';

const STORAGE_KEYS = {
  CUSTOMERS: 'salesedge_customers_v2',
  PRODUCTS: 'salesedge_products_v2',
  SCHEMES: 'salesedge_schemes_v2',
  ORDERS: 'salesedge_orders_v2',
  PAYMENTS: 'salesedge_payments_v2',
  VISITS: 'salesedge_visits_v2',
  STATS: 'salesedge_stats_v2',
  SYNC_QUEUE: 'salesedge_sync_queue_v2',
  OFFLINE_OVERRIDE: 'salesedge_simulated_offline_v2',
  LAST_SYNC_TIME: 'salesedge_last_sync_time_v2',
  ACTIVE_STORE_SESSION: 'salesedge_active_store_session_v2',
};

type Listener = () => void;

class DatabaseService {
  private listeners: Set<Listener> = new Set();
  private isSimulatedOffline: boolean = false;

  constructor() {
    this.initData();
    if (typeof window !== 'undefined') {
      const storedOffline = localStorage.getItem(STORAGE_KEYS.OFFLINE_OVERRIDE);
      this.isSimulatedOffline = storedOffline === 'true';

      window.addEventListener('online', () => {
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.notify();
      });
    }
  }

  private initData() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEMES)) {
      localStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(INITIAL_SCHEMES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VISITS)) {
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(INITIAL_VISITS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STATS)) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(INITIAL_BEAT_STATS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE)) {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME)) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in DB listener:', err);
      }
    });
  }

  // Network State
  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  }

  public getIsSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(val: boolean) {
    this.isSimulatedOffline = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_OVERRIDE, val ? 'true' : 'false');
    }
    this.notify();
  }

  // Customers
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public saveCustomer(customer: Customer): Customer {
    const list = this.getCustomers();
    const existingIndex = list.findIndex((c) => c.id === customer.id);
    let updated: Customer[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = customer;
    } else {
      updated = [customer, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));

    // Queue for sync if offline
    if (!this.isOnline()) {
      this.enqueueSyncItem('customer', customer.id, existingIndex >= 0 ? 'update' : 'create', customer);
    }

    this.notify();
    return customer;
  }

  // Products
  public getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  // Schemes
  public getSchemes(): Scheme[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEMES);
      return data ? JSON.parse(data) : INITIAL_SCHEMES;
    } catch {
      return INITIAL_SCHEMES;
    }
  }

  // Orders
  public getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  }

  public createOrder(orderInput: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'syncStatus'>): Order {
    const orders = this.getOrders();
    const isOnline = this.isOnline();
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = `HUL-ORD-2026-${100 + orders.length + 1}`;

    const linesCount = orderInput.items?.length || 1;
    const newOrder: Order = {
      ...orderInput,
      id,
      orderNumber,
      linesPerCall: linesCount,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending_sync',
    };

    const updated = [newOrder, ...orders];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));

    // Update customer outstanding balance
    const customer = this.getCustomerById(newOrder.customerId);
    if (customer) {
      const updatedBalance = customer.outstandingBalance + newOrder.grandTotal;
      this.saveCustomer({
        ...customer,
        outstandingBalance: Math.round(updatedBalance * 100) / 100,
        lastVisitDate: new Date().toISOString().split('T')[0],
        visitStatus: 'visited',
      });
    }

    // Update daily stats & DSR incentives
    const stats = this.getDailyStats();
    const newProductiveCalls = stats.productiveVisits + 1;
    const allLines = updated.reduce((acc, o) => acc + (o.linesPerCall || 1), 0);
    const avgLPC = Math.round((allLines / updated.length) * 10) / 10;
    const additionalIncentive = 120 + (linesCount >= 4 ? 60 : 0);

    this.saveDailyStats({
      ...stats,
      productiveVisits: newProductiveCalls,
      linesPerCallAchieved: avgLPC,
      dailyIncentiveEarned: stats.dailyIncentiveEarned + additionalIncentive,
      achievedSales: Math.round((stats.achievedSales + newOrder.grandTotal) * 100) / 100,
    });

    // Update active store session if currently in this customer's store
    const activeSession = this.getActiveStoreSession();
    if (activeSession && activeSession.customerId === newOrder.customerId) {
      this.updateActiveSessionMetrics(newOrder.grandTotal, undefined, newOrder.id, newOrder.orderNumber);
    }

    // Queue sync if offline
    if (!isOnline) {
      this.enqueueSyncItem('order', newOrder.id, 'create', newOrder);
    }

    this.notify();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return undefined;

    const isOnline = this.isOnline();
    const updatedOrder: Order = {
      ...order,
      status,
      syncStatus: isOnline ? 'synced' : 'pending_sync',
    };

    const updated = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));

    if (!isOnline) {
      this.enqueueSyncItem('order', orderId, 'update', { id: orderId, status });
    }

    this.notify();
    return updatedOrder;
  }

  // Payments
  public getPayments(): PaymentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return data ? JSON.parse(data) : INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
  }

  public recordPayment(paymentInput: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'createdAt' | 'syncStatus'>): PaymentRecord {
    const payments = this.getPayments();
    const isOnline = this.isOnline();
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = `REC-2026-${880 + payments.length + 1}`;

    const newPayment: PaymentRecord = {
      ...paymentInput,
      id,
      receiptNumber,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending_sync',
    };

    const updatedPayments = [newPayment, ...payments];
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));

    // Update customer outstanding
    const customer = this.getCustomerById(newPayment.customerId);
    if (customer) {
      const newBal = Math.max(0, customer.outstandingBalance - newPayment.amount);
      this.saveCustomer({
        ...customer,
        outstandingBalance: Math.round(newBal * 100) / 100,
      });
    }

    // Mark allocated orders as paid or partial
    if (newPayment.invoiceAllocations && newPayment.invoiceAllocations.length > 0) {
      const orders = this.getOrders();
      let ordersUpdated = false;
      const updatedOrders = orders.map((ord) => {
        const alloc = newPayment.invoiceAllocations.find((a) => a.orderId === ord.id);
        if (alloc) {
          ordersUpdated = true;
          const totalPaid = Math.round(((ord.amountPaid || 0) + alloc.allocatedAmount) * 100) / 100;
          const status: Order['paymentStatus'] = totalPaid >= ord.grandTotal ? 'paid' : 'partial';
          return {
            ...ord,
            amountPaid: totalPaid,
            paymentStatus: status,
          };
        }
        return ord;
      });

      if (ordersUpdated) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
      }
    }

    // Update Daily Stats
    const stats = this.getDailyStats();
    this.saveDailyStats({
      ...stats,
      achievedCollection: Math.round((stats.achievedCollection + newPayment.amount) * 100) / 100,
    });

    // Update active store session if currently in this customer's store
    const activeSession = this.getActiveStoreSession();
    if (activeSession && activeSession.customerId === newPayment.customerId) {
      this.updateActiveSessionMetrics(undefined, newPayment.amount);
    }

    if (!isOnline) {
      this.enqueueSyncItem('payment', newPayment.id, 'create', newPayment);
    }

    this.notify();
    return newPayment;
  }

  // Customer Visits
  public getVisits(): CustomerVisit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VISITS);
      return data ? JSON.parse(data) : INITIAL_VISITS;
    } catch {
      return INITIAL_VISITS;
    }
  }

  public recordVisit(visitInput: Omit<CustomerVisit, 'id' | 'createdAt' | 'syncStatus'>): CustomerVisit {
    const visits = this.getVisits();
    const isOnline = this.isOnline();
    const id = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newVisit: CustomerVisit = {
      ...visitInput,
      id,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending_sync',
    };

    const updated = [newVisit, ...visits];
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(updated));

    // Update customer visit status
    const customer = this.getCustomerById(newVisit.customerId);
    if (customer) {
      this.saveCustomer({
        ...customer,
        visitStatus: 'visited',
        lastVisitDate: new Date().toISOString().split('T')[0],
      });
    }

    // Update Daily Stats
    const stats = this.getDailyStats();
    const isProductive =
      newVisit.outcome === 'Productive - Order Placed' ||
      newVisit.outcome === 'Both Order & Payment';

    this.saveDailyStats({
      ...stats,
      completedVisits: stats.completedVisits + 1,
      productiveVisits: isProductive ? stats.productiveVisits + 1 : stats.productiveVisits,
    });

    if (!isOnline) {
      this.enqueueSyncItem('visit', newVisit.id, 'create', newVisit);
    }

    this.notify();
    return newVisit;
  }

  // Active In-Store Session Management
  public getActiveStoreSession(): ActiveStoreSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public checkInStore(customer: Customer): ActiveStoreSession {
    const existing = this.getActiveStoreSession();
    if (existing && existing.customerId !== customer.id) {
      throw new Error(`Already checked in at ${existing.customerName}. Please complete check-out or exit before entering another store.`);
    }

    const session: ActiveStoreSession = {
      customerId: customer.id,
      customerName: customer.name,
      ownerName: customer.ownerName,
      routeBeat: customer.routeBeat,
      checkInTime: new Date().toISOString(),
      checkInTimestamp: Date.now(),
      geofenceVerified: true,
      distanceMeters: customer.geofenceDistanceMeters || 18,
      ordersPlacedCount: 0,
      totalOrderAmount: 0,
      paymentsCollectedCount: 0,
      totalPaymentAmount: 0,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE_SESSION, JSON.stringify(session));

    // Update customer visit status to in_store
    this.saveCustomer({
      ...customer,
      visitStatus: 'in_store',
    });

    this.notify();
    return session;
  }

  public updateActiveSessionMetrics(
    orderAmount?: number,
    paymentAmount?: number,
    _orderId?: string,
    _orderNumber?: string
  ) {
    const session = this.getActiveStoreSession();
    if (!session) return;
    if (orderAmount !== undefined) {
      session.ordersPlacedCount += 1;
      session.totalOrderAmount = Math.round((session.totalOrderAmount + orderAmount) * 100) / 100;
    }
    if (paymentAmount !== undefined) {
      session.paymentsCollectedCount += 1;
      session.totalPaymentAmount = Math.round((session.totalPaymentAmount + paymentAmount) * 100) / 100;
    }
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE_SESSION, JSON.stringify(session));
    this.notify();
  }

  public cancelActiveStoreSession(): void {
    const session = this.getActiveStoreSession();
    if (session) {
      const customer = this.getCustomerById(session.customerId);
      if (customer && customer.visitStatus === 'in_store') {
        this.saveCustomer({
          ...customer,
          visitStatus: 'pending',
        });
      }
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_SESSION);
      this.notify();
    }
  }

  public checkOutStore(params: {
    purpose: VisitPurpose;
    outcome: VisitOutcome;
    noOrderReason?: string;
    stockNotes?: string;
    generalNotes?: string;
    shelfPhotoVerified?: boolean;
    orderId?: string;
    orderNumber?: string;
    orderAmount?: number;
    paymentId?: string;
    paymentAmount?: number;
  }): CustomerVisit {
    const session = this.getActiveStoreSession();
    if (!session) {
      throw new Error('No active store visit found to check out from.');
    }

    const checkOutTime = new Date().toISOString();
    const durationMinutes = Math.max(1, Math.round((Date.now() - session.checkInTimestamp) / 60000));

    // Determine final outcome
    let finalOutcome = params.outcome;
    const finalOrderAmount = params.orderAmount || session.totalOrderAmount;
    const finalPaymentAmount = params.paymentAmount || session.totalPaymentAmount;

    if (finalOrderAmount > 0 && finalPaymentAmount > 0) {
      finalOutcome = 'Both Order & Payment';
    } else if (finalOrderAmount > 0) {
      finalOutcome = 'Productive - Order Placed';
    } else if (finalPaymentAmount > 0) {
      finalOutcome = 'Payment Collected';
    }

    const visit = this.recordVisit({
      customerId: session.customerId,
      customerName: session.customerName,
      routeBeat: session.routeBeat,
      checkInTime: session.checkInTime,
      checkOutTime,
      durationMinutes,
      purpose: params.purpose,
      outcome: finalOutcome,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      orderAmount: finalOrderAmount,
      paymentId: params.paymentId,
      paymentAmount: finalPaymentAmount,
      noOrderReason: params.noOrderReason,
      stockNotes: params.stockNotes,
      generalNotes: params.generalNotes,
      shelfPhotoVerified: params.shelfPhotoVerified,
    });

    // Remove active store session
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_SESSION);

    // Update customer visit status to visited
    const customer = this.getCustomerById(session.customerId);
    if (customer) {
      this.saveCustomer({
        ...customer,
        visitStatus: 'visited',
        lastVisitDate: new Date().toISOString().split('T')[0],
      });
    }

    this.notify();
    return visit;
  }

  // Daily Stats
  public getDailyStats(): DailyBeatStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      return data ? JSON.parse(data) : INITIAL_BEAT_STATS;
    } catch {
      return INITIAL_BEAT_STATS;
    }
  }

  public saveDailyStats(stats: DailyBeatStats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    this.notify();
  }

  public togglePunch(repName: string = 'Abhinav Sharma') {
    const stats = this.getDailyStats();
    const newPunched = !stats.isPunchedIn;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.saveDailyStats({
      ...stats,
      repName,
      isPunchedIn: newPunched,
      punchInTime: newPunched ? nowStr : stats.punchInTime,
      punchOutTime: !newPunched ? nowStr : undefined,
    });
  }

  // Sync Queue Engine
  public getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private enqueueSyncItem(
    entityType: 'order' | 'payment' | 'visit' | 'customer',
    entityId: string,
    action: 'create' | 'update',
    payload: any
  ) {
    const queue = this.getSyncQueue();
    const item = createSyncQueueItem(entityType, entityId, action, payload);
    const updated = [...queue, item];
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updated));
    this.notify();
  }

  public getLastSyncTime(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || new Date().toISOString();
  }

  /**
   * Executes secure synchronization with simulated cloud server
   */
  public async performSync(): Promise<{
    success: boolean;
    syncedCount: number;
    checksum: string;
    message: string;
  }> {
    if (!this.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        checksum: '',
        message: 'Device is offline. Connect to network to synchronize.',
      };
    }

    const queue = this.getSyncQueue();
    if (queue.length === 0) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
      this.notify();
      return {
        success: true,
        syncedCount: 0,
        checksum: 'SHA256-CLEAN-STATE',
        message: 'All records are already up-to-date with central server.',
      };
    }

    const packageMeta = packageSecurePayload(queue);

    // Simulate network roundtrip latency with server
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mark all orders as synced
    const orders = this.getOrders().map((o) => ({ ...o, syncStatus: 'synced' as const }));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Mark all payments as synced
    const payments = this.getPayments().map((p) => ({ ...p, syncStatus: 'synced' as const }));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    // Mark all visits as synced
    const visits = this.getVisits().map((v) => ({ ...v, syncStatus: 'synced' as const }));
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));

    // Clear sync queue
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());

    this.notify();

    return {
      success: true,
      syncedCount: queue.length,
      checksum: packageMeta.checksum,
      message: `Successfully synchronized ${queue.length} pending record(s) over encrypted channel.`,
    };
  }

  // Reset to initial demo state
  public resetToDefaultSeed() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_OVERRIDE);
    this.isSimulatedOffline = false;
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(INITIAL_SCHEMES));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(INITIAL_VISITS));
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(INITIAL_BEAT_STATS));
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
    this.notify();
  }
}

export const db = new DatabaseService();
