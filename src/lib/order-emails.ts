import {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  type OrderEmailItem,
  type OrderEmailAddress,
} from "@/lib/email";
import Order, { type IOrderDocument } from "@/models/order.model";
import User from "@/models/user.model";

type EmailKind = "confirmation" | "shipped" | "delivered";

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function mapItems(order: IOrderDocument): OrderEmailItem[] {
  return order.items.map((item) => ({
    title: item.title,
    variantLabel: item.variantLabel,
    quantity: item.quantity,
    total: formatInr(item.total),
  }));
}

function mapAddress(order: IOrderDocument): OrderEmailAddress {
  const a = order.shippingAddress;
  return {
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
  };
}

async function claimEmailSlot(
  orderId: string,
  kind: EmailKind
): Promise<boolean> {
  const field = `emailsSent.${kind}`;
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, [field]: { $ne: true } },
    { $set: { [field]: true } },
    { new: false }
  );
  return Boolean(claimed);
}

async function releaseEmailSlot(orderId: string, kind: EmailKind) {
  await Order.updateOne(
    { _id: orderId },
    { $set: { [`emailsSent.${kind}`]: false } }
  );
}

async function resolveRecipient(userId: string): Promise<{
  email: string;
  name: string;
} | null> {
  const user = await User.findById(userId).select("name email").lean();
  if (!user?.email) return null;
  return { email: user.email, name: user.name || "there" };
}

/** Fire-and-forget order confirmation after payment success. Safe to call from verify + webhook. */
export function notifyOrderPaid(order: IOrderDocument) {
  void sendOrderPaidEmail(order).catch((err) => {
    console.error(
      `Order confirmation email failed for ${order.orderNumber}:`,
      err
    );
  });
}

async function sendOrderPaidEmail(order: IOrderDocument) {
  const orderId = order._id.toString();
  const claimed = await claimEmailSlot(orderId, "confirmation");
  if (!claimed) return;

  const recipient = await resolveRecipient(order.user.toString());
  if (!recipient) {
    console.warn(
      `No customer email for order ${order.orderNumber} — skipping confirmation email`
    );
    return;
  }

  try {
    await sendOrderConfirmationEmail(recipient.email, {
      name: recipient.name,
      orderNumber: order.orderNumber,
      items: mapItems(order),
      grandTotal: formatInr(order.pricing.grandTotal),
      shippingAddress: mapAddress(order),
      orderId: orderId,
    });
  } catch (err) {
    await releaseEmailSlot(orderId, "confirmation");
    throw err;
  }
}

/** Fire-and-forget shipped notification. Call only when status transitions to shipped. */
export function notifyOrderShipped(order: IOrderDocument) {
  void sendOrderShippedEmailSafe(order).catch((err) => {
    console.error(
      `Order shipped email failed for ${order.orderNumber}:`,
      err
    );
  });
}

async function sendOrderShippedEmailSafe(order: IOrderDocument) {
  const orderId = order._id.toString();
  const claimed = await claimEmailSlot(orderId, "shipped");
  if (!claimed) return;

  const recipient = await resolveRecipient(order.user.toString());
  if (!recipient) {
    console.warn(
      `No customer email for order ${order.orderNumber} — skipping shipped email`
    );
    return;
  }

  if (!order.trackingNumber || !order.trackingUrl) {
    console.warn(
      `Missing tracking for order ${order.orderNumber} — skipping shipped email`
    );
    await releaseEmailSlot(orderId, "shipped");
    return;
  }

  try {
    await sendOrderShippedEmail(recipient.email, {
      name: recipient.name,
      orderNumber: order.orderNumber,
      items: mapItems(order),
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      orderId,
    });
  } catch (err) {
    await releaseEmailSlot(orderId, "shipped");
    throw err;
  }
}

/** Fire-and-forget delivered notification. Call only when status transitions to delivered. */
export function notifyOrderDelivered(order: IOrderDocument) {
  void sendOrderDeliveredEmailSafe(order).catch((err) => {
    console.error(
      `Order delivered email failed for ${order.orderNumber}:`,
      err
    );
  });
}

async function sendOrderDeliveredEmailSafe(order: IOrderDocument) {
  const orderId = order._id.toString();
  const claimed = await claimEmailSlot(orderId, "delivered");
  if (!claimed) return;

  const recipient = await resolveRecipient(order.user.toString());
  if (!recipient) {
    console.warn(
      `No customer email for order ${order.orderNumber} — skipping delivered email`
    );
    return;
  }

  try {
    await sendOrderDeliveredEmail(recipient.email, {
      name: recipient.name,
      orderNumber: order.orderNumber,
      items: mapItems(order),
      orderId,
    });
  } catch (err) {
    await releaseEmailSlot(orderId, "delivered");
    throw err;
  }
}
