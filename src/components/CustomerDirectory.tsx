import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Warehouse,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  X,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
} from 'lucide-react';
import { db } from '../services/db.ts';
import type { Customer, CustomerType, CustomerTier } from '../types/index.ts';
import { OutletLocationModal } from './OutletLocationModal.tsx';

interface CustomerDirectoryProps {
  onTakeOrder: (customer: Customer) => void;
  onRecordPayment: (customer: Customer) => void;
  onLogVisit: (customer: Customer) => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  onTakeOrder,
  onRecordPayment,
  onLogVisit,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBeat, setSelectedBeat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCustomerFor360, setSelectedCustomerFor360] = useState<Customer | null>(null);
  const [selectedOutletForMap, setSelectedOutletForMap] = useState<Customer | null>(null);
  const [showAllOutletsMap, setShowAllOutletsMap] = useState<boolean>(false);

  // New Customer Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newType, setNewType] = useState<CustomerType>('retailer');
  const [newTier, setNewTier] = useState<CustomerTier>('B');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBeat, setNewBeat] = useState('Metro Central Route');
  const [newGstin, setNewGstin] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('1500');
  const [newTerms, setNewTerms] = useState('14');

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setCustomers(db.getCustomers());
    });
    return unsubscribe;
  }, []);

  const beats = Array.from(new Set(customers.map((c) => c.routeBeat)));

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);
      const matchesBeat = selectedBeat === 'all' || c.routeBeat === selectedBeat;
      const matchesType = selectedType === 'all' || c.type === selectedType;
      return matchesSearch && matchesBeat && matchesType;
    });
  }, [customers, searchQuery, selectedBeat, selectedType]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newOwnerName) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newStoreName,
      ownerName: newOwnerName,
      type: newType,
      tier: newTier,
      phone: newPhone || '+1 (555) 000-0000',
      email: newEmail || `${newStoreName.toLowerCase().replace(/\s+/g, '')}@store.com`,
      address: newAddress || 'Central Market Area',
      routeBeat: newBeat,
      gstin: newGstin || '27XYZAB1234K1Z0',
      creditLimit: parseFloat(newCreditLimit) || 1000,
      outstandingBalance: 0,
      paymentTermsDays: parseInt(newTerms, 10) || 14,
      visitStatus: 'pending',
      lastVisitDate: new Date().toISOString().split('T')[0],
      hulClubTier: newType === 'wholesaler' ? 'Wholesale Mandi' : newTier === 'A' ? 'Diamond Club' : newTier === 'B' ? 'Gold Star' : 'Silver Kirana',
      pjpDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      geofenceDistanceMeters: 22,
      perfectStoreScore: 80,
    };

    db.saveCustomer(newCust);
    setShowAddModal(false);
    // Reset form
    setNewStoreName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewGstin('');
  };

  return (
    <div className="space-y-6">
      {/* Directory Header & Controls */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer & Outlet Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage verified retail stores, wholesale accounts, credit limits and visit history
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Outlet</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by store, owner, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 text-slate-700 focus:outline-none"
          >
            <option value="all">All Territory Beats ({customers.length})</option>
            {beats.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 text-slate-700 focus:outline-none"
          >
            <option value="all">All Outlet Types</option>
            <option value="retailer">Retail Stores Only</option>
            <option value="wholesaler">Wholesale Distributors Only</option>
          </select>

          <button
            type="button"
            onClick={() => setShowAllOutletsMap(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
            title="View all outlets geographically on interactive Google Maps"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Outlets GPS Map</span>
          </button>
        </div>
      </section>

      {/* Outlets Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const isWholesale = customer.type === 'wholesaler';
          const creditUtilization = Math.min(
            100,
            Math.round((customer.outstandingBalance / customer.creditLimit) * 100)
          );

          return (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isWholesale ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isWholesale ? <Warehouse className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{customer.name}</h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Owner: {customer.ownerName}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                      isWholesale ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {customer.type} · Tier {customer.tier}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Beat: {customer.routeBeat}</span>
                  </div>
                </div>

                {/* Credit Gauge */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Outstanding:</span>
                    <span className="font-bold text-slate-900">${customer.outstandingBalance.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        creditUtilization > 80 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${creditUtilization}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Limit: ${customer.creditLimit}</span>
                    <span>{customer.paymentTermsDays} Days Terms</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOutletForMap(customer)}
                  className="py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  title="View outlet GPS location on Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>GPS Map</span>
                </button>
                <button
                  onClick={() => onRecordPayment(customer)}
                  className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors text-center"
                >
                  Collect
                </button>
                <button
                  onClick={() => onLogVisit(customer)}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors text-center"
                >
                  Visit
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Onboard New Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Onboard New Customer Outlet</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Store / Firm Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Fresh Mart"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Proprietor / Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singhania"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Channel Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as CustomerType)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="retailer">Retailer (Kirana / Supermarket)</option>
                    <option value="wholesaler">Wholesaler (Bulk Distributor)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Outlet Tier</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as CustomerTier)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="A">Tier A (High Volume Key Account)</option>
                    <option value="B">Tier B (Standard Commercial)</option>
                    <option value="C">Tier C (Small Provision Store)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Store Address</label>
                <input
                  type="text"
                  placeholder="Plot number, market, street name..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Territory Beat</label>
                  <select
                    value={newBeat}
                    onChange={(e) => setNewBeat(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {beats.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Credit Limit ($)</label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Terms (Days)</label>
                  <input
                    type="number"
                    value={newTerms}
                    onChange={(e) => setNewTerms(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  Save & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GPS Outlet Location Modal (Single Outlet or Full Territory Outlets View) */}
      {(selectedOutletForMap || showAllOutletsMap) && (
        <OutletLocationModal
          outlet={selectedOutletForMap || customers[0]}
          allOutlets={customers}
          onClose={() => {
            setSelectedOutletForMap(null);
            setShowAllOutletsMap(false);
          }}
          onEnterStore={(cust) => {
            setSelectedOutletForMap(null);
            setShowAllOutletsMap(false);
            onLogVisit(cust);
          }}
        />
      )}
    </div>
  );
};
