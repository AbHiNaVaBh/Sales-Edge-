/**
 * Pure calculation logic for pricing, scheme qualifications, discounts, and credit verification.
 */
import type {
  CartItem,
  Customer,
  CustomerType,
  OrderCalculationResult,
  Product,
  Scheme,
  AppliedSchemeDetail,
  CalculatedFreeItem,
} from '../types/index.ts';

export function getProductUnitPrice(product: Product, customerType: CustomerType): number {
  return customerType === 'wholesaler' ? product.wholesalePrice : product.retailPrice;
}

export function calculateCartGross(items: CartItem[], customerType: CustomerType): number {
  return items.reduce((acc, item) => {
    const price = getProductUnitPrice(item.product, customerType);
    return acc + price * item.quantity;
  }, 0);
}

export function calculateTotalCartQuantity(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}

export function isSchemeApplicableToCustomer(scheme: Scheme, customerType: CustomerType): boolean {
  if (!scheme.active) return false;
  if (scheme.applicableTo === 'both') return true;
  return scheme.applicableTo === customerType;
}

/**
 * Calculates discounts, free promotional goods, taxes, and credit limit compliance
 */
export function calculateOrderDetails(
  items: CartItem[],
  customer: Customer,
  availableSchemes: Scheme[],
  isInstantCashPayment: boolean = false
): OrderCalculationResult {
  const customerType = customer.type;
  const grossSubtotal = calculateCartGross(items, customerType);
  const totalQuantity = calculateTotalCartQuantity(items);

  const appliedSchemes: AppliedSchemeDetail[] = [];
  const freeItems: CalculatedFreeItem[] = [];
  let totalSchemeDiscount = 0;

  // Filter schemes applicable to this customer type
  const eligibleSchemes = availableSchemes.filter((s) =>
    isSchemeApplicableToCustomer(s, customerType)
  );

  // 1. Process Buy X Get Y Free schemes
  for (const scheme of eligibleSchemes) {
    if (scheme.type === 'buy_x_get_y' && scheme.targetProductId && scheme.buyQuantity && scheme.freeQuantity) {
      const cartItem = items.find((i) => i.product.id === scheme.targetProductId);
      if (cartItem && cartItem.quantity >= scheme.buyQuantity) {
        const factor = Math.floor(cartItem.quantity / scheme.buyQuantity);
        const freeQty = factor * scheme.freeQuantity;
        if (freeQty > 0) {
          const freeItem: CalculatedFreeItem = {
            productId: scheme.freeProductId || scheme.targetProductId,
            productName: scheme.freeProductName || cartItem.product.name,
            freeQuantity: freeQty,
            schemeTitle: scheme.title,
          };
          freeItems.push(freeItem);
          appliedSchemes.push({
            schemeId: scheme.id,
            schemeCode: scheme.code,
            title: scheme.title,
            discountAmount: 0,
            freeItems: [freeItem],
            type: 'buy_x_get_y',
          });
        }
      }
    }
  }

  // 2. Process Slab Discounts (Percentage off on subtotal or quantity threshold)
  // Look for the best applicable slab discount if multiple slabs exist, or apply specific threshold
  const slabSchemes = eligibleSchemes.filter((s) => s.type === 'slab_discount');
  for (const scheme of slabSchemes) {
    let qualifies = false;
    if (scheme.minOrderValue && grossSubtotal >= scheme.minOrderValue) {
      qualifies = true;
    } else if (scheme.minQuantity && totalQuantity >= scheme.minQuantity) {
      qualifies = true;
    }

    if (qualifies && scheme.discountPercentage) {
      const discountAmount = Math.round(((grossSubtotal * scheme.discountPercentage) / 100) * 100) / 100;
      totalSchemeDiscount += discountAmount;
      appliedSchemes.push({
        schemeId: scheme.id,
        schemeCode: scheme.code,
        title: scheme.title,
        discountAmount,
        type: 'slab_discount',
      });
    }
  }

  // 3. Process Flat / Combo Discounts
  const comboSchemes = eligibleSchemes.filter((s) => s.type === 'combo_discount');
  for (const scheme of comboSchemes) {
    if (scheme.minOrderValue && grossSubtotal >= scheme.minOrderValue && scheme.flatDiscount) {
      const discount = Math.min(scheme.flatDiscount, grossSubtotal);
      totalSchemeDiscount += discount;
      appliedSchemes.push({
        schemeId: scheme.id,
        schemeCode: scheme.code,
        title: scheme.title,
        discountAmount: discount,
        type: 'combo_discount',
      });
    }
  }

  // 4. Instant Cash Scheme (if paying immediately in cash/UPI)
  if (isInstantCashPayment) {
    const cashSchemes = eligibleSchemes.filter((s) => s.type === 'instant_cash_scheme');
    for (const scheme of cashSchemes) {
      if (scheme.discountPercentage) {
        const discountAmount =
          Math.round((((grossSubtotal - totalSchemeDiscount) * scheme.discountPercentage) / 100) * 100) / 100;
        totalSchemeDiscount += discountAmount;
        appliedSchemes.push({
          schemeId: scheme.id,
          schemeCode: scheme.code,
          title: scheme.title,
          discountAmount,
          type: 'instant_cash_scheme',
        });
      }
    }
  }

  // Cap total discount at grossSubtotal
  totalSchemeDiscount = Math.min(totalSchemeDiscount, grossSubtotal);
  const netAfterDiscounts = Math.max(0, grossSubtotal - totalSchemeDiscount);

  // Standard GST/VAT tax calculation (5% standard default)
  const taxRate = 0.05;
  const taxAmount = Math.round(netAfterDiscounts * taxRate * 100) / 100;
  const grandTotal = Math.round((netAfterDiscounts + taxAmount) * 100) / 100;

  // Credit limit check
  const projectedBalance = customer.outstandingBalance + grandTotal;
  const isCreditExceeded = projectedBalance > customer.creditLimit;
  const creditDeficit = isCreditExceeded ? Math.round((projectedBalance - customer.creditLimit) * 100) / 100 : 0;

  return {
    grossSubtotal,
    appliedSchemes,
    totalSchemeDiscount,
    freeItems,
    netAfterDiscounts,
    taxAmount,
    grandTotal,
    isCreditExceeded,
    creditDeficit,
  };
}
