/**
 * HUL SalesEdge - FMCG Sales Force Automation & Market Execution
 * Domain Types & Interfaces
 */

export type CustomerType = 'retailer' | 'wholesaler';

export type CustomerTier = 'A' | 'B' | 'C';

export type HULClubTier = 'Diamond Club' | 'Gold Star' | 'Silver Kirana' | 'Wholesale Mandi';

export type VisitStatus = 'pending' | 'in_store' | 'visited' | 'skipped';

export interface Customer {
  id: string;
  name: string;
  ownerName: string;
  type: CustomerType;
  tier: CustomerTier;
  hulClubTier: HULClubTier;
  phone: string;
  email: string;
  address: string;
  routeBeat: string;
  pjpDay: string; // e.g. "Monday", "Thursday"
  gstin: string;
  creditLimit: number;
  outstandingBalance: number;
  paymentTermsDays: number;
  visitStatus: VisitStatus;
  lastVisitDate: string;
  geofenceDistanceMeters: number; // e.g. 24 meters away
  perfectStoreScore: number; // 0-100%
  locationCoords?: { lat: number; lng: number };
  notes?: string;
}

export type ProductCategory =
  | 'Home Care'
  | 'Beauty & Personal Care'
  | 'Foods & Refreshment'
  | 'Beverages & Nutrition';

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string; // e.g. "Surf Excel", "Dove", "Horlicks"
  category: ProductCategory;
  unit: string; // e.g. "Shipper Carton (24x1kg)" or "Bundle of 12"
  mrp: number; // Maximum Retail Price
  retailPrice: number; // PTR (Price to Retailer)
  wholesalePrice: number; // PTW (Price to Wholesaler)
  stockQuantity: number;
  minOrderRetail: number;
  minOrderWholesale: number;
  taxRate: number; // 0.05 or 0.18
  isFocusSKU?: boolean; // HUL Focus Drive SKU of the Month
  isMustSell?: boolean; // Core Must-Sell product for perfect store
  packDescription: string;
  marginPct: number; // Retailer Gross Margin %
}

export type SchemeType =
  | 'slab_discount'       // percentage discount on subtotal if order value/qty threshold met
  | 'buy_x_get_y'         // QPS: buy X items of target product, get Y free goods
  | 'combo_discount'      // flat cash discount if qualifying combo met
  | 'instant_cash_scheme';// CD: Cash discount for immediate spot settlement

export interface Scheme {
  id: string;
  code: string;
  title: string;
  description: string;
  type: SchemeType;
  applicableTo: 'retailer' | 'wholesaler' | 'both';
  badge: string;
  validUntil: string;
  minOrderValue?: number;
  minQuantity?: number;
  discountPercentage?: number;
  flatDiscount?: number;
  targetProductId?: string;
  buyQuantity?: number;
  freeProductId?: string;
  freeProductName?: string;
  freeQuantity?: number;
  active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CalculatedFreeItem {
  productId: string;
  productName: string;
  freeQuantity: number;
  schemeTitle: string;
}

export interface AppliedSchemeDetail {
  schemeId: string;
  schemeCode: string;
  title: string;
  discountAmount: number;
  freeItems?: CalculatedFreeItem[];
  type: SchemeType;
}

export interface OrderCalculationResult {
  grossSubtotal: number;
  appliedSchemes: AppliedSchemeDetail[];
  totalSchemeDiscount: number;
  freeItems: CalculatedFreeItem[];
  netAfterDiscounts: number;
  taxAmount: number;
  grandTotal: number;
  isCreditExceeded: boolean;
  creditDeficit: number;
}

export type OrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'confirmed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface OrderItemRecord {
  productId: string;
  productCode: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  unit: string;
  unitPrice: number;
  quantity: number;
  totalGross: number;
  appliedDiscount: number;
  netTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  routeBeat: string;
  date: string;
  status: OrderStatus;
  items: OrderItemRecord[];
  grossSubtotal: number;
  schemeDiscount: number;
  appliedSchemes: AppliedSchemeDetail[];
  freeItems: CalculatedFreeItem[];
  taxAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  linesPerCall: number; // Number of unique lines booked
  notes?: string;
  repSignature?: string;
  syncStatus: 'synced' | 'pending_sync' | 'failed';
  createdAt: string;
}

export type PaymentMode = 'cash' | 'upi' | 'cheque' | 'bank_transfer';

export interface PaymentInvoiceAllocation {
  orderId: string;
  orderNumber: string;
  allocatedAmount: number;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  date: string;
  repNotes?: string;
  invoiceAllocations: PaymentInvoiceAllocation[];
  syncStatus: 'synced' | 'pending_sync';
  createdAt: string;
}

export type VisitPurpose =
  | 'Order Booking'
  | 'Payment Collection'
  | 'Stock Audit'
  | 'Envision Shelf Check'
  | 'Scheme Presentation'
  | 'Complaint Resolution';

export type VisitOutcome =
  | 'Productive - Order Placed'
  | 'Payment Collected'
  | 'Both Order & Payment'
  | 'Follow-up Scheduled'
  | 'Store Closed'
  | 'Owner Unavailable';

export interface ActiveStoreSession {
  customerId: string;
  customerName: string;
  ownerName: string;
  routeBeat: string;
  checkInTime: string; // ISO string e.g. "2026-10-15T10:30:00Z"
  checkInTimestamp: number; // Date.now() for stopwatch
  geofenceVerified: boolean;
  distanceMeters: number;
  ordersPlacedCount: number;
  totalOrderAmount: number;
  paymentsCollectedCount: number;
  totalPaymentAmount: number;
}

export interface CustomerVisit {
  id: string;
  customerId: string;
  customerName: string;
  routeBeat: string;
  checkInTime: string;
  checkOutTime: string;
  durationMinutes: number;
  purpose: VisitPurpose;
  outcome: VisitOutcome;
  orderId?: string;
  orderNumber?: string;
  orderAmount?: number;
  paymentId?: string;
  paymentAmount?: number;
  noOrderReason?: string;
  stockNotes?: string;
  generalNotes?: string;
  shelfPhotoVerified?: boolean;
  syncStatus: 'synced' | 'pending_sync';
  createdAt: string;
}

export interface DailyBeatStats {
  date: string;
  repName: string;
  dsrCode: string;
  distributorName: string;
  isPunchedIn: boolean;
  punchInTime?: string;
  punchOutTime?: string;
  plannedVisits: number; // TC - Total Calls Target
  completedVisits: number; // Calls executed
  productiveVisits: number; // PC - Productive Calls
  linesPerCallTarget: number;
  linesPerCallAchieved: number;
  totalSalesTarget: number;
  achievedSales: number;
  collectionTarget: number;
  achievedCollection: number;
  dailyIncentiveEarned: number; // Incentive earned today
  focusSKUsTarget: number;
  focusSKUsSold: number;
  newOutletsAdded: number;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'order' | 'payment' | 'visit' | 'customer';
  entityId: string;
  action: 'create' | 'update';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'conflict';
  errorMsg?: string;
}
