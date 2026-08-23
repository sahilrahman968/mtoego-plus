"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { ButtonLink } from "../components/Button";

interface Order {
  _id: string;
  orderNumber: string;
  user?: { _id: string; name: string; email: string };
  status: string;
  pricing: { grandTotal: number };
  items: { quantity: number }[];
  payment?: { razorpayPaymentId?: string; paidAt?: string };
  createdAt: string;
}

interface PaginatedResponse {
  items: Order[];
  total: number;
  page: number;
  totalPages: number;
}

const PAGE_SIZE = 15;

const statusFilters = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

type Tone = "success" | "warning" | "danger" | "info" | "inert";

const toneClass: Record<Tone, string> = {
  success: "bg-admin-success-soft text-admin-success ring-admin-success-line",
  warning: "bg-admin-warning-soft text-admin-warning ring-admin-warning-line",
  danger: "bg-admin-danger-soft text-admin-danger ring-admin-danger-line",
  info: "bg-admin-info-soft text-admin-info ring-admin-info-line",
  inert: "bg-admin-subtle text-admin-faint ring-admin-line",
};

function Chip({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function paymentChip(order: Order): { tone: Tone; label: string } {
  if (order.status === "refunded") return { tone: "danger", label: "Refunded" };
  const captured =
    Boolean(order.payment?.paidAt) ||
    Boolean(order.payment?.razorpayPaymentId) ||
    ["paid", "processing", "shipped", "delivered"].includes(order.status);
  if (captured) return { tone: "success", label: "Paid" };
  return { tone: "warning", label: "Unpaid" };
}

function fulfillmentChip(order: Order): { tone: Tone; label: string } {
  switch (order.status) {
    case "processing":
      return { tone: "info", label: "Preparing" };
    case "shipped":
      return { tone: "info", label: "In transit" };
    case "delivered":
      return { tone: "success", label: "Delivered" };
    case "cancelled":
    case "refunded":
      return { tone: "inert", label: "Not fulfilled" };
    default:
      return { tone: "inert", label: "Unfulfilled" };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseUser(value: unknown): Order["user"] {
  if (!isRecord(value)) return undefined;
  const id = asString(value._id);
  if (!id) return undefined;
  return {
    _id: id,
    name: asString(value.name, "N/A"),
    email: asString(value.email),
  };
}

function parseOrder(raw: unknown): Order | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw._id);
  const orderNumber = asString(raw.orderNumber);
  if (!id || !orderNumber) return null;

  const pricing = isRecord(raw.pricing) ? raw.pricing : {};
  const payment = isRecord(raw.payment) ? raw.payment : {};
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        quantity: isRecord(item) ? asNumber(item.quantity, 0) : 0,
      }))
    : [];

  return {
    _id: id,
    orderNumber,
    user: parseUser(raw.user),
    status: asString(raw.status, "pending"),
    pricing: { grandTotal: asNumber(pricing.grandTotal) },
    items,
    payment: {
      razorpayPaymentId: asString(payment.razorpayPaymentId) || undefined,
      paidAt: asString(payment.paidAt) || undefined,
    },
    createdAt: asString(raw.createdAt),
  };
}

function parsePage(raw: unknown): PaginatedResponse | null {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .map(parseOrder)
    .filter((order): order is Order => Boolean(order));
  return {
    items,
    total: asNumber(raw.total, items.length),
    page: Math.max(1, asNumber(raw.page, 1)),
    totalPages: Math.max(1, asNumber(raw.totalPages, 1)),
  };
}

export default function OrdersPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      const parsed = json.success ? parsePage(json.data) : null;
      if (parsed) {
        setData(parsed);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalItems = (items: { quantity: number }[]) =>
    items.reduce((sum, item) => sum + item.quantity, 0);

  const isFiltered = Boolean(search || status);
  const rangeStart = data && data.total > 0 ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader title="Orders" description="View and manage customer orders" />

      <SearchFilterBar
        id="order-search"
        value={searchInput}
        label="Search orders"
        placeholder="Search by order number…"
        onChange={setSearchInput}
      >
        <FilterSelect
          id="order-status-filter"
          label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {statusFilters.map((filter) => (
            <option key={filter.value || "all"} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </FilterSelect>
      </SearchFilterBar>

      {loadError ? (
        <AdminErrorState
          title="Unable to load orders"
          message="The order list could not be fetched. Check your connection and try again."
          onRetry={fetchOrders}
        />
      ) : (
        <>
          {data && data.total > 0 && (
            <p className="mb-2 text-xs text-admin-muted tabular" aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {data.total} order
              {data.total === 1 ? "" : "s"}
            </p>
          )}

          <DataTableShell
            label="Orders"
            footer={
              data && data.totalPages > 1 ? (
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {loading ? (
              <AdminTableSkeleton rows={PAGE_SIZE} columns={6} />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching orders" : "No orders yet"}
                description={
                  isFiltered
                    ? "No order matches the current search and status filter. Try widening them."
                    : "Orders will appear here once customers start purchasing."
                }
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/60">
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">
                      Order
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell"
                    >
                      Customer
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-right text-xs font-medium text-admin-muted sm:table-cell"
                    >
                      Items
                    </th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((order) => {
                    const payment = paymentChip(order);
                    const fulfillment = fulfillmentChip(order);
                    const placed = order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";
                    return (
                      <tr key={order._id} className="transition-colors hover:bg-admin-hover">
                        <td className="px-4 py-2">
                          <p className="font-medium text-admin-heading">{order.orderNumber}</p>
                          <p className="text-xs text-admin-faint">{placed}</p>
                          <p className="mt-0.5 truncate text-xs text-admin-muted md:hidden">
                            {order.user?.name || "N/A"}
                          </p>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          <div className="min-w-0">
                            <p className="truncate text-admin-body">{order.user?.name || "N/A"}</p>
                            <p className="truncate text-xs text-admin-faint">{order.user?.email || ""}</p>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2 text-right tabular text-admin-muted sm:table-cell">
                          {totalItems(order.items)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-admin-heading price">
                          ₹{order.pricing.grandTotal.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={order.status} />
                            <Chip tone={payment.tone}>{payment.label}</Chip>
                            <Chip tone={fulfillment.tone}>{fulfillment.label}</Chip>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <ButtonLink
                              href={`/admin/orders/${order._id}`}
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              aria-label={`View order ${order.orderNumber}`}
                              icon={<Eye aria-hidden="true" className="size-4" />}
                            >
                              <span className="hidden lg:inline">View</span>
                            </ButtonLink>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTableShell>
        </>
      )}
    </div>
  );
}
