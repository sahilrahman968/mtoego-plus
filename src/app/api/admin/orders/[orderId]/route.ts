import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import { restoreInventoryForOrder } from "@/lib/inventory";
import { notifyOrderDelivered, notifyOrderShipped } from "@/lib/order-emails";
import Order, { STATUS_TRANSITIONS, OrderStatus, ORDER_STATUSES } from "@/models/order.model";

// ─── GET /api/admin/orders/:orderId — Order detail (admin) ───────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requirePermission(request, "orders.view");
    if (auth.error) return auth.error;

    const { orderId } = await params;

    if (!isValidObjectId(orderId)) {
      return errorResponse("Invalid order ID", 400);
    }

    await connectDB();

    const order = await Order.findById(orderId)
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "items.product",
        select: "slug images",
      })
      .lean();

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    return successResponse(order, "Order retrieved");
  } catch (err) {
    console.error("GET /api/admin/orders/[orderId] error:", err);
    return errorResponse("Failed to retrieve order", 500);
  }
}

// ─── Tracking helpers ────────────────────────────────────────────────────────

type TrackingInput = { trackingNumber: string; trackingUrl: string };

function parseTracking(
  trackingNumber: unknown,
  trackingUrl: unknown
): { ok: true; value: TrackingInput } | { ok: false; message: string } {
  if (
    !trackingNumber ||
    typeof trackingNumber !== "string" ||
    trackingNumber.trim().length < 3
  ) {
    return {
      ok: false,
      message: "AWB / tracking number is required (min 3 characters)",
    };
  }
  if (!trackingUrl || typeof trackingUrl !== "string" || !trackingUrl.trim()) {
    return { ok: false, message: "Tracking URL is required" };
  }

  const url = trackingUrl.trim();
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, message: "Tracking URL must use http or https" };
    }
  } catch {
    return { ok: false, message: "Tracking URL must be a valid URL" };
  }

  return { ok: true, value: { trackingNumber: trackingNumber.trim(), trackingUrl: url } };
}

// ─── PATCH /api/admin/orders/:orderId — Update order status (admin) ──────────
// Enforces valid status transitions as defined in the Order model.
// Omitting `status` while sending tracking fields edits tracking details of an
// order that has already shipped.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requirePermission(request, "orders.update_status");
    if (auth.error) return auth.error;

    const { orderId } = await params;

    if (!isValidObjectId(orderId)) {
      return errorResponse("Invalid order ID", 400);
    }

    const body = await request.json();
    const { status, note, cancelReason, trackingNumber, trackingUrl } = body;

    const isTrackingOnlyUpdate = !status;

    if (!isTrackingOnlyUpdate && !ORDER_STATUSES.includes(status as OrderStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`,
        400
      );
    }

    await connectDB();

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // ── Tracking-only update (order already shipped) ──────────────────────
    if (isTrackingOnlyUpdate) {
      if (order.status !== "shipped" && order.status !== "delivered") {
        return errorResponse(
          `Tracking details can only be edited once an order is shipped (current status: "${order.status}")`,
          400
        );
      }

      const tracking = parseTracking(trackingNumber, trackingUrl);
      if (!tracking.ok) return errorResponse(tracking.message, 400);

      order.trackingNumber = tracking.value.trackingNumber;
      order.trackingUrl = tracking.value.trackingUrl;

      // Backfill the most recent "shipped" entry so the timeline stays accurate
      for (let i = order.statusHistory.length - 1; i >= 0; i--) {
        if (order.statusHistory[i].status === "shipped") {
          order.statusHistory[i].trackingNumber = tracking.value.trackingNumber;
          order.statusHistory[i].trackingUrl = tracking.value.trackingUrl;
          break;
        }
      }

      await order.save();

      const updatedOrder = await Order.findById(orderId)
        .populate({ path: "user", select: "name email" })
        .populate({ path: "items.product", select: "slug images" })
        .lean();

      return successResponse(updatedOrder, "Tracking details updated");
    }

    // ── Validate status transition ───────────────────────────────────────
    const allowedNext = STATUS_TRANSITIONS[order.status];
    if (!allowedNext.includes(status as OrderStatus)) {
      return errorResponse(
        `Cannot transition from "${order.status}" to "${status}". ` +
          `Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(", ") : "none"}`,
        400
      );
    }

    // ── Require tracking details when marking shipped ────────────────────
    let shippedTracking: TrackingInput | undefined;

    if (status === "shipped") {
      const tracking = parseTracking(trackingNumber, trackingUrl);
      if (!tracking.ok) {
        return errorResponse(
          `${tracking.message} when marking an order as shipped`,
          400
        );
      }

      shippedTracking = tracking.value;
      order.trackingNumber = shippedTracking.trackingNumber;
      order.trackingUrl = shippedTracking.trackingUrl;
    }

    // ── Handle cancellation ──────────────────────────────────────────────
    if (status === "cancelled") {
      if (!cancelReason || typeof cancelReason !== "string" || cancelReason.trim().length < 3) {
        return errorResponse("Cancel reason is required (min 3 characters)", 400);
      }
      order.cancelReason = cancelReason.trim();

      // Restore inventory if it was deducted
      if (order.inventoryDeducted) {
        try {
          await restoreInventoryForOrder(order);
        } catch (err) {
          console.error(
            `Inventory restoration failed for order ${order.orderNumber}:`,
            err
          );
        }
      }
    }

    // ── Handle refund status ─────────────────────────────────────────────
    if (status === "refunded" && order.inventoryDeducted) {
      try {
        await restoreInventoryForOrder(order);
      } catch (err) {
        console.error(
          `Inventory restoration failed for order ${order.orderNumber}:`,
          err
        );
      }
    }

    // ── Update status ────────────────────────────────────────────────────
    order.status = status as OrderStatus;
    order.statusHistory.push({
      status: status as OrderStatus,
      timestamp: new Date(),
      note: note?.trim() || `Status updated by ${auth.role} (${auth.email})`,
      ...(shippedTracking ?? {}),
    });

    await order.save();

    if (status === "shipped") {
      notifyOrderShipped(order);
    } else if (status === "delivered") {
      notifyOrderDelivered(order);
    }

    const updated = await Order.findById(orderId)
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "items.product",
        select: "slug images",
      })
      .lean();

    return successResponse(
      updated,
      `Order status updated to "${status}"`
    );
  } catch (err) {
    console.error("PATCH /api/admin/orders/[orderId] error:", err);
    return errorResponse("Failed to update order status", 500);
  }
}
