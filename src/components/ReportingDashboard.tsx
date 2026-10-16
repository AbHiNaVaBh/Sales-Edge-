import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart2,
  PieChart,
  Award,
  Users,
  Target,
  DollarSign,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { DailyBeatStats, Order, Customer } from '../types/index.ts';

export const ReportingDashboard: React.FC = () => {
  const [stats, setStats] = useState<DailyBeatStats>(db.getDailyStats());
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setStats(db.getDailyStats());
      setOrders(db.getOrders());
      setCustomers(db.getCustomers());
    });
    return unsubscribe;
  }, []);

  // Category wise sales calculation
  const categorySales: Record<string, number> = {};
  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      categorySales[item.category] = (categorySales[item.category] || 0) + item.totalGross;
    });
  });

  const totalItemSales = Object.values(categorySales).reduce((acc, v) => acc + v, 0) || 1;

  // Wholesale Mandi vs Retailer Kirana Revenue Share
  const wholesaleRevenue = orders
    .filter((o) => o.customerType === 'wholesaler')
    .reduce((acc, o) => acc + o.grandTotal, 0);
  const retailRevenue = orders
    .filter((o) => o.customerType === 'retailer')
    .reduce((acc, o) => acc + o.grandTotal, 0);
  const totalRevenue = wholesaleRevenue + retailRevenue || 1;
  const wholesalePct = Math.round((wholesaleRevenue / totalRevenue) * 100);
  const retailPct = 100 - wholesalePct;

  // DSR Leaderboard (simulated HUL DSRs in South Zone)
  const leaderboard = [
    { rank: 1, name: 'Abhinav Sharma (You)', dsrCode: 'DSR-9842', territory: 'MG Road & Sadar Mandi', sales: stats.achievedSales + 380000, target: 500000, lpc: stats.linesPerCallAchieved, strike: '88%', incentive: stats.dailyIncentiveEarned + 4500, badge: 'Star DSR' },
    { rank: 2, name: 'Priya Sen', dsrCode: 'DSR-9811', territory: 'Coastal Kirana Beat', sales: 420000, target: 480000, lpc: 4.6, strike: '84%', incentive: 4800, badge: 'Focus Drive Leader' },
    { rank: 3, name: 'Rahul Nair', dsrCode: 'DSR-9824', territory: 'Urban Modern Trade Loop', sales: 395000, target: 450000, lpc: 4.4, strike: '80%', incentive: 4100, badge: 'Consistent' },
    { rank: 4, name: 'Sneha Kulkarni', dsrCode: 'DSR-9830', territory: 'Semi-Urban Shakti Route', sales: 345000, target: 420000, lpc: 4.2, strike: '76%', incentive: 3600, badge: 'Volume Champion' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                SalesEdge Performance Cockpit
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-600 font-medium">Hindustan Unilever Limited</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">DSR Market Execution & Incentive Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live automated aggregation of secondary sales, trade schemes, LPC compliance & distributor sync
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Billing Cycle: October 2026 · Distributor: {stats.distributorName}</span>
          </div>
        </div>

        {/* 4 Scorecard KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">MTD Sales Turnover</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-800">
                Rs. {(stats.achievedSales + 380000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-500">/ Rs. 5,00,000 Target</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
              <span>Run Rate: 82%</span>
              <span className="text-emerald-700 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +16% vs Last Month
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Monthly DSR Incentive</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-700">
                Rs. {(stats.dailyIncentiveEarned + 4500).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-500">commission earned</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Today's addition: Rs. {stats.dailyIncentiveEarned}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">LPC (Lines Per Call)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-purple-800">{stats.linesPerCallAchieved}</span>
              <span className="text-xs text-slate-500">/ {stats.linesPerCallTarget} Target</span>
            </div>
            <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Exceeding focus basket width</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Focus Drive SKUs Penetration</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">
                {stats.focusSKUsSold} / {stats.focusSKUsTarget}
              </span>
              <span className="text-xs text-slate-500">cases booked</span>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              <span>Surf Matic & Dove Shampoo active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HUL Divisions Revenue Breakdown */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-700" />
              HUL Division Revenue Contribution
            </h2>
            <span className="text-xs text-slate-500">Gross Billed Value</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {Object.entries(categorySales).map(([cat, amount]) => {
              const pct = Math.round((amount / totalItemSales) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cat}</span>
                    <span className="font-bold text-slate-900">
                      Rs. {amount.toFixed(2)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-700 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Wholesale Mandi vs General Trade Kirana Mix */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Channel Distribution (Wholesale Mandi vs Retail Kirana)
            </h2>
            <span className="text-xs text-slate-500">Order Volume Mix</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                <span className="font-semibold text-slate-800">Wholesale Mandi Channel ({wholesalePct}%)</span>
              </div>
              <span className="font-bold text-indigo-700">Rs. {wholesaleRevenue.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span className="font-semibold text-slate-800">Retail Kirana Channel ({retailPct}%)</span>
              </div>
              <span className="font-bold text-blue-700">Rs. {retailRevenue.toFixed(2)}</span>
            </div>

            {/* Combined Segment Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full flex overflow-hidden">
              <div
                style={{ width: `${wholesalePct}%` }}
                className="bg-indigo-600 h-full transition-all"
                title={`Wholesale: ${wholesalePct}%`}
              />
              <div
                style={{ width: `${retailPct}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`Retail: ${retailPct}%`}
              />
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-100">
              <span className="font-bold text-slate-800 block">HUL Distribution Insights:</span>
              <p>
                Sadar Mandi Wholesalers provide critical pallet velocity for Surf Excel & Wheel shippers with 7% volume slabs,
                while Diamond Club & Gold Star kirana outlets generate high-margin daily off-take for Dove, Lifebuoy, Horlicks & Red Label Tea.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Field Rep Team Leaderboard */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">HUL South Territory DSR Rankings (October MTD)</h3>
          </div>
          <span className="text-xs text-slate-500">Live sync from HUL Redistribution Server</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Rank</th>
                <th className="py-2.5 px-4">DSR Name & Code</th>
                <th className="py-2.5 px-4">Territory Beat</th>
                <th className="py-2.5 px-4">MTD Sales</th>
                <th className="py-2.5 px-4">LPC</th>
                <th className="py-2.5 px-4">Strike Rate</th>
                <th className="py-2.5 px-4">Incentive</th>
                <th className="py-2.5 px-4 text-right">Club Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {leaderboard.map((rep) => {
                const isCurrent = rep.name.includes('(You)');

                return (
                  <tr key={rep.rank} className={isCurrent ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-4">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          rep.rank === 1
                            ? 'bg-amber-100 text-amber-800'
                            : rep.rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {rep.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{rep.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">{rep.dsrCode}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{rep.territory}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Rs. {rep.sales.toLocaleString()}</td>
                    <td className="py-3 px-4 text-purple-700 font-bold">{rep.lpc}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{rep.strike}</td>
                    <td className="py-3 px-4 font-bold text-amber-700">Rs. {rep.incentive.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700 border border-slate-200">
                        {rep.badge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
