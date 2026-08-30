import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button, EmptyState, PageHeader, Tooltip, Toast } from "../components/ui";

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
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-6 w-48 rounded bg-zinc-200 animate-shimmer" />
              <div className="mt-1.5 h-5 w-56 rounded bg-zinc-200 animate-shimmer" />
            </div>
            <div className="flex items-center gap-6">
              <div className="h-6 w-24 rounded bg-zinc-200 animate-shimmer" />
              <div className="h-6 w-20 rounded bg-zinc-200 animate-shimmer" />
              <div className="h-6 w-16 rounded bg-zinc-200 animate-shimmer" />
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-200 animate-shimmer" />
                <div className="h-10 w-10 rounded-full bg-zinc-200 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

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
      const response = await fetch(`${API_URL}/api/products/archived`);
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
    resetForm();
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setError("");
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
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
    resetForm();
    setError("");
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

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

    if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
      setError("Cost price must be zero or greater.");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
      setError("Selling price must be zero or greater.");
      setSubmitting(false);
      return;
    }

    if (!Number.isInteger(parsedMinimumStock) || parsedMinimumStock < 0) {
      setError("Minimum stock must be a whole number zero or greater.");
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

      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const wasEditing = Boolean(editingProduct);

      setShowForm(false);
      resetForm();

      setToast({
        message: wasEditing
          ? "Product updated successfully."
          : "Product added successfully.",
        type: "success",
      });

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

  async function uploadProductsCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    setUploadingCsv(true);
    setError("");
    setToast(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/products/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result: ImportResult = await response.json();

      setToast({
        message: result.message || `${result.imported} products imported successfully.`,
        type: "success",
      });

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
    setProductToArchive(product);
  }

  function closeArchiveModal() {
    if (archiving) return;
    setProductToArchive(null);
  }

  async function archiveProduct() {
    if (!productToArchive) return;

    setArchiving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/products/${productToArchive.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setProductToArchive(null);
      setToast({
        message: `${productToArchive.name} archived successfully.`,
        type: "success",
      });
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
    setProductToRestore(product);
  }

  function closeRestoreModal() {
    if (restoring) return;
    setProductToRestore(null);
  }

  async function restoreProduct() {
    if (!productToRestore) return;

    setRestoring(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/products/${productToRestore.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: productToRestore.sku,
            name: productToRestore.name,
            brand: productToRestore.brand || undefined,
            version: productToRestore.version || undefined,
            flavor: productToRestore.flavor || undefined,
            cost_price: productToRestore.cost_price,
            selling_price: productToRestore.selling_price,
            minimum_stock: productToRestore.minimum_stock,
            active: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setProductToRestore(null);
      setToast({
        message: `${productToRestore.name} restored successfully.`,
        type: "success",
      });
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

    setViewMode(mode);
    setSearch("");
    setError("");

    if (mode === "archived") {
      loadArchivedProducts();
    } else {
      loadProducts();
    }
  }

  const displayedProducts =
    viewMode === "active"
      ? filteredProducts
      : filteredArchivedProducts;

  const isLoading =
    viewMode === "active"
      ? loading
      : loadingArchived;

  function calculateMargin(cost: number, selling: number) {
    if (selling === 0) return 0;
    return ((selling - cost) / selling) * 100;
  }

  return (
    <>
      <Helmet>
        <title>Products - Vape Inventory</title>
        <meta name="description" content="Manage your product catalog" />
      </Helmet>

      <div className="h-full flex flex-col min-h-0 overflow-x-hidden">
        <PageHeader
          label="Inventory"
          title="Products"
          description="Manage your product catalog."
          actions={
            viewMode === "active" && (
              <div className="flex flex-wrap gap-3 items-center">
                {/* Left side: Secondary actions */}
                <div className="flex gap-3">
                  <label
                    className={`touch-feedback inline-flex min-h-13 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-lg font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target ${uploadingCsv ? "pointer-events-none opacity-50" : ""
                      }`}
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploadingCsv ? "Uploading..." : "Import"}
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
                    onClick={downloadCsvTemplate}
                    className="touch-feedback inline-flex min-h-13 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 text-lg font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Template
                  </button>
                </div>

                {/* Right side: Primary actions with Refresh always rightmost */}
                <div className="flex gap-3">
                  <Button
                    onClick={openAddForm}
                    disabled={uploadingCsv}
                    size="md"
                  >
                    + New Product
                  </Button>

                  <Button
                    onClick={handleRefresh}
                    disabled={loading || loadingArchived || isRefreshing}
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
                </div>
              </div>
            )
          }
        />

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}

        {/* Error */}
        {error && !showForm && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-xl font-medium text-red-700 mb-4 shrink-0 animate-fade-in">
            {error}
          </div>
        )}

        {/* View Tabs */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm mb-6 shrink-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-3 relative">
            <div
              className={`absolute top-3 bottom-3 w-[calc(50%-6px)] rounded-xl bg-black transition-all duration-300 ease-in-out ${viewMode === "active" ? "left-3" : "left-[calc(50%+3px)]"
                }`}
            />

            <button
              type="button"
              onClick={() => changeView("active")}
              aria-pressed={viewMode === "active"}
              className={`touch-feedback relative z-10 rounded-xl px-5 py-4 text-xl font-bold transition-all duration-200 ${viewMode === "active"
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95"
                }`}
            >
              <span>Active</span>
              <span
                className={`ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-lg transition-all duration-300 ${viewMode === "active"
                  ? "bg-white/15 text-white"
                  : "bg-zinc-100 text-zinc-500"
                  }`}
              >
                {products.length}
                {viewMode === "active" && (
                  <span className="text-xs opacity-70">items</span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => changeView("archived")}
              aria-pressed={viewMode === "archived"}
              className={`touch-feedback relative z-10 rounded-xl px-5 py-4 text-xl font-bold transition-all duration-200 ${viewMode === "archived"
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95"
                }`}
            >
              <span>Archived</span>
              <span
                className={`ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-lg transition-all duration-300 ${viewMode === "archived"
                  ? "bg-white/15 text-white"
                  : "bg-zinc-100 text-zinc-500"
                  }`}
              >
                {archivedProducts.length}
                {viewMode === "archived" && (
                  <span className="text-xs opacity-70">items</span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm mb-6 shrink-0 transition-all duration-200 hover:shadow-md hover:border-zinc-300 card-hover">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-500">
                {viewMode === "active"
                  ? "Product Catalog"
                  : "Archived Products"}
              </p>
              <p className="mt-0.5 text-xl font-black text-zinc-950">
                {displayedProducts.length}{" "}
                <span className="font-normal text-zinc-400">
                  of {viewMode === "active" ? products.length : archivedProducts.length}{" "}
                  {viewMode === "active"
                    ? "products"
                    : "archived"}
                </span>
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <svg className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-zinc-300 bg-white pl-14 pr-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                aria-label="Search products"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="touch-feedback absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-zinc-100 active:scale-90 tap-target"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm gpu-scroll">
            {isLoading ? (
              <ProductsSkeleton />
            ) : displayedProducts.length === 0 ? (
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-white">
                    <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                }
                title={viewMode === "active" ? "No products found" : "No archived products"}
                description={
                  search.trim()
                    ? "No products match your search."
                    : viewMode === "active"
                      ? "Add your first product to get started."
                      : "Archived products will appear here."
                }
                action={
                  search.trim()
                    ? { label: "Clear Search", onClick: () => setSearch("") }
                    : viewMode === "active"
                      ? { label: "+ Add Product", onClick: openAddForm }
                      : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-left">
                  <thead className="border-b border-zinc-200 bg-zinc-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-5 text-lg font-bold uppercase tracking-wider text-zinc-500">
                        Product
                      </th>
                      <th className="px-6 py-5 text-right text-lg font-bold uppercase tracking-wider text-zinc-500">
                        Price
                      </th>
                      <th className="px-6 py-5 text-right text-lg font-bold uppercase tracking-wider text-zinc-500">
                        Margin
                      </th>
                      <th className="px-6 py-5 text-center text-lg font-bold uppercase tracking-wider text-zinc-500">
                        Min Stock
                      </th>
                      <th className="px-6 py-5 text-right text-lg font-bold uppercase tracking-wider text-zinc-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.map((product) => {
                      const margin = calculateMargin(product.cost_price, product.selling_price);
                      const details = [product.brand, product.version, product.flavor].filter(Boolean).join(" • ");

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-5">
                            <div className="min-w-0">
                              <p className="text-xl font-black text-zinc-950 truncate">
                                {product.name}
                              </p>
                              <p className="mt-0.5 font-mono text-base font-medium text-zinc-400">
                                SKU: {product.sku}
                              </p>
                              {details && (
                                <p className="mt-0.5 text-base text-zinc-500 truncate">
                                  {details}
                                </p>
                              )}
                              {product.version && (
                                <span className="mt-1 inline-block rounded bg-zinc-100 px-2.5 py-0.5 text-xs font-bold uppercase text-zinc-700">
                                  {product.version}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-lg font-bold text-zinc-950">
                              {formatCurrency(product.selling_price)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`text-lg font-bold ${margin >= 30 ? 'text-emerald-600' :
                                margin >= 15 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                {margin.toFixed(0)}%
                              </span>
                              <div className="w-16 h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${margin >= 30 ? 'bg-emerald-500' :
                                    margin >= 15 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${Math.min(margin, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-lg font-bold text-zinc-700">
                              {product.minimum_stock}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-1">
                              {viewMode === "active" ? (
                                <>
                                  <Tooltip text="Edit product" position="top">
                                    <button
                                      type="button"
                                      onClick={() => openEditForm(product)}
                                      className="min-h-12 min-w-12 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 active:scale-95 transition tap-target"
                                      aria-label="Edit product"
                                    >
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                  <Tooltip text="Archive product" position="top">
                                    <button
                                      type="button"
                                      onClick={() => openArchiveModal(product)}
                                      className="min-h-12 min-w-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition tap-target"
                                      aria-label="Archive product"
                                    >
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                </>
                              ) : (
                                <Tooltip text="Restore product" position="top">
                                  <button
                                    type="button"
                                    onClick={() => openRestoreModal(product)}
                                    className="min-h-12 min-w-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 active:scale-95 transition tap-target"
                                    aria-label="Restore product"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7l-4 4-4-4" />
                                    </svg>
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer with count */}
          {!isLoading && displayedProducts.length > 0 && (
            <div className="shrink-0 flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-4 mt-4 rounded-2xl shadow-sm">
              <p className="text-lg text-zinc-500">
                Showing {displayedProducts.length} of{" "}
                {viewMode === "active" ? products.length : archivedProducts.length} products
              </p>
            </div>
          )}
        </div>

        {/* Add/Edit Product Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up gpu">
              {/* Modal Header */}
              <div className="border-b border-zinc-200 p-6 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-500">
                      {editingProduct ? "Edit" : "New"}
                    </p>
                    <h2 className="mt-0.5 text-2xl font-black text-zinc-950">
                      {editingProduct ? "Edit Product" : "Create Product"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="touch-feedback flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-zinc-200 text-2xl text-zinc-500 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target"
                    aria-label="Close form"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-6 gpu-scroll">
                {error && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-5 text-lg font-medium text-red-700 animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">SKU *</label>
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="VAPE-001"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                      style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juice Box"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                      style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Brand</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Cloud Co."
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                      style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Version</label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="V2"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                        style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Flavor</label>
                      <input
                        type="text"
                        value={flavor}
                        onChange={(e) => setFlavor(e.target.value)}
                        placeholder="Strawberry"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                        style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Cost Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="300.00"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 font-mono text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                        style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Selling Price *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        placeholder="500.00"
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 font-mono text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                        style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">Minimum Stock *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={minimumStock}
                      onChange={(e) => setMinimumStock(e.target.value)}
                      placeholder="5"
                      disabled={submitting}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 font-mono text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target disabled:opacity-50"
                      style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="w-full"
                  >
                    {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                  </Button>

                  {editingProduct && (
                    <Button
                      type="button"
                      onClick={() => {
                        closeForm();
                        openArchiveModal(editingProduct);
                      }}
                      variant="danger"
                      size="lg"
                      className="w-full"
                    >
                      Archive Product
                    </Button>
                  )}

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
              </form>
            </div>
          </div>
        )}

        {/* Archive Modal */}
        {productToArchive && (
          <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeArchiveModal();
              }
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-scale-in">
              <div className="p-6">
                <div className="flex items-start gap-5">
                  <div className="flex min-h-13 min-w-13 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-zinc-950">Archive Product?</h2>
                    <p className="mt-1.5 text-xl leading-7 text-zinc-500">
                      This product will be removed from the active catalog. Its historical records will remain intact.
                    </p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xl font-black text-zinc-950">{productToArchive.name}</p>
                  <p className="mt-1.5 font-mono text-lg font-bold text-zinc-500">{productToArchive.sku}</p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:justify-end">
                <Button
                  onClick={closeArchiveModal}
                  disabled={archiving}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={archiveProduct}
                  disabled={archiving}
                  variant="danger"
                  size="md"
                >
                  {archiving ? "Archiving..." : "Archive Product"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Modal */}
        {productToRestore && (
          <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-fade-in backdrop-gpu gpu"
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeRestoreModal();
              }
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-scale-in">
              <div className="p-6">
                <div className="flex items-start gap-5">
                  <div className="flex min-h-13 min-w-13 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-zinc-950">Restore Product?</h2>
                    <p className="mt-1.5 text-xl leading-7 text-zinc-500">
                      This product will be returned to the active product catalog.
                    </p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xl font-black text-zinc-950">{productToRestore.name}</p>
                  <p className="mt-1.5 font-mono text-lg font-bold text-zinc-500">{productToRestore.sku}</p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:justify-end">
                <Button
                  onClick={closeRestoreModal}
                  disabled={restoring}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={restoreProduct}
                  disabled={restoring}
                  variant="primary"
                  size="md"
                >
                  {restoring ? "Restoring..." : "Restore Product"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
