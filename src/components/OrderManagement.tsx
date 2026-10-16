import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Package,
  Printer,
  Share2,
  Clock,
  Sparkles,
  Gift,
  ArrowRight,
  Store,
  Warehouse,
  X,
  RefreshCw,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { Order, OrderStatus } from '../types/index.ts';

interface OrderManagementProps {
  onStartNewOrder: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ onStartNewOrder }) => {
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'retailer' | 'wholesaler'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setOrders(db.getOrders());
    });
    return unsubscribe;
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = typeFilter === 'all' || order.customerType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  // Aggregate metrics
  const totalGrossRevenue = orders.reduce((acc, o) => acc + o.grandTotal, 0);
  const totalSchemeSavings = orders.reduce((acc, o) => acc + o.schemeDiscount, 0);
  const totalFreeItems = orders.reduce(
    (acc, o) => acc + (o.freeItems?.reduce((fAcc, f) => fAcc + f.freeQuantity, 0) || 0),
    0
  );
  const pendingDispatchCount = orders.filter((o) => o.status === 'confirmed').length;

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = db.updateOrderStatus(orderId, nextStatus);
    if (updated && selectedOrder?.id === orderId) {
      setSelectedOrder(updated);
    }
  };

  const handlePrint = (order: Order) => {
    setPrintNotice(`Invoice #${order.orderNumber} formatted for 80mm thermal field printer.`);
    setTimeout(() => setPrintNotice(null), 3000);
  };

  const handleShare = (order: Order) => {
    setPrintNotice(`Order confirmation & scheme invoice summary copied for WhatsApp dispatch.`);
    setTimeout(() => setPrintNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Print / Share Notice */}
      {printNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex items-center justify-between">
          <span>{printNotice}</span>
          <button onClick={() => setPrintNotice(null)} className="text-blue-600 font-semibold hover:text-blue-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Aggregate KPI Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Orders Placed</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{orders.length}</span>
            <span className="text-xs text-blue-600 font-semibold">{pendingDispatchCount} pending dispatch</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Booked Value</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-slate-900">
              Rs. {totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Promotional Scheme Discounts</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-purple-700">
              Rs. {totalSchemeSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">BOGO Free Goods Dispatched</span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-emerald-700">{totalFreeItems} Cases/Units</span>
          </div>
        </div>
      </section>

      {/* Orders Filter & Table */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Order # or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Channels</option>
              <option value="retailer">Retailers</option>
              <option value="wholesaler">Wholesalers</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              {['all', 'confirmed', 'dispatched', 'delivered'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Office Visit / Depot Walk-in Counter Order Only */}
            <button
              onClick={onStartNewOrder}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              title="Office / Depot Walk-in Customer Counter Purchase Only"
            >
              <span>+ Office Visit Purchase</span>
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Order Details</th>
                <th className="py-3 px-4">Customer & Channel</th>
                <th className="py-3 px-4">Items & Schemes</th>
                <th className="py-3 px-4">Amount & Savings</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Sync Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isWholesale = order.customerType === 'wholesaler';
                  const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order Number & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.orderNumber}</div>
                        <div className="text-slate-400 mt-0.5">{order.date}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {isWholesale ? (
                            <Warehouse className="w-3.5 h-3.5 text-purple-700" />
                          ) : (
                            <Store className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                          <span>{order.customerName}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] capitalize">
                          {order.customerType} · {order.routeBeat}
                        </div>
                      </td>

                      {/* Items & Applied Schemes */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {order.items.length} product(s) · {totalItems} total units
                        </div>
                        {order.appliedSchemes && order.appliedSchemes.length > 0 && (
                          <div className="text-purple-700 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3" />
                            <span>{order.appliedSchemes.length} Scheme(s) Applied</span>
                          </div>
                        )}
                        {order.freeItems && order.freeItems.length > 0 && (
                          <div className="text-emerald-700 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                            <Gift className="w-3 h-3" />
                            <span>
                              +{order.freeItems.reduce((acc, f) => acc + f.freeQuantity, 0)} Free Goods
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          Rs. {order.grandTotal.toFixed(2)}
                        </div>
                        {order.schemeDiscount > 0 && (
                          <div className="text-purple-700 text-[11px]">
                            Saved: -Rs. {order.schemeDiscount.toFixed(2)}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">
                          {order.paymentStatus === 'paid' ? (
                            <span className="text-emerald-700 font-medium">Paid</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Payment Unsettled</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'dispatched'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Sync Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-medium flex items-center gap-1 ${
                            order.syncStatus === 'synced' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {order.syncStatus === 'synced' ? 'Synced' : 'Queued (Offline)'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
                        >
                          View Invoice
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  Field Sales Tax Invoice
                </span>
                <h3 className="text-lg font-bold">Invoice #{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Order Meta Header */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</h4>
                  <p className="capitalize">
                    Channel: {selectedOrder.customerType} · Beat: {selectedOrder.routeBeat}
                  </p>
                  <p>Order Date: {selectedOrder.date}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 block">Status:</span>
                  <span className="font-bold text-sm capitalize text-blue-700">{selectedOrder.status}</span>
                  <span className="text-slate-500 block mt-1">Payment:</span>
                  <span
                    className={`font-semibold capitalize ${
                      selectedOrder.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {selectedOrder.paymentStatus} (${selectedOrder.amountPaid} paid)
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h5 className="font-bold text-slate-900 mb-2">Billed Line Items:</h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Rate</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {it.productName}
                            <span className="block text-[11px] text-slate-400 font-mono">{it.productCode}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{it.unit}</td>
                          <td className="py-2 px-3">${it.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 font-semibold">{it.quantity}</td>
                          <td className="py-2 px-3 text-right font-bold">${it.totalGross.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Free Goods Section */}
              {selectedOrder.freeItems && selectedOrder.freeItems.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <h5 className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-emerald-600" /> Promotional Free Items Issued:
                  </h5>
                  <div className="space-y-1 pl-5">
                    {selectedOrder.freeItems.map((fi, i) => (
                      <div key={i} className="flex justify-between text-emerald-900">
                        <span>
                          {fi.freeQuantity}x {fi.productName} ({fi.schemeTitle})
                        </span>
                        <span className="font-bold text-emerald-700">100% Free ($0.00)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applied Schemes Section */}
              {selectedOrder.appliedSchemes && selectedOrder.appliedSchemes.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h5 className="font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Qualified Schemes Applied:
                  </h5>
                  <div className="space-y-1 pl-5">
                    {selectedOrder.appliedSchemes.map((sch, i) => (
                      <div key={i} className="flex justify-between text-purple-900">
                        <span>{sch.title}</span>
                        {sch.discountAmount > 0 && (
                          <span className="font-bold text-purple-700">-${sch.discountAmount.toFixed(2)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-medium">Rs. {selectedOrder.grossSubtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.schemeDiscount > 0 && (
                  <div className="flex justify-between text-purple-700 font-medium">
                    <span>Total Promotional Savings:</span>
                    <span>-Rs. {selectedOrder.schemeDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax (GST):</span>
                  <span className="font-medium">Rs. {selectedOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Net Payable Amount:</span>
                  <span className="text-blue-700 text-base">Rs. {selectedOrder.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                  <span className="font-bold block text-slate-800">Rep / Delivery Instructions:</span>
                  <p className="mt-0.5">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Footer with Workflow Action Controls */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => handleShare(selectedOrder)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp / Share</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'dispatched')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Order</span>
                  </button>
                )}
                {selectedOrder.status === 'dispatched' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark as Delivered</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
