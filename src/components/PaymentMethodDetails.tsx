import React, { useState, useEffect } from 'react';
import {
  Coins,
  CreditCard,
  Building,
  CheckCircle2,
  Copy,
  Check,
  Camera,
  AlertTriangle,
  Zap,
  Sparkles,
  Calendar,
  FileCheck,
  ShieldCheck,
  Info,
  Smartphone,
} from 'lucide-react';
import type { PaymentMode } from '../types/index.ts';

interface DenominationCounts {
  n500: number;
  n200: number;
  n100: number;
  n50: number;
  n20: number;
  n10: number;
  coins: number;
}

interface PaymentMethodDetailsProps {
  mode: PaymentMode;
  amount: number;
  customerName: string;
  referenceNumber: string;
  onReferenceChange: (ref: string) => void;
  chequeNumber?: string;
  onChequeNumberChange?: (val: string) => void;
  bankName?: string;
  onBankNameChange?: (val: string) => void;
  onDenominationsChange?: (denominations: string) => void;
}

const COMMON_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
];

// Official Distributor Bank Details for NEFT / IMPS / RTGS
const DISTRIBUTOR_BANK = {
  beneficiaryName: 'Hindustan Unilever Limited - Balaji FMCG Distribution',
  shortBeneficiaryName: 'HUL - Balaji FMCG Distribution',
  accountNumber: '50200084920194',
  ifscCode: 'HDFC0000104',
  accountType: 'Current Account (CA)',
  bankName: 'HDFC Bank Ltd',
  branch: 'Connaught Place Corporate Branch, New Delhi - 110001',
  vanCode: 'HULDIST982441029',
};

export const PaymentMethodDetails: React.FC<PaymentMethodDetailsProps> = ({
  mode,
  amount,
  customerName,
  referenceNumber,
  onReferenceChange,
  chequeNumber = '',
  onChequeNumberChange,
  bankName = '',
  onBankNameChange,
  onDenominationsChange,
}) => {
  // Cash Denominations
  const [denominations, setDenominations] = useState<DenominationCounts>({
    n500: 0,
    n200: 0,
    n100: 0,
    n50: 0,
    n20: 0,
    n10: 0,
    coins: 0,
  });

  // Cheque state
  const [chequeDate, setChequeDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [chequePhotoCaptured, setChequePhotoCaptured] = useState<boolean>(false);

  // Bank Transfer state
  const [transferType, setTransferType] = useState<'IMPS' | 'NEFT' | 'RTGS'>('IMPS');
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [copiedIfsc, setCopiedIfsc] = useState<boolean>(false);
  const [copiedName, setCopiedName] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedBranch, setCopiedBranch] = useState<boolean>(false);
  const [isUtrVerified, setIsUtrVerified] = useState<boolean>(Boolean(referenceNumber));

  // Calculate total cash from denominations
  const totalDenominationAmount =
    denominations.n500 * 500 +
    denominations.n200 * 200 +
    denominations.n100 * 100 +
    denominations.n50 * 50 +
    denominations.n20 * 20 +
    denominations.n10 * 10 +
    denominations.coins;

  const denominationDiff = amount - totalDenominationAmount;

  // Manual auto-fill click only
  const handleAutoFillCash = () => {
    let rem = Math.floor(amount);
    const n500 = Math.floor(rem / 500);
    rem %= 500;
    const n200 = Math.floor(rem / 200);
    rem %= 200;
    const n100 = Math.floor(rem / 100);
    rem %= 100;
    const n50 = Math.floor(rem / 50);
    rem %= 50;
    const n20 = Math.floor(rem / 20);
    rem %= 20;
    const n10 = Math.floor(rem / 10);
    rem %= 10;
    const coins = rem + Math.round((amount - Math.floor(amount)));

    const newCounts = { n500, n200, n100, n50, n20, n10, coins };
    setDenominations(newCounts);
    notifyDenominations(newCounts);
  };

  const handleResetCash = () => {
    const zeroCounts = { n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 };
    setDenominations(zeroCounts);
    notifyDenominations(zeroCounts);
  };

  const updateCount = (key: keyof DenominationCounts, delta: number) => {
    setDenominations((prev) => {
      const updated = { ...prev, [key]: Math.max(0, prev[key] + delta) };
      notifyDenominations(updated);
      return updated;
    });
  };

  const setCountDirect = (key: keyof DenominationCounts, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDenominations((prev) => {
      const updated = { ...prev, [key]: num };
      notifyDenominations(updated);
      return updated;
    });
  };

  const notifyDenominations = (counts: DenominationCounts) => {
    if (!onDenominationsChange) return;
    const str = `500x${counts.n500}, 200x${counts.n200}, 100x${counts.n100}, 50x${counts.n50}, 20x${counts.n20}, 10x${counts.n10}, Coins:${counts.coins}`;
    onDenominationsChange(str);
  };

  // Convert amount to words for Cheque preview
  const formatAmountWords = (num: number) => {
    if (!num || num <= 0) return 'Zero Rupees Only';
    return `Rupees ${num.toLocaleString('en-IN')} Only`;
  };

  // Simulate UTR verification
  const handleSimulateUtrVerification = () => {
    const mockUtr = `${transferType}${Date.now().toString().slice(-8)}`;
    onReferenceChange(mockUtr);
    setIsUtrVerified(true);
  };

  // Copy full bank details formatted for WhatsApp / banking app
  const handleCopyFullBankDetails = () => {
    const text = `*DISTRIBUTOR BANK DETAILS FOR ${transferType}*
Beneficiary: ${DISTRIBUTOR_BANK.beneficiaryName}
A/C No: ${DISTRIBUTOR_BANK.accountNumber}
Bank: ${DISTRIBUTOR_BANK.bankName}
Branch: ${DISTRIBUTOR_BANK.branch}
IFSC: ${DISTRIBUTOR_BANK.ifscCode}
A/C Type: ${DISTRIBUTOR_BANK.accountType}
VAN: ${DISTRIBUTOR_BANK.vanCode}
Amount: Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
Outlet: ${customerName}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Ensure cash mode has clean reference number
  useEffect(() => {
    if (mode === 'cash') {
      const isInvalidCashRef =
        !referenceNumber ||
        referenceNumber.startsWith('IMPS') ||
        referenceNumber.startsWith('NEFT') ||
        referenceNumber.startsWith('RTGS') ||
        referenceNumber.startsWith('UPI');
      if (isInvalidCashRef) {
        onReferenceChange(`CSH-${Date.now().toString().slice(-6)}`);
      }
    }
  }, [mode, referenceNumber]);

  // ----------------------------------------------------
  // CASH COLLECTION SECTION (Compact & Fast)
  // ----------------------------------------------------
  if (mode === 'cash') {
    return (
      <div className="space-y-2.5 animate-in fade-in duration-150">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50/70 p-3 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">₹</span>
              <span className="font-bold text-emerald-950">Cash Denomination Counter</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoFillCash}
                className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 rounded-md shadow-2xs transition-colors flex items-center gap-1"
                title="Click to automatically count amount"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Auto Counter (Rs. {amount.toLocaleString()})</span>
              </button>
              {totalDenominationAmount > 0 && (
                <button
                  type="button"
                  onClick={handleResetCash}
                  className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-300"
                  title="Reset note counts to zero"
                >
                  Clear (0)
                </button>
              )}
            </div>
          </div>

          {/* Denominations Grid (Spacious 2-column cards so text never wraps or squishes) */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {[
              { key: 'n500', note: '₹500 Note', mult: 500 },
              { key: 'n200', note: '₹200 Note', mult: 200 },
              { key: 'n100', note: '₹100 Note', mult: 100 },
              { key: 'n50', note: '₹50 Note', mult: 50 },
              { key: 'n20', note: '₹20 Note', mult: 20 },
              { key: 'n10', note: '₹10 Note', mult: 10 },
            ].map(({ key, note, mult }) => {
              const count = denominations[key as keyof DenominationCounts];
              const subtotal = count * mult;
              return (
                <div
                  key={key}
                  className="bg-white px-2.5 py-2 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <span className="font-extrabold text-slate-800 text-xs block whitespace-nowrap">{note}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 whitespace-nowrap block mt-0.5">
                      Rs. {subtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCount(key as keyof DenominationCounts, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs transition-colors"
                      aria-label={`Decrease ${note}`}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => setCountDirect(key as keyof DenominationCounts, e.target.value)}
                      className="w-10 text-center text-xs font-bold py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateCount(key as keyof DenominationCounts, 1)}
                      className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 font-bold text-emerald-900 flex items-center justify-center text-xs transition-colors"
                      aria-label={`Increase ${note}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Coins spanning full width of 2 columns */}
            <div className="col-span-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 text-xs whitespace-nowrap">Coins (Total)</span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 whitespace-nowrap">
                  = Rs. {denominations.coins.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateCount('coins', -1)}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs transition-colors"
                  aria-label="Decrease coins"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={denominations.coins === 0 ? '' : denominations.coins}
                  placeholder="0"
                  onChange={(e) => setCountDirect('coins', e.target.value)}
                  className="w-14 text-center text-xs font-bold py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateCount('coins', 1)}
                  className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 font-bold text-emerald-900 flex items-center justify-center text-xs transition-colors"
                  aria-label="Increase coins"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Compact Tally Bar */}
          <div className="mt-2 py-1.5 px-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium">Counted:</span>
              <span className="font-extrabold text-slate-900 ml-1">
                Rs. {totalDenominationAmount.toLocaleString()}
              </span>
            </div>

            <div>
              {totalDenominationAmount === amount ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Exact Match (Rs. {amount.toLocaleString()})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>
                    Diff: Rs. {Math.abs(denominationDiff).toLocaleString()}{' '}
                    {denominationDiff > 0 ? 'Remaining' : 'Excess'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cash Voucher Reference */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
            Cash Collection Voucher / Receipt No.
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="e.g. CSH-849201"
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHEQUE COLLECTION SECTION (Compact & Clean)
  // ----------------------------------------------------
  if (mode === 'cheque') {
    return (
      <div className="space-y-2.5 animate-in fade-in duration-150">
        {/* Compact Cheque Leaf */}
        <div className="bg-gradient-to-b from-sky-50 via-white to-blue-50/40 rounded-xl border-2 border-sky-300 p-3 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-sky-200 gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <Building className="w-4 h-4 text-sky-700 shrink-0" />
              <select
                value={bankName}
                onChange={(e) => onBankNameChange && onBankNameChange(e.target.value)}
                className="font-bold text-sky-950 text-xs bg-white border border-sky-300 rounded-md px-2 py-0.5 w-full max-w-xs"
              >
                <option value="">-- Drawee Bank * --</option>
                {COMMON_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold text-sky-800">Date:</span>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="text-xs font-mono font-bold px-1.5 py-0.5 bg-white border border-sky-300 rounded text-slate-800"
              />
            </div>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px]">
            <div className="flex items-baseline justify-between gap-1 border-b border-sky-100 pb-1">
              <span className="text-slate-500 font-semibold">Pay:</span>
              <span className="font-bold text-slate-800 truncate">Hindustan Unilever Limited / Distributor</span>
              <span className="text-[10px] text-sky-700 italic">or Bearer</span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-1">
              <span className="text-slate-500 font-semibold shrink-0">Amount:</span>
              <span className="font-serif italic text-slate-700 text-xs truncate flex-1">
                {formatAmountWords(amount)}
              </span>
              <span className="bg-sky-100 border border-sky-400 px-2 py-0.5 rounded font-bold text-sky-950 font-mono text-xs shrink-0">
                ₹ {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} /-
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Drawer: <strong className="text-slate-800">{customerName}</strong></span>
              <span className="font-serif italic text-sky-900 font-bold">✓ Signed on Leaf</span>
            </div>
          </div>

          {/* MICR Band */}
          <div className="mt-2 pt-1 border-t border-sky-200 bg-sky-950 text-sky-300 -mx-3 -mb-3 p-1.5 flex items-center justify-center gap-3 text-[11px] font-mono tracking-wider rounded-b-lg">
            <span>⑈ {chequeNumber || '000000'} ⑈</span>
            <span className="text-slate-400">110229048⑆</span>
            <span className="text-slate-400">000124⑈ 29</span>
          </div>
        </div>

        {/* Cheque Fields */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
              6-Digit Cheque Number *
            </label>
            <input
              type="text"
              maxLength={6}
              required
              value={chequeNumber}
              onChange={(e) => onChequeNumberChange && onChequeNumberChange(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 004812"
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
              Cheque Photo Proof
            </label>
            <button
              type="button"
              onClick={() => setChequePhotoCaptured(!chequePhotoCaptured)}
              className={`w-full p-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-colors text-xs ${
                chequePhotoCaptured
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              <span>{chequePhotoCaptured ? '✓ Photo Attached' : 'Capture Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // BANK / NEFT / IMPS / RTGS (Compact & Clean)
  // ----------------------------------------------------
  if (mode === 'bank_transfer') {
    return (
      <div className="space-y-2.5 animate-in fade-in duration-150">
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-xl p-3 shadow-md border border-indigo-500/40 text-xs">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-indigo-800/80">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-300" />
              <span>NEFT / IMPS / RTGS Bank Details</span>
            </span>

            <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-[11px]">
              {(['IMPS', 'NEFT', 'RTGS'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransferType(t)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    transferType === t ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Copy all button */}
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-indigo-200">
              {transferType === 'IMPS' && '⚡ IMPS: Instant 24x7 credit (Up to ₹5L)'}
              {transferType === 'NEFT' && '🏛️ NEFT: 24x7 batch settlement (No limit)'}
              {transferType === 'RTGS' && '🚀 RTGS: Instant settlement (≥ ₹2L)'}
            </span>
            <button
              type="button"
              onClick={handleCopyFullBankDetails}
              className="px-2 py-0.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-amber-300 font-bold rounded border border-amber-400/40 transition-colors flex items-center gap-1"
            >
              {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAll ? 'Copied All!' : 'Copy All'}</span>
            </button>
          </div>

          {/* 2-Column Grid */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            {/* Beneficiary Name */}
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[9px] text-indigo-300 uppercase block font-semibold">Beneficiary Name</span>
                <span className="font-bold text-white truncate block">HUL - Balaji FMCG</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(DISTRIBUTOR_BANK.beneficiaryName);
                  setCopiedName(true);
                  setTimeout(() => setCopiedName(false), 2000);
                }}
                className="p-1 bg-white/10 hover:bg-white/20 rounded text-indigo-200"
              >
                {copiedName ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Account Number */}
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-indigo-300 uppercase block font-semibold">Account Number</span>
                <span className="font-mono font-extrabold text-amber-300 text-xs tracking-wider">50200084920194</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(DISTRIBUTOR_BANK.accountNumber);
                  setCopiedAccount(true);
                  setTimeout(() => setCopiedAccount(false), 2000);
                }}
                className="p-1 bg-white/10 hover:bg-white/20 rounded text-indigo-200"
              >
                {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* IFSC Code */}
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-indigo-300 uppercase block font-semibold">IFSC Code</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs tracking-wider">HDFC0000104</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(DISTRIBUTOR_BANK.ifscCode);
                  setCopiedIfsc(true);
                  setTimeout(() => setCopiedIfsc(false), 2000);
                }}
                className="p-1 bg-white/10 hover:bg-white/20 rounded text-indigo-200"
              >
                {copiedIfsc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Account Type */}
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-indigo-300 uppercase block font-semibold">Account Type</span>
                <span className="font-bold text-white text-xs">Current (CA)</span>
              </div>
              <span className="font-mono text-[9px] text-indigo-300 bg-white/10 px-1 py-0.5 rounded">HDFC Bank</span>
            </div>
          </div>
        </div>

        {/* UTR Reference Input */}
        <div>
          <div className="flex items-center justify-between mb-0.5 text-xs">
            <label className="font-bold text-slate-800 text-[11px]">
              Bank UTR / Transaction Reference Number *
            </label>
            <button
              type="button"
              onClick={handleSimulateUtrVerification}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-0.5"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Simulate Credit</span>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              value={referenceNumber}
              onChange={(e) => {
                onReferenceChange(e.target.value);
                setIsUtrVerified(e.target.value.length >= 8);
              }}
              placeholder="e.g. IMPS20261016849201"
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:bg-white"
            />
            {isUtrVerified && (
              <span className="absolute right-2.5 top-2 text-emerald-600 font-bold flex items-center gap-0.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
