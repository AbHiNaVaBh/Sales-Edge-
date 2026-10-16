import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  Gift,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Building,
  Store,
  Warehouse,
  Percent,
  Receipt,
  FileCheck,
  Zap,
  Target,
  Award,
  Trash2,
  Check,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { db } from '../services/db.ts';
import { calculateOrderDetails, getProductUnitPrice } from '../utils/schemeEngine.ts';
import type { Customer, Product, Scheme, CartItem, Order } from '../types/index.ts';

interface OrderTakingModalProps {
  initialCustomer?: Customer | null;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const OrderTakingModal: React.FC<OrderTakingModalProps> = ({
  initialCustomer,
  onClose,
  onOrderSuccess,
}) => {
  const customers = db.getCustomers();
  const products = db.getProducts();
  const schemes = db.getSchemes();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer ? initialCustomer.id : customers[0]?.id || ''
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<'all' | 'focus' | 'must_sell' | 'schemes'>('all');
  const [isInstantCash, setIsInstantCash] = useState<boolean>(false);
  const [repNotes, setRepNotes] = useState<string>('');
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState<Order | null>(null);

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Filter schemes applicable to this customer type
  const applicableSchemes = useMemo(() => {
    if (!currentCustomer) return [];
    return schemes.filter(
      (s) => s.active && (s.applicableTo === 'both' || s.applicableTo === currentCustomer.type)
    );
  }, [currentCustomer, schemes]);

  // Real-time calculation
  const calculation = useMemo(() => {
    if (!currentCustomer) {
      return {
        grossSubtotal: 0,
        appliedSchemes: [],
        totalSchemeDiscount: 0,
        freeItems: [],
        netAfterDiscounts: 0,
        taxAmount: 0,
        grandTotal: 0,
        isCreditExceeded: false,
        creditDeficit: 0,
      };
    }
    return calculateOrderDetails(cart, currentCustomer, applicableSchemes, isInstantCash);
  }, [cart, currentCustomer, applicableSchemes, isInstantCash]);

  // Available Categories
  const categories = [
    'All',
    'Home Care',
    'Beauty & Personal Care',
    'Foods & Refreshment',
    'Beverages & Nutrition',
  ];

  // Distinct Brands
  const popularBrands = useMemo(() => {
    const brandSet = Array.from(new Set(products.map((p) => p.brand)));
    return ['All', ...brandSet];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.packDescription.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;

      let matchesQuick = true;
      if (quickFilter === 'focus') matchesQuick = !!p.isFocusSKU;
      if (quickFilter === 'must_sell') matchesQuick = !!p.isMustSell;
      if (quickFilter === 'schemes') {
        matchesQuick = applicableSchemes.some((s) => s.targetProductId === p.id);
      }

      return matchesSearch && matchesCat && matchesBrand && matchesQuick;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, quickFilter, applicableSchemes]);

  const updateQuantity = (product: Product, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing && delta > 0) {
        return [...prev, { product, quantity: delta }];
      }
      if (existing) {
        const nextQty = existing.quantity + delta;
        if (nextQty <= 0) {
          return prev.filter((item) => item.product.id !== product.id);
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return prev;
    });
  };

  const setDirectQuantity = (product: Product, qty: number) => {
    if (isNaN(qty) || qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== product.id));
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: qty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const getProductCartQty = (productId: string) => {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  };

  // HUL SalesEdge Feature: Load AI-suggested Must-Sell order basket
  const handleLoadSuggestedOrder = () => {
    const isWholesale = currentCustomer?.type === 'wholesaler';
    const suggestedSkus = products.filter((p) => p.isMustSell || p.isFocusSKU).slice(0, 5);
    const suggestedCart: CartItem[] = suggestedSkus.map((p) => ({
      product: p,
      quantity: isWholesale ? p.minOrderWholesale * 2 : 2,
    }));
    setCart(suggestedCart);
  };

  const handleBookOrder = () => {
    if (cart.length === 0 || !currentCustomer) return;

    const orderItems = cart.map((item) => {
      const unitPrice = getProductUnitPrice(item.product, currentCustomer.type);
      const lineGross = unitPrice * item.quantity;
      return {
        productId: item.product.id,
        productCode: item.product.code,
        productName: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
        unit: item.product.unit,
        unitPrice,
        quantity: item.quantity,
        totalGross: lineGross,
        appliedDiscount: 0,
        netTotal: lineGross,
      };
    });

    const newOrder = db.createOrder({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerType: currentCustomer.type,
      routeBeat: currentCustomer.routeBeat,
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      items: orderItems,
      grossSubtotal: calculation.grossSubtotal,
      schemeDiscount: calculation.totalSchemeDiscount,
      appliedSchemes: calculation.appliedSchemes,
      freeItems: calculation.freeItems,
      taxAmount: calculation.taxAmount,
      grandTotal: calculation.grandTotal,
      paymentStatus: isInstantCash ? 'paid' : 'unpaid',
      amountPaid: isInstantCash ? calculation.grandTotal : 0,
      linesPerCall: cart.length,
      notes: repNotes,
      repSignature: 'HUL SalesEdge Verified',
    });

    setShowOrderSuccessModal(newOrder);
  };

  const availableCredit = Math.max(
    0,
    (currentCustomer?.creditLimit || 0) - (currentCustomer?.outstandingBalance || 0)
  );
  const creditUsagePct = currentCustomer
    ? Math.min(
        100,
        Math.round((currentCustomer.outstandingBalance / currentCustomer.creditLimit) * 100)
      )
    : 0;

  const isWholesale = currentCustomer?.type === 'wholesaler';

  // Target LPC count (enterprise norm is ~4 lines per call)
  const lpcTarget = 4;
  const lpcProgress = Math.min(100, Math.round((cart.length / lpcTarget) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header: Enterprise Command Strip */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Order Booking & Dynamic Scheme Engine
                </h2>
                <span className="text-[11px] font-mono text-blue-300 bg-blue-900/60 border border-blue-500/30 px-2 py-0.5 rounded">
                  SalesEdge B2B
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Auto-pricing, QPS free goods, Mandi wholesale slabs & LPC target tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Smart Order shortcut */}
            <button
              onClick={handleLoadSuggestedOrder}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg text-xs font-bold transition-all shadow-2xs"
              title="Auto-load top selling Must-Sell lines"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Smart Basket</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close Order Form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Outlet Context Strip */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Customer Details */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs text-slate-700">
                {isWholesale ? (
                  <Warehouse className="w-5 h-5 text-purple-700" />
                ) : (
                  <Store className="w-5 h-5 text-blue-700" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Target Outlet:</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600">{currentCustomer?.routeBeat}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-blue-700">{currentCustomer?.hulClubTier}</span>
                </div>

                {initialCustomer ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {currentCustomer?.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      In-Store Active
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-extrabold text-slate-800 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                        Office Visit / Walk-in Customer Purchase
                      </span>
                    </div>
                    <select
                      id="order-customer-select"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full max-w-md bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · [{c.hulClubTier}] · Outst: Rs. {c.outstandingBalance}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Health & Pricing Tier Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Pricing Mode:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {isWholesale ? 'Wholesale Mandi Slab' : 'Retailer PTR'}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div>
                <span className="text-[11px] text-slate-500 block">Available Credit:</span>
                <span className="font-bold text-emerald-700">
                  Rs. {availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div>
                <span className="text-[11px] text-slate-500 block">Outstanding:</span>
                <span
                  className={`font-semibold ${
                    creditUsagePct > 75 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  Rs. {currentCustomer?.outstandingBalance.toLocaleString()}
                </span>
              </div>

              {/* Mini Credit bar */}
              <div className="w-20 hidden md:block">
                <span className="text-[10px] text-slate-400 block text-right">{creditUsagePct}% limit</span>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-0.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      creditUsagePct > 75 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${creditUsagePct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Work Area: Product Catalog (Left) + Interactive Basket (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100">
          
          {/* LEFT: Product Catalog Panel (7 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            
            {/* Search, Filter Tabs and Brand Chips Toolbar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 space-y-2.5 bg-slate-50/60 shrink-0">
              
              {/* Row 1: Search and Smart Basket */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search SKUs: Surf Excel, Dove, Horlicks, Rin, Vim..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={handleLoadSuggestedOrder}
                  className="md:hidden px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Smart</span>
                </button>
              </div>

              {/* Row 2: Category Segmented Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Row 3: Quick Filter Chips (Focus SKUs, Must Sell, Promos) */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] pt-0.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQuickFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      quickFilter === 'all'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({products.length})
                  </button>
                  <button
                    onClick={() => setQuickFilter('focus')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      quickFilter === 'focus'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-amber-800 hover:bg-amber-100 bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    <span>Focus Drive SKUs</span>
                  </button>
                  <button
                    onClick={() => setQuickFilter('must_sell')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      quickFilter === 'must_sell'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-blue-800 hover:bg-blue-100 bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Must-Sell Basket</span>
                  </button>
                  <button
                    onClick={() => setQuickFilter('schemes')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      quickFilter === 'schemes'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-purple-800 hover:bg-purple-100 bg-purple-50 border border-purple-200'
                    }`}
                  >
                    <Gift className="w-3 h-3" />
                    <span>Promo Schemes</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium shrink-0 hidden sm:block">
                  {filteredProducts.length} SKU(s) matching
                </span>
              </div>
            </div>

            {/* Product Grid / Cards List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No SKUs found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search query or switching categories
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedBrand('All');
                      setQuickFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const cartQty = getProductCartQty(product.id);
                  const unitPrice = getProductUnitPrice(product, currentCustomer.type);
                  const relatedScheme = applicableSchemes.find(
                    (s) => s.targetProductId === product.id
                  );
                  const isInCart = cartQty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isInCart
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-400/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Product Info & Scheme Badges */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {product.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {product.code}
                            </span>

                            {product.isFocusSKU && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-300">
                                <Target className="w-3 h-3 text-amber-700" /> Focus SKU
                              </span>
                            )}

                            {product.isMustSell && (
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                Must-Sell
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 leading-snug">
                            {product.packDescription}
                          </p>

                          {/* Commercial Pricing Meta */}
                          <div className="flex items-center gap-3 text-xs pt-1 flex-wrap text-slate-600">
                            <span className="font-medium text-slate-700">{product.unit}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-400 line-through">MRP Rs. {product.mrp}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-extrabold text-sm text-blue-900">
                              PTR: Rs. {unitPrice.toFixed(2)}
                            </span>
                            {!isWholesale && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {product.marginPct}% Margin
                                </span>
                              </>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-slate-500">
                              Stock: <strong>{product.stockQuantity}</strong>
                            </span>
                          </div>

                          {/* Related Promotion Banner */}
                          {relatedScheme && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                              <Gift className="w-3.5 h-3.5 text-purple-600" />
                              <span className="font-semibold">{relatedScheme.title}</span>
                              <span className="text-purple-600 text-[11px]">· {relatedScheme.description}</span>
                            </div>
                          )}
                        </div>

                        {/* Interactive Quantity Stepper & Quick Add Buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          {cartQty === 0 ? (
                            <button
                              onClick={() =>
                                updateQuantity(
                                  product,
                                  isWholesale ? product.minOrderWholesale : 1
                                )
                              }
                              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add {isWholesale ? `(${product.minOrderWholesale} Min)` : ''}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-xs">
                              <button
                                onClick={() => updateQuantity(product, -1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                value={cartQty}
                                onChange={(e) =>
                                  setDirectQuantity(product, parseInt(e.target.value, 10))
                                }
                                className="w-12 text-center font-bold text-sm text-slate-900 focus:outline-none bg-transparent"
                              />

                              <button
                                onClick={() => updateQuantity(product, 1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Quick case increment for wholesale */}
                          {isWholesale && (
                            <button
                              onClick={() => updateQuantity(product, 5)}
                              className="px-2 py-2 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
                              title="Add 5 wholesale shipper cases"
                            >
                              +5 Cases
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Order Basket & Commercial Settlement Panel (5 Cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-slate-50 border-t lg:border-t-0 overflow-hidden">
            
            {/* Basket Header with Live LPC (Lines Per Call) Gauge */}
            <div className="p-4 bg-white border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-700" />
                    <span>Order Basket</span>
                    <span className="font-mono text-xs text-slate-500">({cart.length} lines)</span>
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* LPC Target Meter */}
              <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-700" />
                    Lines Per Call (LPC): {cart.length} / {lpcTarget} Target
                  </span>
                  {cart.length >= lpcTarget ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Target Met
                    </span>
                  ) : (
                    <span className="text-[11px] text-purple-700 font-semibold">
                      Need {lpcTarget - cart.length} more SKU(s)
                    </span>
                  )}
                </div>

                <div className="w-full bg-purple-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      cart.length >= lpcTarget ? 'bg-emerald-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${lpcProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Cart Items List & Promotions Engine */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Basket is empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Select SKUs from the catalog or tap "Smart Basket" to auto-load top-selling lines
                  </p>
                  <button
                    onClick={handleLoadSuggestedOrder}
                    className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                  >
                    <Zap className="w-3.5 h-3.5 text-white" />
                    <span>Load Recommended HUL Basket</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Itemized lines */}
                  <div className="space-y-2">
                    {cart.map((item) => {
                      const unitPrice = getProductUnitPrice(item.product, currentCustomer.type);
                      const lineTotal = unitPrice * item.quantity;
                      return (
                        <div
                          key={item.product.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-slate-900 text-xs block truncate">
                                {item.product.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {item.product.brand} · Rs. {unitPrice.toFixed(2)} / unit
                              </span>
                            </div>
                            <span className="font-extrabold text-xs text-slate-900 shrink-0">
                              Rs. {lineTotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Stepper + delete */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.product.code}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(item.product, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-xs text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateQuantity(item.product, -item.quantity)}
                                className="ml-2 text-slate-400 hover:text-rose-600"
                                title="Remove line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Free Goods Section (QPS) */}
                  {calculation.freeItems.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <Gift className="w-4 h-4 text-emerald-700" />
                        <span>Promotional Free Goods Added:</span>
                      </div>
                      {calculation.freeItems.map((freeItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-emerald-950 pl-5"
                        >
                          <span className="font-medium">
                            {freeItem.freeQuantity}x {freeItem.productName}
                          </span>
                          <span className="font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                            100% FREE
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Applied Schemes Breakdown */}
                  {calculation.appliedSchemes.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                        <Tag className="w-4 h-4 text-purple-700" />
                        <span>Trade Schemes Qualified:</span>
                      </div>
                      {calculation.appliedSchemes.map((sch, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-purple-950 pl-5"
                        >
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
                  )}

                  {/* Spot Cash / Immediate UPI Discount (CD) Toggle */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                          %
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">Spot Settlement Discount (CD)</span>
                          <span className="text-slate-500 text-[11px]">
                            1.5% instant rebate for spot UPI/Cash
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isInstantCash}
                        onChange={(e) => setIsInstantCash(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600"
                      />
                    </label>
                  </div>

                  {/* Distributor Delivery Notes */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Distributor Van Delivery Instructions:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Deliver before 12 PM; send fresh batch of Horlicks..."
                      value={repNotes}
                      onChange={(e) => setRepNotes(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Credit Limit Alert if exceeded */}
                  {calculation.isCreditExceeded && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          Credit Limit Exceeded by Rs. {calculation.creditDeficit.toFixed(2)}!
                        </span>
                        <p className="mt-0.5 text-rose-700 text-[11px]">
                          Outlet outstanding is Rs. {currentCustomer.outstandingBalance.toLocaleString()}. Requires spot payment or distributor credit override.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Final Commercial Summary & Order Confirmation Button */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Order Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    Rs. {calculation.grossSubtotal.toFixed(2)}
                  </span>
                </div>

                {calculation.totalSchemeDiscount > 0 && (
                  <div className="flex justify-between text-purple-700 font-bold">
                    <span>Trade Scheme Discounts:</span>
                    <span>-Rs. {calculation.totalSchemeDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax Breakdown (18%):</span>
                  <span className="font-semibold text-slate-900">
                    Rs. {calculation.taxAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Net Order Payable:</span>
                  <span className="text-blue-700 text-lg">
                    Rs. {calculation.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Book Order Button */}
              <button
                disabled={cart.length === 0}
                onClick={handleBookOrder}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:from-blue-800 active:to-indigo-800 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  Confirm & Book Order (Rs. {calculation.grandTotal.toFixed(2)})
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Confirmation Modal */}
      {showOrderSuccessModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Order Booked Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Order Slip: <span className="font-mono font-bold text-slate-800">{showOrderSuccessModal.orderNumber}</span>
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs text-left space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Outlet Name:</span>
                <span className="font-bold text-slate-900">{showOrderSuccessModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Payable Total:</span>
                <span className="font-extrabold text-blue-700 text-sm">
                  Rs. {showOrderSuccessModal.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trade Schemes Savings:</span>
                <span className="font-bold text-purple-700">
                  Rs. {showOrderSuccessModal.schemeDiscount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lines Per Call (LPC):</span>
                <span className="font-bold text-blue-700">
                  {showOrderSuccessModal.linesPerCall} Unique Lines
                </span>
              </div>
              {showOrderSuccessModal.freeItems.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Free Goods (QPS):</span>
                  <span className="font-bold text-emerald-700">
                    {showOrderSuccessModal.freeItems.reduce((acc, f) => acc + f.freeQuantity, 0)} Units Free
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Sync Status:</span>
                <span className="font-bold text-emerald-700 uppercase text-[10px]">
                  {showOrderSuccessModal.syncStatus === 'synced' ? 'Synced to Central Server' : 'Queued (Offline Mode)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const ord = showOrderSuccessModal;
                setShowOrderSuccessModal(null);
                onOrderSuccess(ord);
              }}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Done & Return to Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
