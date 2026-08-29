import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: number;
  sku: string;
  name: string;
  brand?: string;
  version?: string;
  flavor?: string;
};

type ProductPickerProps = {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function ProductPicker({
  products,
  value,
  onChange,
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          String(product.id) === value,
      ),
    [products, value],
  );

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return products.slice(0, 50);
    }

    return products
      .filter((product) => {
        const searchable = [
          product.sku,
          product.name,
          product.brand,
          product.version,
          product.flavor,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 50);
  }, [products, search]);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  function selectProduct(product: Product) {
    onChange(String(product.id));
    setSearch("");
    setOpen(false);
  }

  function clearProduct() {
    onChange("");
    setSearch("");
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <label className="mb-2.5 block text-lg font-bold uppercase tracking-wider text-zinc-400">
        Product *
      </label>

      {!open ? (
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select a product"
          onClick={() => {
            setOpen(true);

            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          className="touch-feedback flex w-full min-h-[56px] items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 px-5 py-4 text-lg text-left outline-none transition hover:border-zinc-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 gpu"
        >
          {selectedProduct ? (
            <div className="min-w-0">
              <div className="truncate font-medium text-zinc-900">
                {selectedProduct.sku}
                {" — "}
                {selectedProduct.name}
              </div>

              {(selectedProduct.brand ||
                selectedProduct.version ||
                selectedProduct.flavor) && (
                  <div className="mt-0.5 truncate text-base text-zinc-500">
                    {[
                      selectedProduct.brand,
                      selectedProduct.version,
                      selectedProduct.flavor,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                )}
            </div>
          ) : (
            <span className="text-lg text-zinc-400">
              Search and select product...
            </span>
          )}

          <span className="ml-3 shrink-0 text-zinc-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
            }}
            placeholder="Search SKU or product name..."
            className="w-full min-h-[56px] rounded-xl border border-zinc-300 bg-zinc-50 px-5 py-4 pr-12 text-lg outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200 gpu"
            style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
            aria-label="Search products"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-700 active:scale-90 touch-feedback gpu tap-target"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {open && (
        <div
          className="absolute z-[100] mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl animate-slide-down gpu"
          role="listbox"
          aria-label="Product list"
        >
          <div className="max-h-[400px] overflow-y-auto momentum-scroll gpu-scroll">
            {selectedProduct && (
              <button
                type="button"
                onClick={clearProduct}
                className="touch-feedback w-full min-h-[52px] border-b border-zinc-100 px-5 py-4 text-left text-lg font-semibold text-zinc-500 hover:bg-zinc-50 active:bg-zinc-100 active:scale-[0.99] gpu tap-target"
                role="option"
                aria-label="Clear selected product"
              >
                Clear selected product
              </button>
            )}

            {filteredProducts.length === 0 ? (
              <div className="px-5 py-12 text-center text-lg text-zinc-500">
                No products found.
              </div>
            ) : (
              filteredProducts.map(
                (product) => {
                  const selected =
                    String(product.id) ===
                    value;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        selectProduct(
                          product,
                        )
                      }
                      role="option"
                      aria-selected={selected}
                      className={[
                        "touch-feedback w-full min-h-[72px] border-b border-zinc-100 px-5 py-5 text-left transition last:border-b-0 hover:bg-zinc-50 active:bg-zinc-100 gpu tap-target",
                        selected
                          ? "bg-zinc-50"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-medium text-zinc-900">
                            {product.sku}
                          </div>

                          <div className="truncate text-lg text-zinc-700">
                            {product.name}
                          </div>

                          {(product.brand ||
                            product.version ||
                            product.flavor) && (
                              <div className="mt-1 truncate text-base text-zinc-500">
                                {[
                                  product.brand,
                                  product.version,
                                  product.flavor,
                                ]
                                  .filter(
                                    Boolean,
                                  )
                                  .join(
                                    " • ",
                                  )}
                              </div>
                            )}
                        </div>

                        {selected && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                },
              )
            )}

            {filteredProducts.length ===
              50 && (
                <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3 text-center text-base text-zinc-500">
                  Showing first 50 results.
                  Keep typing to narrow your
                  search.
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
