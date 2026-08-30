import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button, PageHeader, Toast } from "../components/ui";

type Product = {
  id: number;
  sku: string;
  name: string;
  brand?: string;
  version?: string;
  flavor?: string;
  selling_price: number;
  minimum_stock: number;
};
type InventoryItem = {
  product_id: number;
  sku: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
};
type SaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  sku?: string;
  product_name?: string;
  brand?: string;
  version?: string;
  flavor?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};
type Sale = {
  id: number;
  reference?: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  created_at: string;
  items?: SaleItem[];
};
type CartItem = {
  product: Product;
  quantity: number;
};

const API_URL = import.meta.env.VITE_API_URL;
const RECEIPT_COMPANY_NAME = "";
const RECEIPT_COMPANY_ADDRESS = "";
const RECEIPT_MESSAGE = "Thank you for your purchase!";
const PAYMENT_METHODS = [
  "CASH",
  "GCASH",
  "MAYA",
  "MARIBANK",
  "BANK_TRANSFER",
  "CARD",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
function receiptMoney(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}
function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getItemCount(sale: Sale) {
  return (sale.items ?? []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}
function getSaleReference(sale: Sale) {
  return sale.reference ?? `SALE-${String(sale.id).padStart(6, "0")}`;
}
function getProductDetails(item: SaleItem) {
  return [item.version, item.flavor]
    .filter(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    )
    .map((value) => String(value).trim())
    .join(" • ");
}
function printReceipt(sale: Sale) {
  const reference = getSaleReference(sale);
  const companyLines = [RECEIPT_COMPANY_NAME.trim(), RECEIPT_COMPANY_ADDRESS.trim()].filter(Boolean);
  const companyBlock = companyLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const itemsHtml = (sale.items ?? [])
    .map((item) => {
      const details = getProductDetails(item);
      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.product_name || "Product")}</div>
          ${details ? `<div class="item-details">${escapeHtml(details)}</div>` : ""}
          <div class="item-code">Item Code: ${escapeHtml(item.sku || "-")}</div>
          <div class="item-row">
            <span>${Number(item.quantity)} x ${receiptMoney(Number(item.unit_price))}</span>
            <strong>${receiptMoney(Number(item.subtotal))}</strong>
          </div>
        </div>
      `;
    })
    .join("");
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(reference)}</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; width: 100%; font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
          .receipt { width: 100%; max-width: 72mm; margin: 0 auto; }
          .center { text-align: center; }
          .company { font-weight: bold; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 8px 0; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .double-line { border-top: 2px solid #000; margin: 8px 0; }
          .meta-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
          .meta-label { white-space: nowrap; }
          .meta-value { text-align: right; word-break: break-word; }
          .section-title { font-weight: bold; margin: 8px 0 4px; }
          .item { padding: 6px 0; }
          .item-name { font-weight: bold; }
          .item-details { font-size: 10px; margin-top: 2px; color: #333; }
          .item-code { font-size: 10px; margin-top: 2px; }
          .item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-top: 3px; }
          .total { font-size: 15px; font-weight: bold; }
          .thank-you { margin-top: 14px; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          ${companyBlock ? `<div class="company center">${companyBlock}</div>` : ""}
          <div class="title center">RECEIPT</div>
          <div class="double-line"></div>
          <div class="meta-row"><span class="meta-label">Sale Reference:</span><span class="meta-value">${escapeHtml(reference)}</span></div>
          <div class="meta-row"><span class="meta-label">Transaction ID:</span><span class="meta-value">#${sale.id}</span></div>
          <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">${escapeHtml(formatReceiptDate(sale.sale_date))}</span></div>
          <div class="meta-row"><span class="meta-label">Payment:</span><span class="meta-value">${escapeHtml(sale.payment_method)}</span></div>
          <div class="double-line"></div>
          <div class="section-title">ITEMS</div>
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="meta-row"><span>Subtotal:</span><span>${receiptMoney(Number(sale.subtotal))}</span></div>
          <div class="meta-row"><span>Discount:</span><span>-${receiptMoney(Number(sale.discount))}</span></div>
          <div class="double-line"></div>
          <div class="meta-row total"><span>TOTAL:</span><span>${receiptMoney(Number(sale.total))}</span></div>
          <div class="double-line"></div>
          <div class="thank-you">${escapeHtml(RECEIPT_MESSAGE)}</div>
        </div>
        <script>
          window.onload = function () { window.print(); };
          window.onafterprint = function () { window.close(); };
        </script>
      </body>
    </html>
  `;
  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) {
    alert("Please allow pop-ups to print the receipt.");
    return;
  }

  // @ts-ignore - document.write is deprecated but still needed for printing
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleDate, setSaleDate] = useState(toDateTimeLocalValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showConfirmSaleModal, setShowConfirmSaleModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Track if submission is in progress
  const isSubmittingRef = useRef(false);


  function getStock(productID: number) {
    const item = inventory.find((inventoryItem) => inventoryItem.product_id === productID);
    return item ? Number(item.current_stock) : 0;
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/inventory`),
      ]);
      if (!productsResponse.ok) throw new Error(`Products API error: ${await productsResponse.text()}`);
      if (!inventoryResponse.ok) throw new Error(`Inventory API error: ${await inventoryResponse.text()}`);
      const productsData: Product[] = await productsResponse.json();
      const inventoryData: InventoryItem[] = await inventoryResponse.json();
      setProducts(Array.isArray(productsData) ? productsData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }
  async function loadSales() {
    try {
      setLoadingSales(true);
      const response = await fetch(`${API_URL}/api/sales`);
      if (!response.ok) throw new Error(await response.text());
      const data: Sale[] = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load sales.");
    } finally {
      setLoadingSales(false);
    }
  }
  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadProducts(), loadSales()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }
  useEffect(() => {
    loadProducts();
    loadSales();
  }, []);

  // Escape key handler only (backup for modal close)
  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showClearCartModal) {
          setShowClearCartModal(false);
        } else if (showConfirmSaleModal) {
          setShowConfirmSaleModal(false);
        } else {
          closeForm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showClearCartModal, showConfirmSaleModal]);

  // When the form opens, prevent body scroll
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return [product.sku, product.name, product.brand, product.version, product.flavor]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [products, search]);
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .slice(0, 5);
  }, [sales]);
  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => total + Number(item.product.selling_price) * item.quantity, 0);
  }, [cart]);
  const discountAmount = useMemo(() => {
    const value = Number(discount);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [discount]);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  function openNewSale() {
    setError("");
    setCart([]);
    setSearch("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setSaleDate(toDateTimeLocalValue(new Date()));
    setShowForm(true);
    isSubmittingRef.current = false;
  }
  function closeForm() {
    if (submitting) return;
    setShowForm(false);
    setCart([]);
    setSearch("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setError("");
    setShowClearCartModal(false);
    setShowConfirmSaleModal(false);
    isSubmittingRef.current = false;
  }
  function clearCart() {
    if (cart.length === 0) return;
    setShowClearCartModal(true);
  }
  function confirmClearCart() {
    setCart([]);
    setShowClearCartModal(false);
  }
  function addToCart(product: Product) {
    setError("");
    const stock = getStock(product.id);
    if (stock <= 0) {
      setError(`${product.name} is out of stock.`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= stock) {
        setError(`Only ${stock} unit${stock === 1 ? "" : "s"} of ${product.name} available.`);
        setTimeout(() => setError(""), 3000);
        return;
      }
      setCart((current) =>
        current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
      return;
    }
    setCart((current) => [...current, { product, quantity: 1 }]);
  }
  function changeQuantity(productID: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productID);
      return;
    }
    const stock = getStock(productID);
    if (quantity > stock) {
      setError(`Only ${stock} unit${stock === 1 ? "" : "s"} available.`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    setCart((current) =>
      current.map((item) => (item.product.id === productID ? { ...item, quantity } : item)),
    );
  }
  function removeFromCart(productID: number) {
    setCart((current) => current.filter((item) => item.product.id !== productID));
  }
  async function createSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Prevent double submission
    if (submitting || isSubmittingRef.current) {
      return;
    }

    setError("");

    if (cart.length === 0) {
      setError("Add at least one product to the sale.");
      return;
    }
    for (const item of cart) {
      const currentStock = getStock(item.product.id);
      if (item.quantity > currentStock) {
        setError(`${item.product.name} only has ${currentStock} unit${currentStock === 1 ? "" : "s"} available.`);
        return;
      }
      if (currentStock <= 0) {
        setError(`${item.product.name} is out of stock.`);
        return;
      }
    }
    const numericDiscount = Number(discount);
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
      setError("Discount cannot be negative.");
      return;
    }
    if (numericDiscount > cartSubtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }
    if (!paymentMethod) {
      setError("Payment method is required.");
      return;
    }
    const selectedDate = new Date(saleDate);
    if (Number.isNaN(selectedDate.getTime())) {
      setError("Invalid sale date.");
      return;
    }

    setSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const body = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        sale_date: selectedDate.toISOString(),
        discount: numericDiscount,
        payment_method: paymentMethod,
      };
      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const createdSale: Sale = await response.json();
      const receiptItems: SaleItem[] = cart.map((cartItem, index) => {
        const returnedItem = (createdSale.items ?? []).find(
          (item) => Number(item.product_id) === cartItem.product.id,
        );
        const quantity = returnedItem ? Number(returnedItem.quantity) : cartItem.quantity;
        const unitPrice = returnedItem ? Number(returnedItem.unit_price) : Number(cartItem.product.selling_price);
        const subtotal = returnedItem ? Number(returnedItem.subtotal) : unitPrice * quantity;
        return {
          id: returnedItem?.id ?? index + 1,
          sale_id: createdSale.id,
          product_id: cartItem.product.id,
          sku: returnedItem?.sku ?? cartItem.product.sku,
          product_name: returnedItem?.product_name ?? cartItem.product.name,
          brand: returnedItem?.brand ?? cartItem.product.brand,
          version: returnedItem?.version ?? cartItem.product.version,
          flavor: returnedItem?.flavor ?? cartItem.product.flavor,
          quantity,
          unit_price: unitPrice,
          subtotal,
        };
      });
      const saleForReceipt: Sale = {
        ...createdSale,
        items: receiptItems,
        subtotal: Number(createdSale.subtotal ?? cartSubtotal),
        discount: Number(createdSale.discount ?? numericDiscount),
        total: Number(createdSale.total ?? cartTotal),
        payment_method: createdSale.payment_method ?? paymentMethod,
        sale_date: createdSale.sale_date ?? selectedDate.toISOString(),
      };
      await Promise.all([loadProducts(), loadSales()]);
      setShowForm(false);
      setCart([]);
      setSearch("");
      setDiscount("0");
      setPaymentMethod("CASH");
      setSaleDate(toDateTimeLocalValue(new Date()));

      // Show toast notification
      setToast({
        message: `Sale ${getSaleReference(saleForReceipt)} created successfully!`,
        type: "success",
      });

      setReceiptSale(saleForReceipt);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create sale.");
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }
  function confirmCompleteSale() {
    if (submitting || isSubmittingRef.current) {
      return;
    }

    setShowConfirmSaleModal(false);
    const form = document.querySelector('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }
  const totalSales = useMemo(() => {
    return sales.reduce((total, sale) => total + Number(sale.total || 0), 0);
  }, [sales]);
  const transactionCount = sales.length;
  const todaySales = useMemo(() => {
    const today = new Date();
    return sales
      .filter((sale) => {
        const date = new Date(sale.sale_date);
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      })
      .reduce((total, sale) => total + Number(sale.total || 0), 0);
  }, [sales]);
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Helmet>
        <title>Sales - Vape Inventory</title>
        <meta name="description" content="Record sales and track your transaction history" />
      </Helmet>

      {/* ============================================================
          FULLSCREEN NEW SALE FORM - Shows when showForm is true
          ============================================================ */}
      {showForm && (
        <div className="fixed inset-0 z-[200] bg-zinc-100 flex flex-col safe-area overflow-x-hidden">
          {/* Form Header */}
          <div className="bg-white border-b border-zinc-200 p-6 shrink-0 flex items-center justify-between safe-area-top">
            <div className="flex items-center gap-6 min-w-0">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex min-h-13 min-w-13 items-center justify-center rounded-xl border border-zinc-200 text-2xl text-zinc-500 hover:bg-zinc-100 active:scale-95 transition shrink-0 tap-target font-bold"
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Transaction</p>
                <h2 className="text-3xl font-black text-zinc-950 truncate">New Sale</h2>
                <p className="text-base text-zinc-500 mt-0.5">
                  {cart.length} items • {totalCartItems} units • Total: {formatCurrency(cartTotal)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-base text-zinc-400 hidden md:inline font-medium">Esc to close</span>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex min-h-13 min-w-13 items-center justify-center rounded-xl border border-zinc-200 text-2xl text-zinc-500 hover:bg-zinc-100 active:scale-95 transition disabled:opacity-50 shrink-0 tap-target font-bold"
                aria-label="Close sale form"
              >
                ×
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-lg font-medium text-red-700 shrink-0 animate-fade-in overflow-hidden">
              {error}
            </div>
          )}

          {/* Main Form Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-8 gpu-scroll">
            <form onSubmit={createSale} className="max-w-7xl mx-auto w-full h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* LEFT: Products */}
                <div className="flex flex-col border border-zinc-200 rounded-2xl bg-white overflow-hidden min-w-0 h-full">
                  <div className="border-b border-zinc-200 p-5 shrink-0 bg-zinc-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Products</p>
                        <h3 className="mt-1 text-2xl font-black text-zinc-950 truncate">Add Products</h3>
                        <p className="text-sm text-zinc-400 mt-0.5">{filteredProducts.length} available</p>
                      </div>
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-48 md:w-56 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-base outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 shrink-0 tap-target"
                        style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                        aria-label="Search products"
                      />
                    </div>
                  </div>
                  <div className="flex-1 p-5 space-y-3 overflow-y-auto overflow-x-hidden gpu-scroll">
                    {loading ? (
                      <div className="text-center p-8 text-lg text-zinc-500 font-bold">Loading products...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center p-8 text-lg text-zinc-500 font-bold">
                        {search ? "No products match your search" : "No products available"}
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const stock = getStock(product.id);
                        const cartItem = cart.find((item) => item.product.id === product.id);
                        const remainingStock = Math.max(0, stock - (cartItem?.quantity ?? 0));
                        const isOutOfStock = stock <= 0;

                        const productDetails = [product.brand, product.version, product.flavor]
                          .filter(Boolean)
                          .join(" • ");

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock || remainingStock <= 0}
                            className="w-full min-h-22 rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50 hover:shadow-sm tap-target"
                          >
                            <div className="flex justify-between items-center gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-lg truncate">{product.name}</div>
                                {productDetails && (
                                  <div className="text-base text-zinc-600 truncate mt-0.5">
                                    {productDetails}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-zinc-400 truncate font-medium">{product.sku}</span>
                                  <span className="text-sm text-zinc-400">•</span>
                                  <span className={`text-sm font-medium ${stock <= product.minimum_stock ? 'text-amber-600' : 'text-zinc-500'}`}>
                                    Stock: {stock}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-xl">{formatCurrency(product.selling_price)}</div>
                                <div className="text-base font-bold mt-0.5">
                                  {isOutOfStock ? (
                                    <span className="text-red-500 font-bold">Out of Stock</span>
                                  ) : cartItem ? (
                                    <span className="text-emerald-600 font-bold">{cartItem.quantity} in cart</span>
                                  ) : (
                                    <span className="text-zinc-500 font-bold">Add to Cart</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT: Cart */}
                <div className="flex flex-col border border-zinc-200 rounded-2xl bg-zinc-50 overflow-hidden min-w-0 h-full">
                  <div className="border-b border-zinc-200 p-5 shrink-0 bg-white">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-bold uppercase text-zinc-400">Shopping Cart</div>
                        <div className="text-2xl font-black truncate">
                          {totalCartItems} units • {cart.length} items
                        </div>
                      </div>
                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCart}
                          className="min-h-12 px-5 text-base font-bold text-red-600 hover:text-red-800 active:scale-95 transition shrink-0 tap-target"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-5 space-y-4 overflow-y-auto overflow-x-hidden gpu-scroll">
                    {/* Cart Items */}
                    <div className="space-y-3">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                          <div className="text-6xl mb-4">🛒</div>
                          <p className="text-xl text-zinc-500 font-bold">Your cart is empty</p>
                          <p className="text-base text-zinc-400 mt-1">Add products to start a sale</p>
                        </div>
                      ) : (
                        cart.map((item) => {
                          const stock = getStock(item.product.id);
                          const productDetails = [item.product.brand, item.product.version, item.product.flavor]
                            .filter(Boolean)
                            .join(" • ");

                          return (
                            <div key={item.product.id} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm hover:shadow-md transition">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-lg truncate">{item.product.name}</div>
                                  {productDetails && (
                                    <div className="text-sm text-zinc-500 truncate mt-0.5">{productDetails}</div>
                                  )}
                                  <div className="text-sm text-zinc-400 truncate font-medium">{item.product.sku}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="min-h-12 min-w-12 text-2xl font-bold text-red-500 hover:text-red-700 flex items-center justify-center rounded-lg active:scale-90 transition shrink-0 tap-target"
                                  aria-label={`Remove ${item.product.name} from cart`}
                                >
                                  ×
                                </button>
                              </div>
                              <div className="flex justify-between items-center mt-4 gap-3">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, item.quantity - 1)}
                                    className="min-h-12 min-w-12 rounded-xl border border-zinc-200 flex items-center justify-center text-2xl font-bold hover:bg-zinc-50 active:scale-90 transition tap-target"
                                    aria-label="Decrease quantity"
                                  >
                                    −
                                  </button>
                                  <span className="w-12 text-center font-bold text-xl">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, item.quantity + 1)}
                                    disabled={item.quantity >= stock}
                                    className="min-h-12 min-w-12 rounded-xl border border-zinc-200 flex items-center justify-center text-2xl font-bold hover:bg-zinc-50 active:scale-90 disabled:opacity-30 transition tap-target"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="font-bold text-xl shrink-0">
                                  {formatCurrency(item.product.selling_price * item.quantity)}
                                </div>
                              </div>
                              {stock > 0 && stock <= item.product.minimum_stock && (
                                <div className="mt-2 text-sm text-amber-600 font-bold">
                                  ⚠️ Low stock: {stock} remaining
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Sale Details */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-sm font-bold uppercase text-zinc-400 block mb-2">Sale Date</label>
                        <input
                          type="datetime-local"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                          style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold uppercase text-zinc-400 block mb-2">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {['CASH', 'GCASH', 'MAYA'].map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method as PaymentMethod)}
                              aria-pressed={paymentMethod === method}
                              className={`min-h-14 rounded-xl border-2 p-3 text-center font-bold transition text-base ${paymentMethod === method
                                ? "border-black bg-black text-white"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                                } active:scale-95 tap-target`}
                            >
                              <span className="block text-2xl" aria-hidden="true">
                                {method === 'CASH' ? '💵' : method === 'GCASH' ? '📱' : '🏦'}
                              </span>
                              <span className="text-sm">{method}</span>
                            </button>
                          ))}
                        </div>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu font-bold"
                          style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m} className="font-bold">{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold uppercase text-zinc-400 block mb-2">Discount</label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {[0, 50, 100, 200].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setDiscount(String(amt))}
                              aria-pressed={Number(discount) === amt}
                              className={`min-h-12 px-5 py-2.5 text-base rounded-xl border font-bold ${Number(discount) === amt ? 'bg-black text-white border-black' : 'border-zinc-200 bg-white'
                                } active:scale-95 transition tap-target`}
                            >
                              ₱{amt}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                          placeholder="Enter discount amount"
                          style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                        />
                      </div>

                      {/* Totals */}
                      <div className="pt-4 border-t border-zinc-200 space-y-2.5 bg-white rounded-xl p-5">
                        <div className="flex justify-between text-lg">
                          <span className="text-zinc-500 font-medium">Subtotal</span>
                          <span className="font-bold">{formatCurrency(cartSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="text-zinc-500 font-medium">Discount</span>
                          <span className="font-bold text-red-600">-{formatCurrency(discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-3xl font-black pt-3 border-t border-zinc-200">
                          <span>Total</span>
                          <span className="text-emerald-700">{formatCurrency(cartTotal)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid gap-3 pt-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (cart.length > 0 && !submitting && !isSubmittingRef.current) {
                              setShowConfirmSaleModal(true);
                            }
                          }}
                          disabled={cart.length === 0 || submitting || isSubmittingRef.current}
                          size="lg"
                          className="w-full"
                        >
                          {submitting || isSubmittingRef.current ? (
                            <span className="flex items-center justify-center gap-3">
                              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              <span>✅ Complete Sale</span>
                              <span className="text-base font-medium bg-white/20 px-3 py-1 rounded-full">
                                {formatCurrency(cartTotal)}
                              </span>
                            </span>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={closeForm}
                          disabled={submitting}
                          variant="secondary"
                          size="lg"
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          SALES PAGE CONTENT - Only shown when form is NOT open
          ============================================================ */}
      {!showForm && (
        <div className="h-full flex flex-col overflow-x-hidden min-h-0">
          <PageHeader
            label="Sales"
            title="Sales"
            description="Record sales and track your transaction history."
            actions={
              <>
                <Button onClick={openNewSale} size="md">
                  + New Sale
                </Button>
                <Button
                  onClick={handleRefresh}
                  disabled={loading || loadingSales || isRefreshing}
                  variant="secondary"
                  size="md"
                >
                  {isRefreshing ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "⟳ Refresh"
                  )}
                </Button>
              </>
            }
          />

          {error && !showForm && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-xl font-medium text-red-700 mb-4 shrink-0 animate-fade-in overflow-hidden">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 shrink-0 animate-fade-in-up">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 active:scale-[0.98] tap-target">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Sales Today</p>
              <p className="mt-3 text-5xl font-black text-zinc-950 number-transition">{formatCurrency(todaySales)}</p>
              <p className="mt-2 text-xl text-zinc-400">Today's revenue</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 active:scale-[0.98] tap-target">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Total Sales</p>
              <p className="mt-3 text-5xl font-black text-zinc-950 number-transition">{formatCurrency(totalSales)}</p>
              <p className="mt-2 text-xl text-zinc-400">All time revenue</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 active:scale-[0.98] tap-target">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
              <p className="mt-3 text-5xl font-black text-zinc-950 number-transition">{transactionCount}</p>
              <p className="mt-2 text-xl text-zinc-400">Total sales</p>
            </div>
          </div>

          {/* Recent Sales */}
          <section className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
            <div className="shrink-0 flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
                <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Recent Sales</h2>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={loadSales}
                  disabled={loadingSales}
                  className="min-h-12 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 tap-target"
                >
                  {loadingSales ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "Refresh"
                  )}
                </button>
                <Link
                  to="/sales/history"
                  className="min-h-12 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 tap-target"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm gpu-scroll overflow-x-hidden">
              {loadingSales ? (
                <div className="flex items-center justify-center p-12">
                  <div className="relative">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200">
                      <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-lg text-zinc-500 font-bold">Loading sales...</p>
                  </div>
                </div>
              ) : recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-700 shadow-lg">
                    <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-white">
                      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-3xl font-black text-zinc-950">No sales yet</h3>
                  <p className="mt-2 text-lg text-zinc-500 font-bold">Create your first sale above.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {recentSales.map((sale) => (
                    <Link
                      key={sale.id}
                      to={`/sales/${sale.id}`}
                      className="flex items-center justify-between p-7 transition hover:bg-zinc-50 active:bg-zinc-100 gap-3 tap-target"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-mono text-xl font-black text-zinc-950 truncate">
                              {getSaleReference(sale)}
                            </p>
                            <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-base font-black text-zinc-700 shrink-0">
                              {sale.payment_method}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-lg text-zinc-400">
                            <span>{formatDate(sale.sale_date)}</span>
                            <span>•</span>
                            <span className="font-medium">
                              {getItemCount(sale)} {getItemCount(sale) === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-black text-zinc-950 number-transition">
                          {formatCurrency(Number(sale.total))}
                        </p>
                        <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                          Completed
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full animate-scale-in">
            <h3 className="text-2xl font-black">Clear Cart?</h3>
            <p className="text-lg text-zinc-500 mt-2 font-bold">Remove all items?</p>
            <div className="flex gap-3 mt-6 justify-end">
              <Button
                onClick={() => setShowClearCartModal(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmClearCart}
                variant="danger"
                size="md"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sale Modal */}
      {showConfirmSaleModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <h3 className="text-2xl font-black">Review Order</h3>
            <p className="text-base text-zinc-500 mt-1 font-bold">Please review the items before confirming.</p>
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between border-b border-zinc-100 py-3 gap-3">
                  <span className="text-lg font-medium truncate">{item.product.name} × {item.quantity}</span>
                  <span className="font-bold text-lg shrink-0">{formatCurrency(item.product.selling_price * item.quantity)}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-zinc-200 space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="text-zinc-500 font-medium">Subtotal</span>
                  <span className="font-bold">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-zinc-500 font-medium">Discount</span>
                  <span className="font-bold text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black pt-2 border-t border-zinc-200">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-base text-zinc-500">
                  <span className="font-medium">Payment</span>
                  <span className="font-bold text-zinc-700">{paymentMethod}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button
                onClick={() => setShowConfirmSaleModal(false)}
                variant="secondary"
                size="md"
              >
                Back
              </Button>
              <Button
                onClick={confirmCompleteSale}
                disabled={submitting || isSubmittingRef.current}
                size="md"
              >
                {submitting || isSubmittingRef.current ? "Processing..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-start justify-between">
              <h3 className="text-2xl font-black">Receipt</h3>
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="text-2xl text-zinc-400 hover:text-zinc-600 tap-target font-bold"
                aria-label="Close receipt"
              >
                ×
              </button>
            </div>
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <div className="font-mono text-base space-y-2">
                <div className="break-all"><span className="font-bold">Reference:</span> {getSaleReference(receiptSale)}</div>
                <div><span className="font-bold">Date:</span> {formatReceiptDate(receiptSale.sale_date)}</div>
                <div><span className="font-bold">Payment:</span> {receiptSale.payment_method}</div>
                <div className="border-t border-zinc-200 my-3"></div>
                {receiptSale.items?.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 gap-3">
                    <span className="truncate font-medium">{item.product_name} × {item.quantity}</span>
                    <span className="shrink-0 font-bold">{receiptMoney(item.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 my-3"></div>
                <div className="flex justify-between"><span className="font-medium">Subtotal</span><span className="font-bold">{receiptMoney(receiptSale.subtotal)}</span></div>
                <div className="flex justify-between"><span className="font-medium">Discount</span><span className="font-bold text-red-600">-{receiptMoney(receiptSale.discount)}</span></div>
                <div className="flex justify-between text-2xl font-black pt-2 border-t border-zinc-200">
                  <span>Total</span>
                  <span>{receiptMoney(receiptSale.total)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => printReceipt(receiptSale)}
                size="md"
                className="flex-1"
              >
                🖨️ Print
              </Button>
              <Button
                onClick={() => setReceiptSale(null)}
                variant="secondary"
                size="md"
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
