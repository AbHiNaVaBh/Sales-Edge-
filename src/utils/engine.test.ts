import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProductUnitPrice,
  calculateCartGross,
  calculateOrderDetails,
} from './schemeEngine.ts';
import {
  autoAllocatePayment,
  calculateAgingBuckets,
  calculateUpdatedOutstanding,
} from './paymentUtils.ts';
import {
  createSyncQueueItem,
  packageSecurePayload,
  detectSyncConflicts,
} from './syncEngine.ts';
import type { Customer, Order, Product, Scheme } from '../types/index.ts';

const mockProductA: Product = {
  id: 'prod_1',
  code: 'HUL-HC-001',
  name: 'Surf Excel Easy Wash Detergent 1kg',
  brand: 'Surf Excel',
  category: 'Home Care',
  unit: 'Master Shipper (24x1kg)',
  mrp: 145,
  retailPrice: 124,
  wholesalePrice: 115,
  stockQuantity: 480,
  minOrderRetail: 1,
  minOrderWholesale: 4,
  taxRate: 0.18,
  packDescription: '1kg pack with stain removal enzymes',
  marginPct: 14.5,
};

const mockProductB: Product = {
  id: 'prod_2',
  code: 'HUL-BPC-101',
  name: 'Dove Intense Repair Shampoo 340ml',
  brand: 'Dove',
  category: 'Beauty & Personal Care',
  unit: 'Shipper Case of 16',
  mrp: 340,
  retailPrice: 289,
  wholesalePrice: 268,
  stockQuantity: 280,
  minOrderRetail: 1,
  minOrderWholesale: 3,
  taxRate: 0.18,
  packDescription: 'Keratin actives for damaged hair repair',
  marginPct: 15.0,
};

const mockRetailer: Customer = {
  id: 'cust_retail_1',
  name: 'Shree Balaji Super Kirana',
  ownerName: 'Sunita Verma',
  type: 'retailer',
  tier: 'A',
  hulClubTier: 'Diamond Club',
  phone: '+91 98765 43210',
  email: 'balaji.kirana@gmail.com',
  address: 'Shop 14, MG Road Promenade',
  routeBeat: 'Thursday: MG Road & Central Market',
  pjpDay: 'Thursday',
  gstin: '07AAAAA0000A1Z5',
  creditLimit: 5000,
  outstandingBalance: 1000,
  paymentTermsDays: 14,
  visitStatus: 'pending',
  lastVisitDate: '2026-10-10',
  geofenceDistanceMeters: 25,
  perfectStoreScore: 94,
};

const mockWholesaler: Customer = {
  id: 'cust_whole_1',
  name: 'Sadar Mandi Wholesale Traders',
  ownerName: 'Rajesh Gupta',
  type: 'wholesaler',
  tier: 'A',
  hulClubTier: 'Wholesale Mandi',
  phone: '+91 98111 22334',
  email: 'rajesh.sadar@mandi.in',
  address: 'Shop 42, Ganj Wholesale Complex',
  routeBeat: 'Thursday: Sadar Wholesale Mandi',
  pjpDay: 'Thursday',
  gstin: '07BBBBB1111B2Z6',
  creditLimit: 50000,
  outstandingBalance: 8000,
  paymentTermsDays: 21,
  visitStatus: 'pending',
  lastVisitDate: '2026-10-12',
  geofenceDistanceMeters: 18,
  perfectStoreScore: 90,
};

const mockSchemes: Scheme[] = [
  {
    id: 'sch_qps',
    code: 'QPS-SURF-08',
    title: 'Surf Excel QPS: Buy 8 Shippers, Get 1 Free',
    description: 'QPS trade promotion for Surf Excel',
    type: 'buy_x_get_y',
    applicableTo: 'both',
    badge: 'Buy 8 Get 1 Free',
    validUntil: '2026-12-31',
    targetProductId: 'prod_1',
    buyQuantity: 8,
    freeProductId: 'prod_1',
    freeProductName: 'Surf Excel Easy Wash Detergent 1kg',
    freeQuantity: 1,
    active: true,
  },
  {
    id: 'sch_wholesale_slab',
    code: 'WHOLE-MANDI-7',
    title: 'Wholesale Mandi Slab: 7% Off on ₹10,000+ orders',
    description: 'Special wholesale volume discount',
    type: 'slab_discount',
    applicableTo: 'wholesaler',
    badge: '7% Wholesale Slab',
    validUntil: '2026-12-31',
    minOrderValue: 10000,
    discountPercentage: 7,
    active: true,
  },
  {
    id: 'sch_instant_cash',
    code: 'CD-SPOT-1.5',
    title: 'Cash Discount (CD): 1.5% Spot Rebate',
    description: '1.5% off when settling at the time of delivery',
    type: 'instant_cash_scheme',
    applicableTo: 'both',
    badge: '1.5% Spot CD Rebate',
    validUntil: '2026-12-31',
    discountPercentage: 1.5,
    active: true,
  },
];

test('pricing differentiates between retailer and wholesaler', () => {
  assert.equal(getProductUnitPrice(mockProductA, 'retailer'), 124);
  assert.equal(getProductUnitPrice(mockProductA, 'wholesaler'), 115);

  const cart = [{ product: mockProductA, quantity: 2 }];
  assert.equal(calculateCartGross(cart, 'retailer'), 248);
  assert.equal(calculateCartGross(cart, 'wholesaler'), 230);
});

test('buy_x_get_y scheme awards free items correctly', () => {
  const cart = [{ product: mockProductA, quantity: 16 }]; // 16 / 8 = 2 free items
  const result = calculateOrderDetails(cart, mockRetailer, mockSchemes, false);

  assert.equal(result.freeItems.length, 1);
  assert.equal(result.freeItems[0].freeQuantity, 2);
  assert.equal(result.freeItems[0].productName, 'Surf Excel Easy Wash Detergent 1kg');
});

test('wholesaler slab discount applies only when min threshold met', () => {
  // 50 units at ₹115 wholesale = ₹5,750 (under ₹10,000, no slab)
  const cartSmall = [{ product: mockProductA, quantity: 50 }];
  const resSmall = calculateOrderDetails(cartSmall, mockWholesaler, mockSchemes, false);
  assert.equal(resSmall.totalSchemeDiscount, 0);

  // 100 units at ₹115 wholesale = ₹11,500 (over ₹10,000, 7% discount = ₹805)
  const cartLarge = [{ product: mockProductA, quantity: 100 }];
  const resLarge = calculateOrderDetails(cartLarge, mockWholesaler, mockSchemes, false);
  assert.equal(resLarge.grossSubtotal, 11500);
  assert.equal(resLarge.totalSchemeDiscount, 805);
  assert.equal(resLarge.netAfterDiscounts, 10695);
  assert.equal(resLarge.grandTotal, 11229.75);
});

test('retailer is excluded from wholesale-only schemes', () => {
  const cart = [{ product: mockProductA, quantity: 100 }];
  const res = calculateOrderDetails(cart, mockRetailer, mockSchemes, false);
  const wholesaleSchemeFound = res.appliedSchemes.some((s) => s.schemeId === 'sch_wholesale_slab');
  assert.equal(wholesaleSchemeFound, false);
});

test('credit limit deficit triggers when order exceeds limit', () => {
  const cart = [{ product: mockProductA, quantity: 100 }]; // ₹12,400 + tax > credit limit ₹5,000
  const res = calculateOrderDetails(cart, mockRetailer, mockSchemes, false);
  assert.equal(res.isCreditExceeded, true);
  assert.ok(res.creditDeficit > 0);
});

test('payment auto-allocation allocates FIFO across unpaid orders', () => {
  const orders: Order[] = [
    {
      id: 'ord_1',
      orderNumber: 'HUL-ORD-101',
      customerId: 'cust_1',
      customerName: 'Test Store',
      customerType: 'retailer',
      routeBeat: 'MG Road',
      date: '2026-10-01',
      status: 'delivered',
      items: [],
      grossSubtotal: 2000,
      schemeDiscount: 0,
      appliedSchemes: [],
      freeItems: [],
      taxAmount: 100,
      grandTotal: 2100,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      linesPerCall: 2,
      syncStatus: 'synced',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'ord_2',
      orderNumber: 'HUL-ORD-102',
      customerId: 'cust_1',
      customerName: 'Test Store',
      customerType: 'retailer',
      routeBeat: 'MG Road',
      date: '2026-10-05',
      status: 'delivered',
      items: [],
      grossSubtotal: 3000,
      schemeDiscount: 0,
      appliedSchemes: [],
      freeItems: [],
      taxAmount: 150,
      grandTotal: 3150,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      linesPerCall: 3,
      syncStatus: 'synced',
      createdAt: '2026-10-05T10:00:00Z',
    },
  ];

  const result = autoAllocatePayment(3000, orders, 'cust_1');
  assert.equal(result.allocations.length, 2);
  assert.equal(result.allocations[0].orderId, 'ord_1');
  assert.equal(result.allocations[0].allocatedAmount, 2100); // fills ord_1
  assert.equal(result.allocations[1].orderId, 'ord_2');
  assert.equal(result.allocations[1].allocatedAmount, 900); // remaining 900 goes to ord_2
  assert.equal(result.remainingAdvance, 0);

  const updatedOutstanding = calculateUpdatedOutstanding(
    { ...mockRetailer, outstandingBalance: 5250 },
    3000
  );
  assert.equal(updatedOutstanding, 2250);
});

test('sync engine packages payload with checksum and detects conflicts', () => {
  const item = createSyncQueueItem('order', 'ord_test_99', 'create', { total: 450 });
  assert.equal(item.status, 'pending');
  assert.equal(item.entityType, 'order');

  const packaged = packageSecurePayload([item]);
  assert.equal(packaged.count, 1);
  assert.ok(packaged.checksum.startsWith('SHA256-'));
  assert.ok(packaged.encryptedSimulation.startsWith('AES-256-GCM::'));

  const serverTimestamps = {
    ord_test_99: item.timestamp + 10000,
  };
  assert.equal(detectSyncConflicts(item, serverTimestamps), true);
});
