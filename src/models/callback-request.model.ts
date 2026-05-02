import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const CALLBACK_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;
export type CallbackRequestStatus = (typeof CALLBACK_REQUEST_STATUSES)[number];

export interface ICallbackRequestDocument extends Document {
  _id: Types.ObjectId;
  requirement: string;
  phone: string;
  contactHours: string;
  sourceUrl?: string;
  status: CallbackRequestStatus;
  adminNote?: string;
  contactedAt?: Date;
  handledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const callbackRequestSchema = new Schema<ICallbackRequestDocument>(
  {
    requirement: {
      type: String,
      required: [true, "Requirement is required"],
      trim: true,
      minlength: [8, "Requirement must be at least 8 characters"],
      maxlength: [1200, "Requirement must be at most 1200 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: [20, "Phone number must be at most 20 characters"],
    },
    contactHours: {
      type: String,
      required: [true, "Preferred contact hours are required"],
      trim: true,
      minlength: [3, "Preferred contact hours must be at least 3 characters"],
      maxlength: [80, "Preferred contact hours must be at most 80 characters"],
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: [300, "Source URL must be at most 300 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: CALLBACK_REQUEST_STATUSES,
      default: "new",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: [400, "Admin note must be at most 400 characters"],
      default: "",
    },
    contactedAt: {
      type: Date,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

callbackRequestSchema.index({ createdAt: -1 });
callbackRequestSchema.index({ phone: 1, createdAt: -1 });

const CallbackRequest: Model<ICallbackRequestDocument> =
  mongoose.models.CallbackRequest ??
  mongoose.model<ICallbackRequestDocument>("CallbackRequest", callbackRequestSchema);

export default CallbackRequest;
