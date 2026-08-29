import { useEffect, useMemo, useRef, useState } from "react";

type Supplier = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
};

type SupplierPickerProps = {
  suppliers: Supplier[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function SupplierPicker({
  suppliers,
  value,
  onChange,
  disabled = false,
}: SupplierPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = suppliers.find(
    (supplier) => String(supplier.id) === value,
  );

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(query) ||
        supplier.contact_person
          ?.toLowerCase()
          .includes(query) ||
        supplier.phone
          ?.toLowerCase()
          .includes(query) ||
        supplier.email
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [suppliers, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  function selectSupplier(
    supplier: Supplier,
  ) {
    onChange(String(supplier.id));
    setSearch("");
    setOpen(false);
  }

  function clearSupplier() {
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
        Supplier
      </label>

      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select a supplier"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
            setTimeout(() => {
              inputRef.current?.focus();
            }, 50);
          }
        }}
        className="touch-feedback flex w-full min-h-[56px] items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 px-5 py-4 text-lg text-left outline-none transition hover:border-zinc-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 gpu"
      >
        <span
          className={
            selectedSupplier
              ? "text-lg text-zinc-900"
              : "text-lg text-zinc-400"
          }
        >
          {selectedSupplier
            ? selectedSupplier.name
            : "Select supplier"}
        </span>

        <span
          className={[
            "shrink-0 text-zinc-400 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
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

      {open && (
        <div
          className="absolute z-[100] mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl animate-slide-down gpu"
          role="listbox"
          aria-label="Supplier list"
        >
          <div className="border-b border-zinc-100 p-3">
            <input
              ref={inputRef}
              type="search"
              autoFocus
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
              placeholder="Search supplier..."
              className="w-full min-h-[48px] rounded-xl border border-zinc-300 bg-zinc-50 px-5 py-3.5 text-lg outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200 gpu"
              style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
              aria-label="Search suppliers"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto momentum-scroll gpu-scroll">
            {value && (
              <button
                type="button"
                onClick={clearSupplier}
                className="touch-feedback w-full min-h-[52px] border-b border-zinc-100 px-5 py-4 text-left text-lg font-semibold text-zinc-500 hover:bg-zinc-50 active:bg-zinc-100 active:scale-[0.99] gpu tap-target"
                role="option"
                aria-label="Clear selected supplier"
              >
                Clear supplier
              </button>
            )}

            {filteredSuppliers.length === 0 ? (
              <div className="px-5 py-12 text-center text-lg text-zinc-500">
                No suppliers found.
              </div>
            ) : (
              filteredSuppliers.map(
                (supplier) => {
                  const selected =
                    String(supplier.id) === value;

                  return (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() =>
                        selectSupplier(
                          supplier,
                        )
                      }
                      role="option"
                      aria-selected={selected}
                      className={[
                        "touch-feedback w-full min-h-[72px] border-b border-zinc-100 px-5 py-5 text-left transition last:border-b-0 hover:bg-zinc-50 active:bg-zinc-100 gpu tap-target",
                        selected ? "bg-zinc-50" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-medium text-zinc-900">
                            {supplier.name}
                          </div>

                          {supplier.contact_person && (
                            <div className="mt-0.5 truncate text-base text-zinc-500">
                              {supplier.contact_person}
                            </div>
                          )}

                          {(supplier.phone ||
                            supplier.email) && (
                              <div className="mt-0.5 truncate text-base text-zinc-400">
                                {supplier.phone ??
                                  supplier.email}
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
          </div>
        </div>
      )}
    </div>
  );
}
