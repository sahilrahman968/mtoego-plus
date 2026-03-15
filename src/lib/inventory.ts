import mongoose from "mongoose";
import Product from "@/models/product.model";
import Order, { IOrderDocument } from "@/models/order.model";

// ─── Inventory Deduction ─────────────────────────────────────────────────────
// Atomically deduct stock for all items in an order. Uses MongoDB transactions
// to ensure all-or-nothing behaviour. Each variant's stock is decremented via
// `$inc` with a `stock >= quantity` guard so we never go negative.
//
// The order's `inventoryDeducted` flag is checked and set inside the
// transaction to prevent duplicate deductions (idempotency).

/**
 * Deduct inventory for a paid order. Returns `true` if deduction succeeded,
 * `false` if it was already deducted (idempotent).
 * Throws on stock-insufficient or other errors.
 */
export async function deductInventoryForOrder(
  orderId: string
): Promise<boolean> {
  const session = await mongoose.startSession();

  try {
    let deducted = false;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error(`Order ${orderId} not found`);

      // Idempotency — already deducted
      if (order.inventoryDeducted) {
        deducted = false;
        return;
      }

      // Deduct stock for each item
      for (const item of order.items) {
        const result = await Product.updateOne(
          {
            _id: item.product,
            "variants._id": item.variant,
            "variants.stock": { $gte: item.quantity },
          },
          {
            $inc: { "variants.$.stock": -item.quantity },
          },
          { session }
        );

        if (result.modifiedCount === 0) {
          throw new Error(
            `Insufficient stock for product ${item.title} (SKU: ${item.sku}). ` +
              `Required: ${item.quantity}`
          );
        }
      }

      // Mark inventory as deducted
      order.inventoryDeducted = true;
      await order.save({ session });

      deducted = true;
    });

    return deducted;
  } finally {
    await session.endSession();
  }
}

// ─── Inventory Restoration ───────────────────────────────────────────────────
// Restore stock when an order is cancelled or refunded.

/**
 * Restore inventory for a cancelled/refunded order. Returns `true` if
 * restoration succeeded, `false` if inventory was never deducted.
 */
export async function restoreInventoryForOrder(
  order: IOrderDocument
): Promise<boolean> {
  if (!order.inventoryDeducted) return false;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        await Product.updateOne(
          {
            _id: item.product,
            "variants._id": item.variant,
          },
          {
            $inc: { "variants.$.stock": item.quantity },
          },
          { session }
        );
      }

      order.inventoryDeducted = false;
      await order.save({ session });
    });

    return true;
  } finally {
    await session.endSession();
  }
}
