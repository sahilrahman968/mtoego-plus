import mongoose, { Schema, Document, Model } from "mongoose";
import { Permission } from "@/lib/auth/permissions";

export interface IRoleDocument extends Document {
  slug: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRoleDocument>(
  {
    slug: {
      type: String,
      required: [true, "Role slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z][a-z0-9_]{1,31}$/,
        "Slug must be 2–32 chars: lowercase letters, numbers, underscores",
      ],
    },
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [200, "Description must be at most 200 characters"],
    },
    // Permission keys are validated at the API boundary with
    // sanitizePermissions(); keeping the catalog out of the schema avoids
    // stale-validator failures when the catalog changes.
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roleSchema.index({ isAdmin: 1 });

// Next.js hot reload keeps previously registered models, which would pin an
// outdated schema for the rest of the dev session.
if (process.env.NODE_ENV !== "production" && mongoose.models.Role) {
  mongoose.deleteModel("Role");
}

const Role: Model<IRoleDocument> =
  mongoose.models.Role ??
  mongoose.model<IRoleDocument>("Role", roleSchema);

export default Role;
