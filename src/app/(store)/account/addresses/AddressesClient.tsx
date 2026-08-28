"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import AddressForm from "@/components/store/AddressForm";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/lib/store-api";
import type { AddressInput, SavedAddress } from "@/types";
import { emptyAddressInput } from "@/lib/addresses/format-address";
import { validateAddressFields } from "@/lib/addresses/validate-address";
import { formatAddressLines } from "@/lib/addresses/format-address";
import { getCountryName } from "@/lib/addresses/country-config";

export default function AddressesClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressInput>(emptyAddressInput());

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    const res = await fetchAddresses();
    if (res.success && res.data) {
      setAddresses(res.data.addresses);
    } else if (res.message) {
      toast(res.message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadAddresses();
  }, [authLoading, isAuthenticated, loadAddresses]);

  const resetForm = () => {
    setForm(emptyAddressInput());
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyAddressInput());
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (address: SavedAddress) => {
    setForm({
      label: address.label,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    });
    setEditingId(address._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const validation = validateAddressFields(
      form as unknown as Record<string, unknown>,
      { requireLabel: true }
    );
    if (!validation.valid) {
      toast(validation.errors[0] || "Invalid address", "error");
      return;
    }

    setSaving(true);
    const res = editingId
      ? await updateAddress(editingId, form)
      : await createAddress(form);
    setSaving(false);

    if (res.success) {
      toast(editingId ? "Address updated" : "Address saved", "success");
      resetForm();
      await loadAddresses();
    } else {
      toast(res.message || "Could not save address", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteAddress(id);
    if (res.success) {
      toast("Address deleted", "success");
      if (editingId === id) resetForm();
      await loadAddresses();
    } else {
      toast(res.message || "Could not delete address", "error");
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await setDefaultAddress(id);
    if (res.success) {
      toast("Default address updated", "success");
      await loadAddresses();
    } else {
      toast(res.message || "Could not update default address", "error");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <MapPin size={40} className="mx-auto text-primary" />
        <h1 className="section-title mt-4 text-2xl text-foreground">Saved Addresses</h1>
        <p className="mt-2 text-muted">Sign in to manage your shipping addresses.</p>
        <Link
          href="/login?redirect=/account/addresses"
          className="btn-text mt-6 inline-flex bg-primary px-6 py-3 text-white hover:bg-primary-dark"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="section-title text-2xl text-foreground">Saved Addresses</h1>
          <p className="mt-1 text-sm text-muted">
            Manage addresses for India, US, UK, and UAE.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="btn-text inline-flex shrink-0 items-center gap-2 border border-border bg-black/40 px-4 py-2.5 text-sm text-foreground hover:border-primary"
          >
            <Plus size={16} />
            Add address
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 border border-border bg-card/80 p-4 sm:p-6">
          <h2 className="section-title mb-4 text-lg text-foreground">
            {editingId ? "Edit address" : "New address"}
          </h2>
          <AddressForm value={form} onChange={setForm} showLabel />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-text inline-flex items-center gap-2 bg-primary px-5 py-3 text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editingId ? "Update address" : "Save address"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn-text border border-border px-5 py-3 text-foreground hover:border-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-muted">No saved addresses yet.</p>
          <button
            type="button"
            onClick={startCreate}
            className="btn-text mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Plus size={16} />
            Add your first address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address._id}
              className="border border-border bg-card/75 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{address.label}</h3>
                    {address.isDefault && (
                      <span className="eyebrow-xs text-primary">Default</span>
                    )}
                    <span className="eyebrow-xs text-muted">
                      {getCountryName(address.country)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-muted">
                    {formatAddressLines(address, { includePhone: true }).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(address._id)}
                      className="p-2 text-muted transition-colors hover:text-primary"
                      aria-label="Set as default"
                      title="Set as default"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(address)}
                    className="p-2 text-muted transition-colors hover:text-foreground"
                    aria-label="Edit address"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(address._id)}
                    className="p-2 text-muted transition-colors hover:text-danger"
                    aria-label="Delete address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
