import React from 'react';
import {
  Sparkles,
  Percent,
  Check,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface PaymentAutoFillSelectorProps {
  outstandingBalance: number;
  creditLimit: number;
  currentAmount: number;
  onSelectAmount: (amount: number) => void;
  overdueAmount?: number;
}

export const PaymentAutoFillSelector: React.FC<PaymentAutoFillSelectorProps> = ({
  outstandingBalance,
  creditLimit,
  currentAmount,
  onSelectAmount,
  overdueAmount = 0,
}) => {
  if (outstandingBalance <= 0) {
    return (
      <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-semibold">Outlet has zero outstanding balance. All invoices settled!</span>
      </div>
    );
  }

  // Pre-calculated amounts
  const fullAmount = outstandingBalance;
  const seventyFivePct = Math.round(outstandingBalance * 0.75 * 100) / 100;
  const halfAmount = Math.round(outstandingBalance * 0.5 * 100) / 100;
  const twentyFivePct = Math.round(outstandingBalance * 0.25 * 100) / 100;

  // Round figure calculation (e.g. nearest 1000 or 500)
  const roundBase = outstandingBalance >= 5000 ? 1000 : 500;
  const roundAmount = Math.max(roundBase, Math.round(outstandingBalance / roundBase) * roundBase);

  // Determine current active preset
  const isFull = Math.abs(currentAmount - fullAmount) < 0.01;
  const is75 = Math.abs(currentAmount - seventyFivePct) < 0.01;
  const isHalf = Math.abs(currentAmount - halfAmount) < 0.01;
  const is25 = Math.abs(currentAmount - twentyFivePct) < 0.01;
  const isRound = roundAmount !== fullAmount && Math.abs(currentAmount - roundAmount) < 0.01;
  const isOverdue = overdueAmount > 0 && Math.abs(currentAmount - overdueAmount) < 0.01;

  // Quick preset pills
  const presets = [
    { label: 'Full (100%)', amount: fullAmount, active: isFull, highlight: true },
    { label: '75%', amount: seventyFivePct, active: is75 },
    { label: 'Half (50%)', amount: halfAmount, active: isHalf },
    { label: '25%', amount: twentyFivePct, active: is25 },
    ...(roundAmount !== fullAmount ? [{ label: `Round`, amount: roundAmount, active: isRound }] : []),
    ...(overdueAmount > 0 && overdueAmount !== fullAmount ? [{ label: `Overdue`, amount: overdueAmount, active: isOverdue, danger: true }] : []),
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Percent className="w-3 h-3 text-emerald-600" />
          <span>Quick Auto-Fill Presets</span>
        </span>
        <span className="text-[11px] text-slate-500">
          Due: <strong className="text-slate-800 font-mono">Rs. {outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </span>
      </div>

      {/* Compact Preset Pills Row */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 text-xs">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onSelectAmount(p.amount)}
            className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
              p.active
                ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                : p.highlight
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-semibold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium'
            }`}
          >
            <span className="text-[10px] leading-tight opacity-90 truncate max-w-full">{p.label}</span>
            <span className="text-[11px] font-mono font-bold leading-tight">Rs. {p.amount.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
