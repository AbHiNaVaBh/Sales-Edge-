import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  FileText,
  CheckCircle2,
  Gift,
  Tag,
  Store,
  Warehouse,
  Clock,
  Check,
  Building,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { Order } from '../types/index.ts';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handlePrint = () => {
    setCopyFeedback(`Invoice #${order.orderNumber} sent to mobile thermal printer.`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = `*HUL SalesEdge Order Confirmation*\nInvoice: ${order.orderNumber}\nOutlet: ${order.customerName}\nDate: ${order.date}\nLines: ${order.items.length}\nGrand Total: Rs. ${order.grandTotal.toFixed(2)}\nStatus: ${order.status.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopyFeedback('Order summary copied to clipboard for WhatsApp sharing!');
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  const isWholesale = order.customerType === 'wholesaler';

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-bold block">
                Field Sales Order Details & Invoice Slip
              </span>
              <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{order.orderNumber}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                  {order.status}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy / Print Toast Notification */}
        {copyFeedback && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs font-semibold text-blue-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {copyFeedback}
            </span>
            <button onClick={() => setCopyFeedback(null)} className="text-blue-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Printable Invoice Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          
          {/* Customer & Order Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Billed Outlet:</span>
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                {isWholesale ? (
                  <Warehouse className="w-4 h-4 text-purple-700 inline" />
                ) : (
                  <Store className="w-4 h-4 text-blue-700 inline" />
                )}
                {order.customerName}
              </h4>
              <p className="text-slate-500 text-[11px]">
                Beat: <strong className="text-slate-700">{order.routeBeat}</strong> · Channel: <strong className="text-slate-700 capitalize">{order.customerType}</strong>
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Order Placed:</span>
              <span className="font-bold text-slate-900 block">{order.date}</span>
              <span
                className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Payment: {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Itemized Order Lines Table */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Billed SKU Items ({order.items.length} lines)
              </h5>
              <span className="text-[11px] text-purple-700 font-bold">
                LPC: {order.linesPerCall || order.items.length} Lines
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Rate (PTR)</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{it.productName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{it.productCode} · {it.brand}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{it.unit}</td>
                      <td className="py-2.5 px-3 font-medium">Rs. {it.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        Rs. {it.totalGross.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotional Free Goods (QPS) */}
          {order.freeItems && order.freeItems.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <Gift className="w-4 h-4 text-emerald-700" />
                <span>Promotional QPS Free Goods Included:</span>
              </div>
              <div className="space-y-1.5 pl-5">
                {order.freeItems.map((fi, i) => (
                  <div key={i} className="flex justify-between items-center text-xs text-emerald-950">
                    <div>
                      <span className="font-semibold">{fi.freeQuantity}x {fi.productName}</span>
                      <span className="text-emerald-700 text-[11px] block">{fi.schemeTitle}</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      100% FREE (Rs. 0.00)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applied Trade Schemes Breakdown */}
          {order.appliedSchemes && order.appliedSchemes.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                <Tag className="w-4 h-4 text-purple-700" />
                <span>Trade Scheme Discounts Applied:</span>
              </div>
              <div className="space-y-1 pl-5">
                {order.appliedSchemes.map((sch, i) => (
                  <div key={i} className="flex justify-between text-xs text-purple-950">
                    <span>{sch.title}</span>
                    {sch.discountAmount > 0 ? (
                      <span className="font-bold text-purple-700">
                        -Rs. {sch.discountAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700">Free Product</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Financial Totals */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Gross Order Subtotal:</span>
              <span className="font-semibold text-slate-900">Rs. {order.grossSubtotal.toFixed(2)}</span>
            </div>
            {order.schemeDiscount > 0 && (
              <div className="flex justify-between text-purple-700 font-bold">
                <span>Total Trade Scheme Savings:</span>
                <span>-Rs. {order.schemeDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST / Indirect Tax Breakdown (18%):</span>
              <span className="font-semibold text-slate-900">Rs. {order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Net Payable Amount:</span>
              <span className="text-blue-700 text-lg">Rs. {order.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Instructions or Signature */}
          {order.notes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-0.5">
              <span className="font-bold text-amber-900 block">Van Delivery Instructions:</span>
              <p className="text-amber-800">{order.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified & Sealed per HUL SalesEdge Protocol
            </span>
            <span className="font-mono">Sync: {order.syncStatus.toUpperCase()}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
