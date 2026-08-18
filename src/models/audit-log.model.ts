import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface IAuditLogDocument extends Document {
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  method: AuditMethod;
  path: string;
  resource: string;
  resourceId?: string | null;
  statusCode: number;
  success: boolean;
  message: string;
  summary?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorUserId: {
      type: String,
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      default: "",
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["POST", "PUT", "PATCH", "DELETE"],
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: 500,
    },
    summary: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 400,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.AuditLog) {
  mongoose.deleteModel("AuditLog");
}

const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLogDocument>("AuditLog", auditLogSchema);

export default AuditLog;
