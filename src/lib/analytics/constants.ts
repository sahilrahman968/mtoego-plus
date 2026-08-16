import { OrderStatus } from "@/models/order.model";

/** Orders that count as revenue / successful payment */
export const PAID_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export const LOW_STOCK_THRESHOLD = 5;

/** Cart must be idle this many hours before counting as abandoned */
export const ABANDON_HOURS = 24;

/** Stuck fulfillment: paid/processing older than this many days */
export const STUCK_ORDER_DAYS = 3;

/** Dead stock: no sales in this many days */
export const DEAD_STOCK_DAYS = 60;

/** One-and-done: last order older than this many days */
export const ONE_AND_DONE_DAYS = 60;

/** Price drift threshold (fraction) between cart snapshot and current price */
export const PRICE_DRIFT_THRESHOLD = 0.05;

export const LIST_LIMIT = 10;
export const VIP_LIMIT = 20;
