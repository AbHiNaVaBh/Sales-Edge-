import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface UPIPaymentQRCodeProps {
  amount: number;
  customerName: string;
  payeeVpa?: string;
  payeeName?: string;
  onPaymentVerified?: (utrNumber: string) => void;
  isPaid?: boolean;
}

export const UPIPaymentQRCode: React.FC<UPIPaymentQRCodeProps> = ({
  amount,
  customerName,
  payeeVpa = 'hul.balaji.distributor@icici',
  payeeName = 'Shree Balaji Consumer Agencies (HUL RS)',
  onPaymentVerified,
  isPaid = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedUtr, setVerifiedUtr] = useState<string | null>(null);

  // Generate UPI URI formatted per NPCI UPI Deep Link specifications
  const sanitizedAmount = amount > 0 ? amount.toFixed(2) : '1.00';
  const txnNote = encodeURIComponent(`HUL Goods Bill ${customerName.slice(0, 15)}`);
  const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(
    payeeName
  )}&am=${sanitizedAmount}&cu=INR&tn=${txnNote}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      upiUri,
      {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && isMounted) {
          setQrDataUrl(url);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(payeeVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePaymentReceived = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const generatedUtr = `UPI${Date.now().toString().slice(-8)}${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      setIsVerifying(false);
      setVerifiedUtr(generatedUtr);
      if (onPaymentVerified) {
        onPaymentVerified(generatedUtr);
      }
    }, 700);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">Dynamic UPI Payment QR</h4>
            <p className="text-[10px] text-slate-400">Scan via GPay, PhonePe, Paytm or BHIM</p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
          Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* QR Code Presentation Box */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative bg-white p-3 rounded-2xl shadow-md border-4 border-emerald-500/80">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`UPI QR code for Rs. ${amount} to ${payeeName}`}
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          )}

          {/* NPCI Verified Badge inside QR Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white px-2 py-0.5 rounded-full shadow-md border border-slate-200 flex items-center gap-1 text-[9px] font-bold text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>UPI BHIM</span>
            </div>
          </div>
        </div>

        {/* Amount & Outlet caption */}
        <div className="text-center mt-3">
          <span className="text-xs text-slate-400 block">Collect from outlet</span>
          <span className="text-sm font-bold text-white">{customerName}</span>
        </div>

        {/* Accepted Payment Apps logos indicator */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-blue-300">GPay</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-purple-300">PhonePe</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-sky-300">Paytm</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-emerald-300">BHIM UPI</span>
        </div>
      </div>

      {/* Payee VPA Details with Copy Option */}
      <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block font-medium">HUL Distributor VPA:</span>
          <span className="font-mono text-emerald-300 text-xs font-semibold">{payeeVpa}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyUPI}
          className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Copy UPI VPA"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Payment Status or Interactive Simulation Trigger */}
      {(verifiedUtr || isPaid) ? (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-emerald-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-emerald-300 block">UPI Payment Confirmed!</span>
            <span className="font-mono text-[11px] text-emerald-200 block">
              UTR: {verifiedUtr || 'UPI-984210928374'}
            </span>
            <span className="text-[10px] text-emerald-400">
              Verified by Distributor Bank Webhook · Zero transaction fee
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Awaiting retailer UPI authorization...
            </span>
            <span className="text-amber-400 font-mono">Dynamic QR Active</span>
          </div>

          <button
            type="button"
            onClick={handleSimulatePaymentReceived}
            disabled={isVerifying || amount <= 0}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Querying Bank Webhook...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Simulate Retailer Scanned & Paid (Instant Test)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
