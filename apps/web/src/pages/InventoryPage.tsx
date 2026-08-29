import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductPicker from "../components/inventory/ProductPicker";

const API_URL = import.meta.env.VITE_API_URL;

type InventoryItem = {
  product_id: number;
  sku: string;
  name: string;
  brand?: string;
  version?: string;
  flavor?: string;
  current_stock: number;
  minimum_stock: number;
};

type StockMovement = {
  id: number;
  product_id: number;
  supplier_id?: number;
  sku: string;
  product_name: string;
  brand?: string;
  version?: string;
  flavor?: string;
  type: string;
  quantity: number;
  unit_cost?: number;
  reference?: string;
  notes?: string;
  created_at: string;
  movement_date: string;
};

type MovementListResponse = {
  items: StockMovement[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  brand?: string;
  version?: string;
  flavor?: string;
};

type Supplier = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type FormType = "receive" | "return" | "damage" | "adjustment";
type InventoryFilter = "all" | "low" | "out";
type MovementDateSort = "newest" | "oldest";

const MOVEMENT_TYPES = ["RECEIVE", "SALE", "RETURN", "DAMAGE", "ADJUSTMENT"];

const MOVEMENT_FORM_TYPES: { type: FormType; label: string }[] = [
  { type: "receive", label: "Receive" },
  { type: "return", label: "Return" },
  { type: "damage", label: "Damage" },
  { type: "adjustment", label: "Adjustment" },
];

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toRFC3339(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function movementLabel(type: string) {
  switch (type) {
    case "RECEIVE": return "Received";
    case "SALE": return "Sale";
    case "RETURN": return "Return";
    case "DAMAGE": return "Damage";
    case "ADJUSTMENT": return "Adjustment";
    case "LOSS": return "Loss";
    default: return type;
  }
}

function movementClass(type: string) {
  switch (type) {
    case "RECEIVE":
    case "RETURN":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "SALE":
    case "DAMAGE":
    case "LOSS":
      return "bg-red-50 text-red-700 border border-red-200";
    case "ADJUSTMENT":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-zinc-100 text-zinc-700 border border-zinc-200";
  }
}

function stockClass(currentStock: number, minimumStock: number) {
  if (currentStock <= 0) return "text-red-600";
  if (currentStock <= minimumStock) return "text-amber-600";
  return "text-emerald-600";
}

function getInventoryStatus(currentStock: number, minimumStock: number) {
  if (currentStock <= 0) {
    return { label: "Out of stock", className: "bg-red-50 text-red-700 border border-red-200" };
  }
  if (currentStock <= minimumStock) {
    return { label: "Low stock", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  return { label: "In stock", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
}

export default function InventoryPage() {
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [error, setError] = useState("");
  const [activeForm, setActiveForm] = useState<FormType>("receive");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [movementDate, setMovementDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movementDateSort, setMovementDateSort] = useState<MovementDateSort>("newest");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadInventory() {
    try {
      setLoadingInventory(true);
      setError("");
      const response = await fetch(`${API_URL}/api/inventory`);
      if (!response.ok) throw new Error("failed to load inventory");
      const data: InventoryItem[] = await response.json();
      setInventory(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load inventory.");
    } finally {
      setLoadingInventory(false);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      if (!response.ok) throw new Error("failed to load products");
      const data = await response.json();
      if (Array.isArray(data)) setProducts(data);
      else if (Array.isArray(data.items)) setProducts(data.items);
      else setProducts([]);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSuppliers() {
    try {
      const response = await fetch(`${API_URL}/api/suppliers`);
      if (!response.ok) throw new Error("failed to load suppliers");
      const data = await response.json();
      if (Array.isArray(data)) setSuppliers(data);
      else if (Array.isArray(data.items)) setSuppliers(data.items);
      else setSuppliers([]);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  }

  async function loadMovements(requestedPage = page) {
    try {
      setLoadingMovements(true);
      const params = new URLSearchParams();
      params.set("page", String(requestedPage));
      params.set("limit", String(limit));
      if (movementType) params.set("type", movementType);
      const response = await fetch(`${API_URL}/api/inventory/movements?${params.toString()}`);
      if (!response.ok) throw new Error("failed to load movements");
      const data: MovementListResponse = await response.json();
      setMovements(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 0);
    } catch (err) {
      console.error(err);
      setError("Unable to load movement history.");
    } finally {
      setLoadingMovements(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadInventory(), loadProducts(), loadSuppliers()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }

  useEffect(() => {
    loadInventory();
    loadProducts();
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadMovements(page);
  }, [page, movementType]);

  function resetForm() {
    setSelectedProduct("");
    setSelectedSupplier("");
    setQuantity("");
    setUnitCost("");
    setReference("");
    setNotes("");
    setMovementDate(toDateTimeLocalValue(new Date()));
  }

  function selectForm(form: FormType) {
    setActiveForm(form);
    resetForm();
    setError("");
  }

  function openMovementModal() {
    setError("");
    resetForm();
    setActiveForm("receive");
    setShowMovementModal(true);
  }

  function closeMovementModal() {
    if (submitting) return;
    setShowMovementModal(false);
    resetForm();
  }

  function openHistoryModal() {
    setError("");
    setShowHistoryModal(true);
  }

  function closeHistoryModal() {
    setShowHistoryModal(false);
  }

  // Helper to get supplier name from supplier_id
  function getSupplierName(supplierId?: number | null): string {
    if (!supplierId) return "";
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || "";
  }

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }

    const parsedQuantity = Number(quantity);

    // Validate based on form type
    if (activeForm === "adjustment") {
      // For adjustment, allow negative values (loss) or positive (add)
      // but not zero
      if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
        setError("Quantity must be a non-zero number (positive to add, negative to remove/loss).");
        return;
      }
    } else {
      // For other forms, require positive integer
      if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        setError("Quantity must be a positive whole number.");
        return;
      }
    }

    // Check if we're trying to remove more stock than available
    if (parsedQuantity < 0) {
      const product = inventory.find((item) => item.product_id === Number(selectedProduct));
      if (product && Math.abs(parsedQuantity) > product.current_stock) {
        setError(`Cannot remove ${Math.abs(parsedQuantity)} units. Only ${product.current_stock} units available.`);
        return;
      }
    }

    if (activeForm === "receive" && unitCost !== "" && Number(unitCost) < 0) {
      setError("Unit cost cannot be negative.");
      return;
    }

    const productId = Number(selectedProduct);
    let endpoint = "";
    let body: Record<string, unknown> = {
      product_id: productId,
      quantity: parsedQuantity,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    switch (activeForm) {
      case "receive":
        endpoint = "/api/inventory/receive";
        body = {
          ...body,
          supplier_id: selectedSupplier === "" ? undefined : Number(selectedSupplier),
          unit_cost: unitCost === "" ? undefined : Number(unitCost),
          movement_date: toRFC3339(movementDate),
        };
        break;
      case "return":
        endpoint = "/api/inventory/return";
        body = { ...body, movement_date: toRFC3339(movementDate) };
        break;
      case "damage":
        endpoint = "/api/inventory/damage";
        body = { ...body, movement_date: toRFC3339(movementDate) };
        break;
      case "adjustment":
        endpoint = "/api/inventory/adjustment";
        body = { ...body, movement_date: toRFC3339(movementDate) };
        break;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "failed to record inventory movement");
      }
      resetForm();
      await loadInventory();
      setPage(1);
      await loadMovements(1);
      setShowMovementModal(false);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) setError(err.message);
      else setError("Failed to record inventory movement.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleInventoryFilter(filter: InventoryFilter) {
    setInventoryFilter(filter);
  }

  const filteredInventory = inventory.filter((item) => {
    const searchValue = search.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      item.sku.toLowerCase().includes(searchValue) ||
      item.name.toLowerCase().includes(searchValue) ||
      item.brand?.toLowerCase().includes(searchValue) ||
      item.version?.toLowerCase().includes(searchValue) ||
      item.flavor?.toLowerCase().includes(searchValue);
    if (!matchesSearch) return false;
    if (inventoryFilter === "low") {
      return item.current_stock > 0 && item.current_stock <= item.minimum_stock;
    }
    if (inventoryFilter === "out") {
      return item.current_stock <= 0;
    }
    return true;
  });

  const sortedMovements = [...movements].sort((a, b) => {
    const aMovementDate = new Date(a.movement_date || a.created_at).getTime();
    const bMovementDate = new Date(b.movement_date || b.created_at).getTime();
    const aValid = !Number.isNaN(aMovementDate);
    const bValid = !Number.isNaN(bMovementDate);
    if (!aValid && !bValid) return b.id - a.id;
    if (!aValid) return 1;
    if (!bValid) return -1;
    if (aMovementDate === bMovementDate) return b.id - a.id;
    return movementDateSort === "newest" ? bMovementDate - aMovementDate : aMovementDate - bMovementDate;
  });

  // Filter movements by supplier
  const filteredBySupplier = sortedMovements.filter((movement) => {
    if (!selectedSupplierFilter) return true;
    return movement.supplier_id === Number(selectedSupplierFilter);
  });

  const totalProducts = inventory.length;
  const lowStockCount = inventory.filter((item) => item.current_stock > 0 && item.current_stock <= item.minimum_stock).length;
  const outOfStockCount = inventory.filter((item) => item.current_stock <= 0).length;
  const totalUnits = inventory.reduce((sum, item) => sum + item.current_stock, 0);

  return (
    <div className="h-full flex flex-col min-h-0 gpu overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Inventory</p>
          <h1 className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Stock Management</h1>
          <p className="mt-1.5 text-xl text-zinc-500">Monitor and adjust your inventory levels.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openHistoryModal}
            className="inline-flex h-13 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-lg font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
          >
            History
          </button>
          <button
            type="button"
            onClick={openMovementModal}
            className="touch-feedback inline-flex min-h-13 items-center justify-center rounded-xl bg-black px-6 text-lg font-bold text-white shadow-sm transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target"
          >
            + New Movement
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingInventory || isRefreshing}
            className="inline-flex h-13 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-lg font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
          >
            {isRefreshing ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "⟳ Refresh"
            )}
          </button>
        </div>
      </header>

      {/* Error */}
      {error && !showMovementModal && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-lg text-red-700 mb-4 shrink-0 animate-fade-in gpu">
          <div className="flex items-start justify-between gap-4">
            <span>{error}</span>
            <button type="button" className="shrink-0 font-medium underline tap-target" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-5 mb-6 shrink-0 sm:grid-cols-4 animate-fade-in-up">
        <button
          type="button"
          onClick={() => handleInventoryFilter("all")}
          aria-pressed={inventoryFilter === "all"}
          className={`rounded-2xl border bg-white p-8 text-left shadow-sm transition tap-target card-hover gpu ${inventoryFilter === "all"
            ? "border-zinc-300 bg-zinc-50 ring-2 ring-zinc-300"
            : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
        >
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Products</p>
          <p className="mt-2.5 text-4xl font-black text-zinc-950 number-transition">{totalProducts}</p>
          <p className="mt-1.5 text-xl text-zinc-400">Total items</p>
        </button>

        <button
          type="button"
          onClick={() => handleInventoryFilter("all")}
          className="rounded-2xl border border-zinc-200 bg-white p-8 text-left shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 tap-target card-hover gpu"
        >
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Total Units</p>
          <p className="mt-2.5 text-4xl font-black text-zinc-950 number-transition">{totalUnits}</p>
          <p className="mt-1.5 text-xl text-zinc-400">In stock</p>
        </button>

        <button
          type="button"
          onClick={() => handleInventoryFilter("low")}
          aria-pressed={inventoryFilter === "low"}
          className={`rounded-2xl border bg-white p-8 text-left shadow-sm transition tap-target card-hover gpu ${inventoryFilter === "low"
            ? "border-amber-300 bg-amber-50 ring-2 ring-amber-300"
            : "border-zinc-200 hover:border-amber-400 hover:bg-amber-50"
            }`}
        >
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Low Stock</p>
          <p className="mt-2.5 text-4xl font-black text-amber-600 number-transition">{lowStockCount}</p>
          <p className="mt-1.5 text-xl text-amber-600">Below minimum</p>
        </button>

        <button
          type="button"
          onClick={() => handleInventoryFilter("out")}
          aria-pressed={inventoryFilter === "out"}
          className={`rounded-2xl border bg-white p-8 text-left shadow-sm transition tap-target card-hover gpu ${inventoryFilter === "out"
            ? "border-red-300 bg-red-50 ring-2 ring-red-300"
            : "border-zinc-200 hover:border-red-400 hover:bg-red-50"
            }`}
        >
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Out of Stock</p>
          <p className="mt-2.5 text-4xl font-black text-red-600 number-transition">{outOfStockCount}</p>
          <p className="mt-1.5 text-xl text-red-600">Need restock</p>
        </button>
      </div>

      {/* Inventory List */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-zinc-950">Current Inventory</h2>
            {inventoryFilter !== "all" && (
              <button
                type="button"
                onClick={() => setInventoryFilter("all")}
                className="rounded-full bg-zinc-100 px-4 py-1.5 text-lg font-bold text-zinc-700 hover:bg-zinc-200 touch-feedback gpu tap-target"
                aria-label="Clear filter"
              >
                {inventoryFilter === "low" ? "Low Stock" : "Out of Stock"} ×
              </button>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU, product, brand..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target sm:w-80 gpu"
              style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
              aria-label="Search inventory"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-lg font-bold text-zinc-700 transition hover:bg-zinc-100 tap-target touch-feedback gpu"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm gpu-scroll">
          {loadingInventory ? (
            <div className="flex items-center justify-center p-12 gpu">
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 gpu">
                  <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin gpu"></div>
                </div>
                <p className="mt-4 text-lg text-zinc-500">Loading inventory...</p>
              </div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xl font-medium text-zinc-500">
                {search ? "No products match your search." : "No inventory found."}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-4 rounded-lg border border-zinc-300 px-6 py-3 text-lg font-bold text-zinc-700 hover:bg-zinc-100 tap-target touch-feedback gpu">
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredInventory.map((item) => {
                const status = getInventoryStatus(item.current_stock, item.minimum_stock);
                return (
                  <div key={item.product_id} className="flex items-center justify-between p-6 hover:bg-zinc-50 card-hover gpu min-h-22">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-4">
                        <h4 className="truncate text-xl font-black text-zinc-950">{item.name}</h4>
                        {item.version && (
                          <span className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-bold uppercase text-zinc-700">
                            {item.version}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-lg text-zinc-500">
                        {item.sku}
                        {item.flavor && ` • ${item.flavor}`}
                        {item.brand && ` • ${item.brand}`}
                      </p>
                      <div className="mt-2.5 flex items-center gap-5">
                        <span className={`text-2xl font-bold ${stockClass(item.current_stock, item.minimum_stock)} number-transition`}>
                          {item.current_stock} units
                        </span>
                        <span className={`rounded-full px-4 py-1.5 text-lg font-medium ${status.className} status-badge ${status.label === "In stock" ? "status-in-stock" :
                          status.label === "Low stock" ? "status-low-stock" :
                            "status-out-of-stock"
                          }`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg text-zinc-400">Min: {item.minimum_stock}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Movement Modal */}
      {showMovementModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMovementModal();
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col animate-slide-up gpu">
            {/* Header */}
            <div className="border-b border-zinc-200 p-8 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-500">Inventory</p>
                  <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Record Stock Movement</h2>
                </div>
                <button
                  type="button"
                  onClick={closeMovementModal}
                  disabled={submitting}
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 text-2xl text-zinc-500 hover:bg-zinc-100 touch-feedback gpu tap-target"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form Tabs */}
            <div className="flex flex-wrap gap-3 border-b border-zinc-200 px-8 py-4 shrink-0">
              {MOVEMENT_FORM_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectForm(type)}
                  disabled={submitting}
                  aria-pressed={activeForm === type}
                  className={`rounded-xl px-6 py-3 text-lg font-bold transition tap-target touch-feedback gpu ${activeForm === type
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="mx-8 mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-lg font-medium text-red-700 shrink-0 animate-fade-in gpu">
                {error}
              </div>
            )}

            <form onSubmit={submitMovement} className="flex-1 overflow-y-auto p-8 gpu-scroll">
              <div className="space-y-6">
                <div>
                  <ProductPicker
                    products={products}
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                  />
                </div>

                {activeForm === "receive" && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <label className="block text-lg font-bold uppercase tracking-wider text-zinc-400">Supplier</label>
                      <button
                        type="button"
                        onClick={() => navigate("/suppliers")}
                        disabled={submitting}
                        className="text-lg font-medium text-zinc-600 underline transition hover:text-zinc-900 touch-feedback gpu tap-target"
                      >
                        + Manage
                      </button>
                    </div>
                    <select
                      value={selectedSupplier}
                      onChange={(event) => setSelectedSupplier(event.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {suppliers.length === 0 && (
                      <p className="mt-1.5 text-lg text-zinc-500">
                        No suppliers available.{" "}
                        <button
                          type="button"
                          onClick={() => navigate("/suppliers")}
                          className="font-medium underline hover:text-zinc-900 touch-feedback gpu tap-target"
                        >
                          Add a supplier
                        </button>
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-400">
                    Quantity {activeForm === "adjustment" ? "(positive to add, negative to remove/loss)" : "*"}
                  </label>
                  <input
                    type="number"
                    min={activeForm === "adjustment" ? undefined : "1"}
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={activeForm === "adjustment" ? "-5, +10" : "0"}
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                  />
                  {activeForm === "adjustment" && (
                    <p className="mt-1.5 text-lg text-zinc-400">
                      Enter a <strong>positive</strong> number to add stock, or a <strong>negative</strong> number to remove/loss stock.
                    </p>
                  )}
                </div>

                {activeForm === "receive" && (
                  <div>
                    <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-400">Unit Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(event) => setUnitCost(event.target.value)}
                      placeholder="0.00"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 font-mono text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                      style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-400">Movement Date</label>
                  <input
                    type="datetime-local"
                    value={movementDate}
                    onChange={(event) => setMovementDate(event.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                  />
                  <p className="mt-1.5 text-lg text-zinc-400">Leave blank to use current time</p>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-400">Reference</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="PO number, invoice number, etc."
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-400">Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes..."
                    disabled={submitting}
                    className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                  />
                </div>

                {activeForm === "receive" && selectedSupplier && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 animate-fade-in gpu">
                    <p className="text-lg font-medium text-blue-800">
                      Receiving from: <span className="font-bold">{getSupplierName(Number(selectedSupplier))}</span>
                    </p>
                    {unitCost && (
                      <p className="text-lg text-blue-700 mt-1.5">
                        Unit Cost: {formatCurrency(Number(unitCost))}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-14 items-center justify-center rounded-xl bg-black px-8 text-xl font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target btn-ripple gpu"
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    e.currentTarget.style.setProperty('--x', x + 'px');
                    e.currentTarget.style.setProperty('--y', y + 'px');
                  }}
                >
                  {submitting ? "Recording..." : `Record ${movementLabel(activeForm.toUpperCase())}`}
                </button>
                <button
                  type="button"
                  onClick={closeMovementModal}
                  disabled={submitting}
                  className="inline-flex h-14 items-center justify-center rounded-xl border border-zinc-300 bg-white px-8 text-xl font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeHistoryModal();
          }}
        >
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col animate-slide-up gpu">
            {/* Header */}
            <div className="border-b border-zinc-200 p-8 shrink-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-500">Inventory</p>
                  <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Movement History</h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setMovementDateSort((current) =>
                        current === "newest" ? "oldest" : "newest"
                      )
                    }
                    className="inline-flex items-center gap-3 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-lg font-bold text-zinc-700 transition hover:bg-zinc-100 tap-target touch-feedback gpu"
                  >
                    <span>Sort: {movementDateSort === "newest" ? "Newest" : "Oldest"}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={[
                        "h-5 w-5 transition-transform duration-200",
                        movementDateSort === "oldest" ? "rotate-180" : "",
                      ].join(" ")}
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <select
                    value={movementType}
                    onChange={(event) => {
                      setMovementType(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    aria-label="Filter by movement type"
                  >
                    <option value="">All movements</option>
                    {MOVEMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {movementLabel(type)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSupplierFilter}
                    onChange={(event) => {
                      setSelectedSupplierFilter(event.target.value);
                    }}
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-lg outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                    aria-label="Filter by supplier"
                  >
                    <option value="">All suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={closeHistoryModal}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 text-2xl text-zinc-500 hover:bg-zinc-100 touch-feedback gpu tap-target"
                    aria-label="Close history"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="border-b border-zinc-200 px-8 py-4 shrink-0 bg-zinc-50">
              <div className="flex flex-wrap gap-6 text-lg">
                <span className="font-medium text-zinc-700">
                  Total Movements: {movements.length}
                </span>
                <span className="font-medium text-emerald-600">
                  Received: {movements.filter(m => m.type === "RECEIVE").length}
                </span>
                <span className="font-medium text-red-600">
                  Damaged: {movements.filter(m => m.type === "DAMAGE").length}
                </span>
                <span className="font-medium text-amber-600">
                  Adjustments: {movements.filter(m => m.type === "ADJUSTMENT").length}
                </span>
                {selectedSupplierFilter && (
                  <span className="font-medium text-blue-600">
                    Filtered by: {getSupplierName(Number(selectedSupplierFilter))}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto gpu-scroll">
              {loadingMovements ? (
                <div className="flex items-center justify-center p-12 gpu">
                  <div className="relative">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 gpu">
                      <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin gpu"></div>
                    </div>
                    <p className="mt-4 text-lg text-zinc-500">Loading movements...</p>
                  </div>
                </div>
              ) : filteredBySupplier.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-xl font-medium text-zinc-700">No movements found.</p>
                  <p className="mt-1.5 text-lg text-zinc-500">Try changing the movement or supplier filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredBySupplier.map((movement) => {
                    const incoming = movement.type === "RECEIVE" || movement.type === "RETURN";
                    const positiveAdjustment = movement.type === "ADJUSTMENT" && movement.quantity > 0;
                    const quantityText =
                      incoming || positiveAdjustment
                        ? `+${movement.quantity}`
                        : `-${Math.abs(movement.quantity)}`;

                    const supplierName = getSupplierName(movement.supplier_id);
                    const hasSupplier = !!supplierName;
                    const hasUnitCost = movement.unit_cost !== undefined && movement.unit_cost !== null;

                    return (
                      <div key={movement.id} className="flex items-center justify-between p-6 hover:bg-zinc-50 card-hover gpu min-h-22">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`rounded-full px-4 py-1.5 text-lg font-medium ${movementClass(movement.type)}`}>
                              {movementLabel(movement.type)}
                            </span>
                            <h4 className="truncate text-xl font-black text-zinc-950">{movement.product_name}</h4>
                            {movement.version && (
                              <span className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-bold uppercase text-zinc-700">
                                {movement.version}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-lg text-zinc-500">
                            {movement.sku}
                            {movement.flavor && ` • ${movement.flavor}`}
                            {movement.brand && ` • ${movement.brand}`}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-5 text-lg text-zinc-400">
                            <span>{formatDateTime(movement.movement_date)}</span>
                            {movement.reference && <span>Ref: {movement.reference}</span>}
                            {hasSupplier && (
                              <span className="text-amber-600 font-medium flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {supplierName}
                              </span>
                            )}
                            {hasUnitCost && (
                              <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatCurrency(movement.unit_cost)}/unit
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-xl font-bold ${incoming || positiveAdjustment ? "text-emerald-600" : "text-red-600"}`}>
                            {quantityText}
                          </p>
                          {hasUnitCost && (
                            <p className="text-lg font-medium text-zinc-600">
                              Total: {formatCurrency((movement.unit_cost || 0) * Math.abs(movement.quantity))}
                            </p>
                          )}
                          {movement.notes && (
                            <p className="mt-0.5 text-lg text-zinc-400 max-w-45 truncate">{movement.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loadingMovements && filteredBySupplier.length > 0 && (
              <div className="border-t border-zinc-200 p-6 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg text-zinc-500">
                  {total === 0 ? "No results" : `Page ${page} of ${totalPages} · ${filteredBySupplier.length} movements shown`}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:scale-[1.02] active:scale-95 disabled:opacity-30 tap-target touch-feedback gpu"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:scale-[1.02] active:scale-95 disabled:opacity-30 tap-target touch-feedback gpu"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
