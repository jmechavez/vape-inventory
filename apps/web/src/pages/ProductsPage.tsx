import { useEffect, useMemo, useState, useRef } from "react";

type Product = {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  category_id?: number;
  brand?: string;
  version?: string;
  flavor?: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  active: boolean;
};

type ViewMode = "active" | "archived";

type ImportResult = {
  message: string;
  imported: number;
};

const API_URL = import.meta.env.VITE_API_URL;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

// Download CSV Template
function downloadCsvTemplate() {
  const headers = [
    "sku",
    "barcode",
    "name",
    "category_id",
    "brand",
    "version",
    "flavor",
    "cost_price",
    "selling_price",
    "minimum_stock"
  ];

  const sampleRows = [
    ["VAPE-001", "480000000001", "Juice Box", "", "Cloud Co.", "V2", "Strawberry", "300", "500", "5"],
    ["VAPE-002", "480000000002", "Juice Box", "", "Cloud Co.", "V2", "Mango", "300", "500", "5"],
    ["VAPE-003", "480000000003", "Pod Kit", "", "Vape Brand", "V1", "", "800", "1200", "3"]
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map((row) => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "products_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ProductsSkeleton() {
  return (
    <div className="space-y-3 gpu">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm animate-pulse"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="h-8 w-56 rounded bg-zinc-200 animate-shimmer" />
                <div className="h-6 w-16 rounded bg-zinc-200 animate-shimmer" />
              </div>
              <div className="mt-2 h-5 w-40 rounded bg-zinc-200 animate-shimmer" />
              <div className="mt-3 flex gap-4">
                {[20, 16, 16].map((width, index) => (
                  <div key={index}>
                    <div className="h-4 w-10 rounded bg-zinc-200 animate-shimmer" />
                    <div className={`mt-1 h-5 w-${width} rounded bg-zinc-200 animate-shimmer`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-20 rounded bg-zinc-200 animate-shimmer" />
              <div className="h-11 w-20 rounded bg-zinc-200 animate-shimmer" />
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2">
            <div className="h-4 w-28 rounded bg-zinc-200 animate-shimmer" />
            <div className="h-4 w-16 rounded bg-zinc-200 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ANIMATED COUNTER COMPONENT
// ============================================================
function AnimatedCounter({ value, prefix = '', suffix = '' }: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let frame: number;

    const animate = () => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        return;
      }
      setDisplayValue(Math.floor(current));
      frame = requestAnimationFrame(animate);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, isVisible]);

  const formattedValue = typeof displayValue === 'number'
    ? displayValue.toLocaleString()
    : displayValue;

  return <span ref={ref}>{prefix}{formattedValue}{suffix}</span>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("active");

  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [productToArchive, setProductToArchive] =
    useState<Product | null>(null);

  const [productToRestore, setProductToRestore] =
    useState<Product | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [version, setVersion] = useState("");
  const [flavor, setFlavor] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data: Product[] = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load products.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadArchivedProducts() {
    try {
      setLoadingArchived(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/products/archived`,
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data: Product[] = await response.json();

      setArchivedProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load archived products.",
      );
    } finally {
      setLoadingArchived(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadProducts(), loadArchivedProducts()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }

  useEffect(() => {
    loadProducts();
    loadArchivedProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return [
        product.sku,
        product.name,
        product.brand,
        product.version,
        product.flavor,
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLowerCase().includes(query),
        );
    });
  }, [products, search]);

  const filteredArchivedProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return archivedProducts;
    }

    return archivedProducts.filter((product) => {
      return [
        product.sku,
        product.name,
        product.brand,
        product.version,
        product.flavor,
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLowerCase().includes(query),
        );
    });
  }, [archivedProducts, search]);

  function resetForm() {
    setSku("");
    setName("");
    setBrand("");
    setVersion("");
    setFlavor("");
    setCostPrice("");
    setSellingPrice("");
    setMinimumStock("");
    setEditingProduct(null);
  }

  function openAddForm() {
    setError("");
    setSuccessMessage("");

    resetForm();

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(product: Product) {
    setError("");
    setSuccessMessage("");

    setEditingProduct(product);

    setSku(product.sku);
    setName(product.name);
    setBrand(product.brand || "");
    setVersion(product.version || "");
    setFlavor(product.flavor || "");
    setCostPrice(product.cost_price?.toString() || "");
    setSellingPrice(product.selling_price?.toString() || "");
    setMinimumStock(product.minimum_stock?.toString() || "");

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setShowForm(false);
    resetForm();
    setError("");
  }

  async function saveProduct(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    const trimmedSku = sku.trim();
    const trimmedName = name.trim();

    if (!trimmedSku) {
      setError("SKU is required.");
      setSubmitting(false);
      return;
    }

    if (!trimmedName) {
      setError("Product name is required.");
      setSubmitting(false);
      return;
    }

    const parsedCostPrice = Number(costPrice);
    const parsedSellingPrice = Number(sellingPrice);
    const parsedMinimumStock = Number(minimumStock);

    if (
      !Number.isFinite(parsedCostPrice) ||
      parsedCostPrice < 0
    ) {
      setError("Cost price must be zero or greater.");
      setSubmitting(false);
      return;
    }

    if (
      !Number.isFinite(parsedSellingPrice) ||
      parsedSellingPrice < 0
    ) {
      setError("Selling price must be zero or greater.");
      setSubmitting(false);
      return;
    }

    if (
      !Number.isInteger(parsedMinimumStock) ||
      parsedMinimumStock < 0
    ) {
      setError(
        "Minimum stock must be a whole number zero or greater.",
      );
      setSubmitting(false);
      return;
    }

    const body = {
      sku: trimmedSku,
      name: trimmedName,
      brand: brand.trim() || undefined,
      version: version.trim() || undefined,
      flavor: flavor.trim() || undefined,
      cost_price: parsedCostPrice,
      selling_price: parsedSellingPrice,
      minimum_stock: parsedMinimumStock,
    };

    try {
      const url = editingProduct
        ? `${API_URL}/api/products/${editingProduct.id}`
        : `${API_URL}/api/products`;

      const method = editingProduct
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const wasEditing = Boolean(editingProduct);

      setShowForm(false);
      resetForm();

      setSuccessMessage(
        wasEditing
          ? "Product updated successfully."
          : "Product added successfully.",
      );

      await loadProducts();
      await loadArchivedProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save product.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * CSV IMPORT
   */
  async function uploadProductsCsv(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    // Reset the input so the same CSV can be selected again.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      setError("Please select a CSV file.");
      return;
    }

    setUploadingCsv(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/products/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result: ImportResult =
        await response.json();

      setSuccessMessage(
        result.message ||
        `${result.imported} products imported successfully.`,
      );

      await loadProducts();
      await loadArchivedProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to import products.",
      );
    } finally {
      setUploadingCsv(false);
    }
  }

  function openArchiveModal(product: Product) {
    setError("");
    setSuccessMessage("");

    setProductToArchive(product);
  }

  function closeArchiveModal() {
    if (archiving) {
      return;
    }

    setProductToArchive(null);
  }

  async function archiveProduct() {
    if (!productToArchive) {
      return;
    }

    setArchiving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/products/${productToArchive.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setProductToArchive(null);

      setSuccessMessage(
        `${productToArchive.name} archived successfully.`,
      );

      await loadProducts();
      await loadArchivedProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to archive product.",
      );
    } finally {
      setArchiving(false);
    }
  }

  function openRestoreModal(product: Product) {
    setError("");
    setSuccessMessage("");

    setProductToRestore(product);
  }

  function closeRestoreModal() {
    if (restoring) {
      return;
    }

    setProductToRestore(null);
  }

  async function restoreProduct() {
    if (!productToRestore) {
      return;
    }

    setRestoring(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/products/${productToRestore.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sku: productToRestore.sku,
            name: productToRestore.name,
            brand:
              productToRestore.brand || undefined,
            version:
              productToRestore.version || undefined,
            flavor:
              productToRestore.flavor || undefined,
            cost_price:
              productToRestore.cost_price,
            selling_price:
              productToRestore.selling_price,
            minimum_stock:
              productToRestore.minimum_stock,
            active: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setProductToRestore(null);

      setSuccessMessage(
        `${productToRestore.name} restored successfully.`,
      );

      await loadProducts();
      await loadArchivedProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to restore product.",
      );
    } finally {
      setRestoring(false);
    }
  }

  function changeView(mode: ViewMode) {
    if (mode === viewMode) return;

    setIsTransitioning(true);
    setViewMode(mode);
    setSearch("");
    setError("");
    setSuccessMessage("");

    // Load the data for the new view
    if (mode === "archived") {
      loadArchivedProducts();
    } else {
      loadProducts();
    }

    // End transition after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }

  const displayedProducts =
    viewMode === "active"
      ? filteredProducts
      : filteredArchivedProducts;

  const displayedTotal =
    viewMode === "active"
      ? products.length
      : archivedProducts.length;

  const isLoading =
    viewMode === "active"
      ? loading
      : loadingArchived;

  // Calculate margin percentage
  function calculateMargin(cost: number, selling: number) {
    if (selling === 0) return 0;
    return ((selling - cost) / selling) * 100;
  }

  return (
    <div className="h-full flex flex-col gpu">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Inventory
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
            Products
          </h1>

          <p className="mt-1 text-lg text-zinc-500">
            Manage your product catalog.
          </p>
        </div>

        {viewMode === "active" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || loadingArchived || isRefreshing}
              className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
            >
              {isRefreshing ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Refresh"
              )}
            </button>

            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 h-[44px] text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Template
            </button>

            <label
              className={`inline-flex h-[44px] cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu ${uploadingCsv
                ? "pointer-events-none opacity-50"
                : ""
                }`}
            >
              {uploadingCsv
                ? "Uploading..."
                : "Upload CSV"}

              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={uploadingCsv}
                onChange={uploadProductsCsv}
              />
            </label>

            <button
              type="button"
              onClick={openAddForm}
              disabled={uploadingCsv}
              className="inline-flex h-[44px] items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target touch-feedback gpu"
            >
              + New Product
            </button>
          </div>
        )}
      </header>

      {/* Success */}
      {successMessage && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-base font-medium text-zinc-900 shadow-sm mb-3 shrink-0 animate-fade-in gpu">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-black" />
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && !showForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700 mb-3 shrink-0 animate-fade-in gpu">
          {error}
        </div>
      )}

      {/* View Tabs with Slide Effect */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm mb-4 shrink-0 gpu overflow-hidden">
        <div className="grid grid-cols-2 gap-2 relative">
          {/* Sliding Background Indicator */}
          <div
            className={`absolute top-2 bottom-2 w-[calc(50%-4px)] rounded-xl bg-black transition-all duration-300 ease-in-out gpu ${viewMode === "active" ? "left-2" : "left-[calc(50%+2px)]"
              }`}
          />

          <button
            type="button"
            onClick={() => changeView("active")}
            className={`relative z-10 rounded-xl px-4 py-3 text-base font-bold transition-all duration-200 touch-feedback gpu ${viewMode === "active"
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95"
              }`}
          >
            <span>Active</span>

            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm transition-all duration-300 ${viewMode === "active"
                ? "bg-white/15 text-white"
                : "bg-zinc-100 text-zinc-500"
                }`}
            >
              <AnimatedCounter value={products.length} />
              {viewMode === "active" && (
                <span className="text-[10px] opacity-70">items</span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => changeView("archived")}
            className={`relative z-10 rounded-xl px-4 py-3 text-base font-bold transition-all duration-200 touch-feedback gpu ${viewMode === "archived"
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95"
              }`}
          >
            <span>Archived</span>

            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm transition-all duration-300 ${viewMode === "archived"
                ? "bg-white/15 text-white"
                : "bg-zinc-100 text-zinc-500"
                }`}
            >
              <AnimatedCounter value={archivedProducts.length} />
              {viewMode === "archived" && (
                <span className="text-[10px] opacity-70">items</span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm mb-4 shrink-0 transition-all duration-200 hover:shadow-md hover:border-zinc-300 card-hover gpu">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
              {viewMode === "active"
                ? "Product Catalog"
                : "Archived Products"}
            </p>

            <p className="mt-0.5 text-base font-black text-zinc-950">
              <AnimatedCounter value={displayedProducts.length} />{" "}
              <span className="font-normal text-zinc-400">
                of {displayedTotal}{" "}
                {viewMode === "active"
                  ? "products"
                  : "archived"}
              </span>
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-zinc-300 bg-white pl-11 pr-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-zinc-100 touch-feedback"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products + Form */}
      <div className="flex-1 min-h-0 gap-4 lg:grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_520px]">
        {/* Products List */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 gpu-scroll pr-1 products-scroll">
            {/* Slide Transition Container */}
            <div
              className={`transition-all duration-300 ease-in-out gpu ${isTransitioning
                ? "opacity-0 -translate-x-4 scale-95"
                : "opacity-100 translate-x-0 scale-100"
                }`}
            >
              {isLoading ? (
                <ProductsSkeleton />
              ) : displayedProducts.length === 0 ? (
                <div className="relative rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-12 text-center shadow-sm animate-fade-in-up gpu">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                      <svg viewBox="0 0 24 24" fill="none" className="h-48 w-48 text-zinc-900">
                        <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </div>
                    <div className="relative">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 shadow-lg animate-bounce-slow">
                        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
                          <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </div>
                      <h2 className="mt-5 text-2xl font-black text-zinc-950">
                        {viewMode === "active"
                          ? "No products found"
                          : "No archived products"}
                      </h2>
                      <p className="mt-1 text-base text-zinc-500">
                        {search.trim()
                          ? "No products match your search."
                          : viewMode === "active"
                            ? "Add your first product to get started."
                            : "Archived products will appear here."}
                      </p>

                      {search.trim() ? (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="mt-4 rounded-lg border border-zinc-300 bg-white px-5 py-3 text-base font-bold text-zinc-700 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                        >
                          Clear Search
                        </button>
                      ) : viewMode === "active" ? (
                        <button
                          type="button"
                          onClick={openAddForm}
                          className="mt-4 rounded-xl bg-black px-6 py-3 text-base font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                        >
                          + Add Product
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                displayedProducts.map((product) => {
                  const margin = calculateMargin(product.cost_price, product.selling_price);

                  return (
                    <div
                      key={product.id}
                      className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] card-hover gpu ${viewMode === "archived"
                        ? "border-zinc-200 opacity-90"
                        : "border-zinc-200 hover:border-zinc-400"
                        }`}
                    >
                      <div className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            {/* Product Header */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-lg font-black text-zinc-950">
                                {product.name}
                              </h4>

                              <span className="font-mono text-sm font-bold bg-zinc-100 text-zinc-700 px-3 py-1 rounded border border-zinc-200 whitespace-nowrap flex-shrink-0">
                                {product.sku}
                              </span>

                              {product.version && (
                                <span className="rounded bg-black px-2.5 py-1 text-xs font-bold uppercase text-white flex-shrink-0">
                                  {product.version}
                                </span>
                              )}

                              {/* Status Badge */}
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border flex-shrink-0 ${viewMode === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-zinc-50 text-zinc-500 border-zinc-200"
                                }`}>
                                <span className={`${viewMode === 'active' ? 'animate-pulse' : ''}`}>
                                  {viewMode === 'active' ? '●' : '○'}
                                </span>
                                {viewMode === 'active' ? 'Active' : 'Archived'}
                              </span>
                            </div>

                            <p className="mt-1 text-base text-zinc-500 truncate">
                              {product.brand && ` • ${product.brand}`}
                              {product.flavor && ` • ${product.flavor}`}
                            </p>

                            {/* Stock Level Bar */}
                            <div className="mt-2 max-w-xs">
                              <div className="flex justify-between text-xs text-zinc-400">
                                <span>Stock: {product.minimum_stock}</span>
                                <span>Min: {product.minimum_stock}</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${product.minimum_stock <= 5 ? 'bg-red-500' :
                                    product.minimum_stock <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                  style={{ width: `${Math.min((product.minimum_stock / 20) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
                              <div className="rounded-xl bg-zinc-50 p-2.5 text-center">
                                <p className="text-[10px] font-bold uppercase text-zinc-400">Cost</p>
                                <p className="text-sm font-bold text-zinc-700">{formatCurrency(product.cost_price)}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
                                <p className="text-[10px] font-bold uppercase text-emerald-400">Selling</p>
                                <p className="text-sm font-bold text-emerald-700">{formatCurrency(product.selling_price)}</p>
                              </div>
                              <div className={`rounded-xl p-2.5 text-center ${margin >= 30 ? 'bg-emerald-50' :
                                margin >= 15 ? 'bg-amber-50' : 'bg-red-50'
                                }`}>
                                <p className="text-[10px] font-bold uppercase text-zinc-400">Margin</p>
                                <p className={`text-sm font-bold ${margin >= 30 ? 'text-emerald-700' :
                                  margin >= 15 ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                  {margin.toFixed(0)}%
                                </p>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="mt-3 pt-3 relative">
                              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase text-zinc-400">Min Stock</span>
                                  <span className="text-sm font-bold text-zinc-800">{product.minimum_stock}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block h-2 w-2 rounded-full ${viewMode === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                                  <span className="text-xs font-medium text-zinc-500">
                                    {viewMode === 'active' ? 'Active' : 'Archived'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="shrink-0 flex flex-row sm:flex-col gap-2">
                            {viewMode === "active" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(product)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openArchiveModal(product)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                  Archive
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openRestoreModal(product)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Desktop Form - Hide when in archived view */}
        {viewMode === "active" && (
          <div className="hidden lg:block">
            {showForm ? (
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm h-full flex flex-col animate-slide-up gpu">
                <div className="border-b border-zinc-200 p-5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                        {editingProduct ? "Edit" : "New"}
                      </p>

                      <h2 className="mt-0.5 text-xl font-black text-zinc-950">
                        {editingProduct ? "Edit Product" : "Create Product"}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-5 gpu-scroll">
                  {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700 animate-fade-in gpu">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">SKU *</label>
                      <input
                        type="text"
                        required
                        value={sku}
                        onChange={(event) => setSku(event.target.value)}
                        placeholder="VAPE-001"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Juice Box"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Brand</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(event) => setBrand(event.target.value)}
                        placeholder="Cloud Co."
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Version</label>
                        <input
                          type="text"
                          value={version}
                          onChange={(event) => setVersion(event.target.value)}
                          placeholder="V2"
                          disabled={submitting}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Flavor</label>
                        <input
                          type="text"
                          value={flavor}
                          onChange={(event) => setFlavor(event.target.value)}
                          placeholder="Strawberry"
                          disabled={submitting}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Cost Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={costPrice}
                          onChange={(event) => setCostPrice(event.target.value)}
                          placeholder="300.00"
                          disabled={submitting}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Selling Price *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={sellingPrice}
                          onChange={(event) => setSellingPrice(event.target.value)}
                          placeholder="500.00"
                          disabled={submitting}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Minimum Stock *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        value={minimumStock}
                        onChange={(event) => setMinimumStock(event.target.value)}
                        placeholder="5"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target btn-ripple gpu"
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        e.currentTarget.style.setProperty('--x', x + 'px');
                        e.currentTarget.style.setProperty('--y', y + 'px');
                      }}
                    >
                      {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                    </button>

                    {editingProduct && viewMode === "active" && (
                      <button
                        type="button"
                        onClick={() => openArchiveModal(editingProduct)}
                        className="inline-flex h-[52px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-base font-bold text-red-700 transition hover:bg-red-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                      >
                        Archive Product
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={submitting}
                      className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm h-full flex flex-col items-center justify-center p-10 text-center transition-all duration-200 hover:shadow-md card-hover gpu">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 shadow-lg animate-bounce-slow">
                  <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
                    <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <h3 className="mt-5 text-xl font-black text-zinc-950">Select a Product</h3>
                <p className="mt-2 max-w-xs text-base text-zinc-500">
                  Choose a product from the list to view or edit its details.
                </p>
                <button
                  onClick={openAddForm}
                  className="mt-5 inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                >
                  + Create New Product
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm lg:hidden animate-fade-in backdrop-gpu gpu">
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in gpu">
            <div className="border-b border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {editingProduct ? "Edit" : "New"}
                  </p>
                  <h2 className="mt-0.5 text-xl font-black text-zinc-950">
                    {editingProduct ? "Edit Product" : "Create Product"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={saveProduct} className="max-h-[calc(90vh-120px)] overflow-y-auto p-5 gpu-scroll">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700 animate-fade-in gpu">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                    placeholder="VAPE-001"
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Juice Box"
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Cloud Co."
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(event) => setVersion(event.target.value)}
                      placeholder="V2"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Flavor</label>
                    <input
                      type="text"
                      value={flavor}
                      onChange={(event) => setFlavor(event.target.value)}
                      placeholder="Strawberry"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Cost Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costPrice}
                      onChange={(event) => setCostPrice(event.target.value)}
                      placeholder="300.00"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Selling Price *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={sellingPrice}
                      onChange={(event) => setSellingPrice(event.target.value)}
                      placeholder="500.00"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-base font-bold uppercase tracking-wider text-zinc-400">Minimum Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={minimumStock}
                    onChange={(event) => setMinimumStock(event.target.value)}
                    placeholder="5"
                    disabled={submitting}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target btn-ripple gpu"
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    e.currentTarget.style.setProperty('--x', x + 'px');
                    e.currentTarget.style.setProperty('--y', y + 'px');
                  }}
                >
                  {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>

                {editingProduct && viewMode === "active" && (
                  <button
                    type="button"
                    onClick={() => openArchiveModal(editingProduct)}
                    className="inline-flex h-[52px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-base font-bold text-red-700 transition hover:bg-red-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
                  >
                    Archive Product
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {productToArchive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeArchiveModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-scale-in gpu">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-zinc-950">Archive Product?</h2>
                  <p className="mt-1 text-base leading-6 text-zinc-500">
                    This product will be removed from the active catalog. Its historical records will remain intact.
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-base font-black text-zinc-950">{productToArchive.name}</p>
                <p className="mt-1 font-mono text-sm font-bold text-zinc-500">{productToArchive.sku}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeArchiveModal}
                disabled={archiving}
                className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={archiveProduct}
                disabled={archiving}
                className="inline-flex h-[44px] items-center justify-center rounded-xl bg-red-600 px-5 text-base font-bold text-white transition hover:bg-red-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
              >
                {archiving ? "Archiving..." : "Archive Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {productToRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRestoreModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-scale-in gpu">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-zinc-950">Restore Product?</h2>
                  <p className="mt-1 text-base leading-6 text-zinc-500">
                    This product will be returned to the active product catalog.
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-base font-black text-zinc-950">{productToRestore.name}</p>
                <p className="mt-1 font-mono text-sm font-bold text-zinc-500">{productToRestore.sku}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRestoreModal}
                disabled={restoring}
                className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={restoreProduct}
                disabled={restoring}
                className="inline-flex h-[44px] items-center justify-center rounded-xl bg-black px-5 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
              >
                {restoring ? "Restoring..." : "Restore Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

