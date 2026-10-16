/**
 * Pure calculation logic for payment allocations, outstanding invoice aging, and collections.
 */
import type { Customer, Order, PaymentInvoiceAllocation } from '../types/index.ts';

export interface AgingBuckets {
  current: number; // 0 - 15 days
  thirtyDays: number; // 16 - 30 days
  overdue: number; // 31+ days
  totalOutstanding: number;
}

export function calculateAgingBuckets(orders: Order[], customerId: string, referenceDate: Date = new Date()): AgingBuckets {
  const customerOrders = orders.filter(
    (o) => o.customerId === customerId && o.paymentStatus !== 'paid' && o.status !== 'cancelled'
  );

  let current = 0;
  let thirtyDays = 0;
  let overdue = 0;

  for (const order of customerOrders) {
    const remainingUnpaid = Math.max(0, order.grandTotal - (order.amountPaid || 0));
    if (remainingUnpaid <= 0) continue;

    const orderDate = new Date(order.date);
    const diffTime = Math.abs(referenceDate.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 15) {
      current += remainingUnpaid;
    } else if (diffDays <= 30) {
      thirtyDays += remainingUnpaid;
    } else {
      overdue += remainingUnpaid;
    }
  }

  const totalOutstanding = Math.round((current + thirtyDays + overdue) * 100) / 100;
  return {
    current: Math.round(current * 100) / 100,
    thirtyDays: Math.round(thirtyDays * 100) / 100,
    overdue: Math.round(overdue * 100) / 100,
    totalOutstanding,
  };
}

/**
 * Automatically allocates a collected payment amount against unpaid customer orders FIFO (Oldest first)
 */
export function autoAllocatePayment(
  paymentAmount: number,
  orders: Order[],
  customerId: string
): {
  allocations: PaymentInvoiceAllocation[];
  remainingAdvance: number;
} {
  const unpaidOrders = orders
    .filter((o) => o.customerId === customerId && o.paymentStatus !== 'paid' && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let balanceToAllocate = paymentAmount;
  const allocations: PaymentInvoiceAllocation[] = [];

  for (const order of unpaidOrders) {
    if (balanceToAllocate <= 0) break;
    const unpaidAmount = Math.round((order.grandTotal - (order.amountPaid || 0)) * 100) / 100;
    if (unpaidAmount <= 0) continue;

    const allocation = Math.min(balanceToAllocate, unpaidAmount);
    allocations.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      allocatedAmount: Math.round(allocation * 100) / 100,
    });

    balanceToAllocate = Math.round((balanceToAllocate - allocation) * 100) / 100;
  }

  return {
    allocations,
    remainingAdvance: Math.max(0, balanceToAllocate),
  };
}

/**
 * Calculates updated outstanding balance after payment collection
 */
export function calculateUpdatedOutstanding(customer: Customer, paymentAmount: number): number {
  return Math.max(0, Math.round((customer.outstandingBalance - paymentAmount) * 100) / 100);
}
