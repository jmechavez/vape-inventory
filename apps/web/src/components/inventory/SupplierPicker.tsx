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
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
        Supplier
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-left text-sm outline-none transition hover:border-zinc-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={
            selectedSupplier
              ? "text-zinc-900"
              : "text-zinc-400"
          }
        >
          {selectedSupplier
            ? selectedSupplier.name
            : "Select supplier"}
        </span>

        <span
          className={[
            "shrink-0 text-zinc-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
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
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 p-2">
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search supplier..."
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={clearSupplier}
                className="w-full border-b border-zinc-100 px-3 py-2 text-left text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
              >
                Clear supplier
              </button>
            )}

            {filteredSuppliers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">
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
                      className={[
                        "w-full border-b border-zinc-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-zinc-50",
                        selected ? "bg-zinc-50" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-zinc-900">
                            {supplier.name}
                          </div>

                          {supplier.contact_person && (
                            <div className="mt-0.5 truncate text-xs text-zinc-500">
                              {supplier.contact_person}
                            </div>
                          )}

                          {(supplier.phone ||
                            supplier.email) && (
                              <div className="mt-0.5 truncate text-xs text-zinc-400">
                                {supplier.phone ??
                                  supplier.email}
                              </div>
                            )}
                        </div>

                        {selected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
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

