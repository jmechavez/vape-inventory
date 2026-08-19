import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Supplier = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type SupplierForm = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
};

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm: SupplierForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

export default function SuppliersPage() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [deletingSupplier, setDeletingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] =
    useState<SupplierForm>(emptyForm);

  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");

  async function loadSuppliers() {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch(
        `${API_URL}/api/suppliers`,
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data: Supplier[] =
        await response.json();

      setSuppliers(data);
    } catch (error) {
      console.error(
        "Suppliers error:",
        error,
      );

      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load suppliers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function updateField(
    field: keyof SupplierForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openAddForm() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  }

  function startEditing(
    supplier: Supplier,
  ) {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      contact_person:
        supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingSupplier(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function saveSupplier() {
    const name = form.name.trim();

    if (!name) {
      setFormError(
        "Supplier name is required.",
      );

      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name,
      contact_person:
        form.contact_person.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };

    try {
      const isEditing =
        editingSupplier !== null;

      const url = isEditing
        ? `${API_URL}/api/suppliers/${editingSupplier.id}`
        : `${API_URL}/api/suppliers`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await response.text(),
        );
      }

      await loadSuppliers();

      closeForm();
    } catch (error) {
      console.error(
        "Save supplier error:",
        error,
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to save supplier.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier() {
    if (!deletingSupplier) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/suppliers/${deletingSupplier.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          await response.text(),
        );
      }

      setDeletingSupplier(null);

      await loadSuppliers();
    } catch (error) {
      console.error(
        "Delete supplier error:",
        error,
      );

      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to delete supplier.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredSuppliers =
    suppliers.filter((supplier) => {
      const query = search
        .toLowerCase()
        .trim();

      if (!query) {
        return true;
      }

      return (
        supplier.name
          .toLowerCase()
          .includes(query) ||
        supplier.contact_person
          ?.toLowerCase()
          .includes(query) ||
        supplier.phone
          ?.toLowerCase()
          .includes(query) ||
        supplier.email
          ?.toLowerCase()
          .includes(query) ||
        supplier.address
          ?.toLowerCase()
          .includes(query)
      );
    });

  return (
    <div className="h-full flex flex-col">
      {/* Header - Keep as is */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Management
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
            Suppliers
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage your suppliers and
            contact information.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Back to Inventory */}
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 tap-target"
          >
            ← Back to Inventory
          </button>

          {/* Add Supplier */}
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-[44px] items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-zinc-800 tap-target"
          >
            + Add Supplier
          </button>
        </div>
      </header>

      {/* Error */}
      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-3 shrink-0">
          <p className="text-base font-semibold text-red-700">
            {pageError}
          </p>
        </div>
      )}

      {/* Search / Summary - Extra Large */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm mb-4 shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
              Supplier Directory
            </p>

            <p className="mt-1 text-xl font-black">
              {filteredSuppliers.length}{" "}
              <span className="font-normal text-zinc-400">
                of {suppliers.length}{" "}
                suppliers
              </span>
            </p>
          </div>

          <div className="w-full sm:max-w-md">
            <input
              type="search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm flex items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-zinc-300"
              style={{ borderTopColor: "var(--accent)" }}
            />
            <p className="text-base font-medium text-zinc-500">
              Loading suppliers...
            </p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        filteredSuppliers.length === 0 && (
          <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
                <path
                  d="M3 16V6a1 1 0 011-1h9v11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 9h4l3 3v4h-7V9z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.5" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>

            <h2 className="mt-5 text-2xl font-black text-zinc-950">
              {search
                ? "No suppliers found"
                : "No suppliers yet"}
            </h2>

            <p className="mt-2 text-base text-zinc-500">
              {search
                ? "Try a different search."
                : "Add your first supplier to get started."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-5 rounded-xl bg-black px-6 py-3 text-base font-bold text-white transition hover:bg-zinc-800 tap-target"
              >
                + Add Supplier
              </button>
            )}
          </div>
        )}

      {/* Suppliers Table - Extra Large */}
      {!loading &&
        filteredSuppliers.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-zinc-200 bg-zinc-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Supplier
                      </th>
                      <th className="px-5 py-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Contact
                      </th>
                      <th className="px-5 py-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Phone
                      </th>
                      <th className="px-5 py-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Email
                      </th>
                      <th className="px-5 py-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Address
                      </th>
                      <th className="px-5 py-4 text-right text-sm font-bold uppercase tracking-wider text-zinc-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSuppliers.map(
                      (supplier) => (
                        <tr
                          key={supplier.id}
                          className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                        >
                          <td className="px-5 py-5">
                            <div>
                              <p className="text-lg font-black text-zinc-950">
                                {supplier.name}
                              </p>
                              <p className="mt-1 text-sm text-zinc-400">
                                ID #{supplier.id}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            {supplier.contact_person ? (
                              <span className="text-base font-medium text-zinc-900">
                                {supplier.contact_person}
                              </span>
                            ) : (
                              <span className="text-base text-zinc-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5 font-mono text-base text-zinc-700">
                            {supplier.phone || "—"}
                          </td>

                          <td className="px-5 py-5">
                            {supplier.email ? (
                              <span className="text-base text-zinc-700">
                                {supplier.email}
                              </span>
                            ) : (
                              <span className="text-base text-zinc-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="max-w-[220px] px-5 py-5">
                            <span className="block truncate text-base text-zinc-700">
                              {supplier.address || "—"}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  startEditing(
                                    supplier,
                                  )
                                }
                                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 tap-target"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeletingSupplier(
                                    supplier,
                                  )
                                }
                                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 tap-target"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Add / Edit Modal - Extra Large */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-zinc-200 p-6 shrink-0">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                Supplier
              </p>

              <h2 className="mt-1 text-xl font-black text-zinc-950">
                {editingSupplier
                  ? "Edit Supplier"
                  : "Add Supplier"}
              </h2>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-base font-medium text-red-700">
                    {formError}
                  </p>
                </div>
              )}

              {/* Supplier Name */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Supplier Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. ABC Distribution"
                  autoFocus
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Contact Person
                </label>

                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(event) =>
                    updateField(
                      "contact_person",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Juan Dela Cruz"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="09XXXXXXXXX"
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="supplier@example.com"
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                  placeholder="Supplier address"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:justify-end shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 tap-target"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveSupplier}
                className="inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 tap-target"
              >
                {saving
                  ? "Saving..."
                  : editingSupplier
                    ? "Save Changes"
                    : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation - Extra Large */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
              Delete Supplier
            </p>

            <h2 className="mt-2 text-xl font-black text-zinc-950">
              Delete {deletingSupplier.name}?
            </h2>

            <p className="mt-2 text-base leading-6 text-zinc-500">
              This will permanently remove
              this supplier. This action
              cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  setDeletingSupplier(null)
                }
                className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 tap-target"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={deleteSupplier}
                className="inline-flex h-[52px] items-center justify-center rounded-xl bg-red-600 px-6 text-base font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 tap-target"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
