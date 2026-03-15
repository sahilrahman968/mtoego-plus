import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import { restoreInventoryForOrder } from "@/lib/inventory";
import Order, { STATUS_TRANSITIONS, OrderStatus, ORDER_STATUSES } from "@/models/order.model";

// ─── GET /api/admin/orders/:orderId — Order detail (admin) ───────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
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

// ─── PATCH /api/admin/orders/:orderId — Update order status (admin) ──────────
// Enforces valid status transitions as defined in the Order model.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { orderId } = await params;

    if (!isValidObjectId(orderId)) {
      return errorResponse("Invalid order ID", 400);
    }

    const body = await request.json();
    const { status, note, cancelReason } = body;

    if (!status || !ORDER_STATUSES.includes(status as OrderStatus)) {
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

    // ── Validate status transition ───────────────────────────────────────
    const allowedNext = STATUS_TRANSITIONS[order.status];
    if (!allowedNext.includes(status as OrderStatus)) {
      return errorResponse(
        `Cannot transition from "${order.status}" to "${status}". ` +
          `Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(", ") : "none"}`,
        400
      );
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
    });

    await order.save();

    return successResponse(
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
      },
      `Order status updated to "${status}"`
    );
  } catch (err) {
    console.error("PATCH /api/admin/orders/[orderId] error:", err);
    return errorResponse("Failed to update order status", 500);
  }
}
